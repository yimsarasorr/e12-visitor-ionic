import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// ✅ เปลี่ยน Import เป็นตัวนี้ครับ (เสถียรกว่าใน Deno)
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

    // 2. จัดการเรื่อง Device Binding (ยึดตาม UID เดิม)
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

    // อัปเดตข้อมูล Profile
    await supabase.from('profiles').update({ 
      line_user_id: lineUserId, 
      role: 'visitor' 
    }).eq('id', anonymousUid)

    // 3. 🛡️ หัวใจสำคัญ: สร้าง "Session ของจริง" จาก Supabase Auth
    // ถ้าฟังก์ชันนี้ไม่มี ให้ใช้ admin.getUserById เช็คก่อนว่า client ต่อติดไหม
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSessionForUser({
      userId: anonymousUid
    })

    if (sessionError) throw sessionError;

    // อัปเดต Auth ให้เลิกเป็น Anonymous (ใส่ Email/Metadata)
    await supabase.auth.admin.updateUserById(anonymousUid, {
      email: `${lineUserId}@line.placeholder.com`,
      email_confirm: true,
      user_metadata: { 
        full_name: verifiedData.name, 
        picture_url: verifiedData.picture 
      }
    })

    // ✅ คืนค่า Session จริงที่ Server ออกให้ (Refresh ยังไงก็ไม่หลุด)
    return new Response(
      JSON.stringify({ session: sessionData.session }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})