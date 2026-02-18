import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"
import * as djwt from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // รับ anonymousUid เพิ่มเข้ามา
    const { idToken, anonymousUid } = await req.json()
    if (!anonymousUid) {
      return new Response(
        JSON.stringify({ error: 'anonymousUid is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!
    const JWT_SECRET = Deno.env.get('CUSTOM_JWT_SECRET')!

    // 1. Verify LINE Token
    const params = new URLSearchParams({ id_token: idToken, client_id: LINE_CHANNEL_ID })
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
    if (!verifyRes.ok) throw new Error('Invalid LINE Token')
    const verifiedData = await verifyRes.json()
    const lineUserId = verifiedData.sub // LINE User ID

    // 2. Supabase Client (Service Role)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // ตรวจสอบในตาราง profiles (จุดตัดสินใจ 2FA)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, line_user_id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (profile) {
      // 🛡️ LINE นี้เคยผูกกับ UID อื่นแล้ว -> Reject
      if (profile.id !== anonymousUid) {
        return new Response(
          JSON.stringify({ error: "Device Mismatch: This LINE account is bound to another device." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
      // ✅ เคยผูกกับเครื่องนี้แล้ว -> อัปเดต role ให้เป็น visitor เสมอ
      await supabase
        .from('profiles')
        .update({ role: 'visitor' })
        .eq('id', anonymousUid)
    } else {
      // 🔗 ยังไม่เคยผูก -> Bind LINE เข้ากับ Anonymous UID ปัจจุบัน และตั้ง role = visitor
      await supabase
        .from('profiles')
        .update({
          line_user_id: lineUserId,
          role: 'visitor'
        })
        .eq('id', anonymousUid)
    }

    // 🛡️ อัปเดต Auth ให้เลิกเป็น Anonymous และกลายเป็น Permanent User
    await supabase.auth.admin.updateUserById(anonymousUid, {
      email: `${lineUserId}@line.placeholder.com`,
      password: crypto.randomUUID(), // ✅ รหัสผ่านสุ่มให้เป็น Email User เต็มตัว
      email_confirm: true,
      user_metadata: { 
        full_name: verifiedData.name, 
        picture_url: verifiedData.picture,
        is_line_linked: true 
      }
    })

    // 3. สร้าง Custom JWT โดยใช้ anonymousUid เดิม (UID เครื่อง)
    const payload: djwt.Payload = {
      aud: "authenticated",
      role: "authenticated",
      sub: anonymousUid,
      email: `${lineUserId}@line.placeholder.com`,
      exp: djwt.getNumericDate(60 * 60 * 24 * 7) // 7 วัน
    }

    const keyData = new TextEncoder().encode(JWT_SECRET)
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )

    const jwt = await djwt.create({ alg: "HS256", typ: "JWT" }, payload, cryptoKey)

    return new Response(
      JSON.stringify({ session: { access_token: jwt, user: { id: anonymousUid } } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})