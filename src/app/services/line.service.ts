import { Injectable } from '@angular/core';
import liff from '@line/liff';
// ✅ เพิ่ม import environment
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LineService {

  private readonly LIFF_ID = '2008822504-QHufvISJ';
  private readonly FUNCTION_URL = 'https://rcspzyeyyduobbuamuoq.supabase.co/functions/v1/switch-menu';
  public readonly LINE_OA_ID = '@804vyuvy';

  constructor() { }

  async initLiff() {
    try {
      await liff.init({ liffId: this.LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login();
      }
    } catch (error) {
      console.error('LIFF Init Error:', error);
    }
  }

  isInClient(): boolean {
    return liff.isInClient();
  }

  async getProfile() {
    if (liff.isLoggedIn()) {
      return await liff.getProfile();
    }
    return null;
  }
  
  // ✅ เพิ่ม Logout
  logout() {
    if (liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    }
  }

  // ✅ เพิ่ม Switch Menu
  async switchMenu(role: string) {
    try {
      if (!liff.isLoggedIn()) {
        console.warn('User not logged in LIFF');
        // ไม่ return ทันที เพื่อให้ทดสอบใน browser ได้ด้วย mock userId
      }

      const profile = liff.isLoggedIn() ? await liff.getProfile() : { userId: 'test_browser' };
      const userId = profile.userId;

      console.log(`🔄 Switching menu to: ${role} for ${userId}`);

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ ส่ง Supabase anon key ไปใน Authorization header
          'Authorization': `Bearer ${environment.supabaseKey}`
        },
        body: JSON.stringify({ userId, role })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Function failed: ${response.status} ${errorText}`);
      }

      console.log('✅ Menu switched successfully');
      return true;

    } catch (error) {
      console.error('❌ Error switching menu:', error);
      return false;
    }
  }

  closeWindow() {
    if (liff.isInClient()) {
      liff.closeWindow();
    }
  }
  
  getInviteCodeFromUrl(): string | null {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('code');
  }

  // ✅ ฟังก์ชันสร้าง Link กลับ LINE OA
  getLineOALink(): string {
    return `https://line.me/R/ti/p/${this.LINE_OA_ID}`;
  }
}