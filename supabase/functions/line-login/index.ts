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
    const { idToken } = await req.json()
    const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!
    const JWT_SECRET = Deno.env.get('CUSTOM_JWT_SECRET')!

    const params = new URLSearchParams({ id_token: idToken, client_id: LINE_CHANNEL_ID })
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
    if (!verifyRes.ok) throw new Error('Invalid LINE Token')
    const lineUser = await verifyRes.json()

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const lineId = lineUser.sub
    const email = (lineUser.email || `${lineId}@line.placeholder.com`).toLowerCase()

    // 🔍 1. ค้นหาในตาราง profiles ก่อนว่ามี line_user_id นี้ไหม
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('line_user_id', lineId)
      .single()

    let targetUserId: string;

    if (existingProfile) {
      // ✅ พบ Profile เดิม: พยายามใช้ ID เดิม (b117...)
      targetUserId = existingProfile.id
      console.log('🔗 Linking to existing profile ID:', targetUserId)

      // เช็คว่าใน Auth มี ID นี้หรือยัง? ถ้าไม่มีให้สร้าง
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
      
      if (!authUser.user) {
        await supabaseAdmin.auth.admin.createUser({
          id: targetUserId, // บังคับใช้ ID ให้ตรงกับ Profiles
          email: email,
          email_confirm: true,
          user_metadata: { full_name: lineUser.name, picture_url: lineUser.picture, provider: 'line' }
        })
      }
    } else {
      // ✨ ไม่พบ Profile: สร้างใหม่ตามปกติ
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { full_name: lineUser.name, picture_url: lineUser.picture, provider: 'line' }
      })
      
      if (createError) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const found = list.users.find(u => u.email?.toLowerCase() === email)
        targetUserId = found?.id || ''
      } else {
        targetUserId = newUser.user!.id
      }
    }

    // 2. สร้าง Token (ใช้ targetUserId ที่เชื่อมโยงแล้ว)
    const payload = {
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
      sub: targetUserId,
      email: email,
      role: "authenticated",
      app_metadata: { provider: "email" },
      user_metadata: { full_name: lineUser.name, picture_url: lineUser.picture }
    }

    const keyData = new TextEncoder().encode(JWT_SECRET)
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    const accessToken = await djwt.create({ alg: "HS256", typ: "JWT" }, payload, cryptoKey)

    return new Response(
      JSON.stringify({
        session: { access_token: accessToken, user: { id: targetUserId, email: email } }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})