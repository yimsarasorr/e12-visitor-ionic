import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { idToken, anonymousUid } = await req.json()
    
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!

    // 1. Verify LINE Token
    const params = new URLSearchParams({ id_token: idToken, client_id: LINE_CHANNEL_ID })
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
    if (!verifyRes.ok) throw new Error('Invalid LINE Token')
    const verifiedData = await verifyRes.json()
    const lineUserId = verifiedData.sub

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 2. เช็คการผูก Device (Binding)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, line_user_id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (profile && profile.id !== anonymousUid) {
       return new Response(
         JSON.stringify({ error: "Device Mismatch: LINE นี้ผูกกับเครื่องอื่นอยู่" }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
       )
    }

    // อัปเดต Profile
    await supabase.from('profiles').update({ 
      line_user_id: lineUserId, 
      role: 'visitor' 
    }).eq('id', anonymousUid)

    // ==========================================
    // 🛡️ THE FIX: ใช้เทคนิค Password Exchange
    // ==========================================
    const targetEmail = `${lineUserId}@line.placeholder.com`
    const tempPassword = crypto.randomUUID() // สุ่มรหัสผ่าน

    // 3. ยัด Email และ รหัสผ่านสุ่ม เข้าไปใน User ด้วย Admin API
    await supabase.auth.admin.updateUserById(anonymousUid, {
      email: targetEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        full_name: verifiedData.name, 
        picture_url: verifiedData.picture 
      }
    })

    // 4. สั่ง Login ด้วยรหัสผ่านสุ่มที่เพิ่งตั้ง เพื่อขอ Session ของแท้!
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: tempPassword
    })

    if (authError) throw authError;

    // 5. ส่ง Session ของแท้กลับไปให้หน้าบ้าน (Refresh ยังไงก็ไม่หลุด)
    return new Response(
      JSON.stringify({ session: authData.session }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})