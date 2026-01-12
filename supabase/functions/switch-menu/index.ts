// supabase/functions/switch-menu/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS (เพื่อให้เรียกจากหน้าเว็บ Ionic ได้)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. รับค่าจาก Ionic (userId และ role)
    const { userId, role } = await req.json()

    // 2. ⚠️ แก้ ID ให้เป็นของจริงที่คุณมี ⚠️
    const MENU_IDS: Record<string, string> = {
      guest: "richmenu-10c033c70800e7b5ffb2059483df051c",
      visitor: "richmenu-0a60588ed403b1bd572c34b18cece5f8", 
      // host: "richmenu-zzzzzz...",
      // guard: "richmenu-aaaaaa...",
    }

    // เลือก Menu ID ตาม Role ที่ส่งมา (ถ้าไม่เจอให้ใช้ guest เป็นค่าเริ่มต้น)
    const targetMenuId = MENU_IDS[role] || MENU_IDS['guest']

    console.log(`Switching menu for ${userId} to ${role} (${targetMenuId})`)

    // 3. เตรียมยิงบอก LINE Server
    const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    
    if (!channelAccessToken) {
        throw new Error("LINE Token not found in Secrets")
    }

    const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${targetMenuId}`

    // 4. ยิง API ไปที่ LINE
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LINE API Error:', errorText)
      throw new Error(`Failed to change menu: ${response.status}`)
    }

    // 5. ส่งผลลัพธ์กลับไปบอก Ionic
    return new Response(
      JSON.stringify({ success: true, message: `Menu changed to ${role}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})