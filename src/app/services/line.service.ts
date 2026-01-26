import { Injectable } from '@angular/core';
import liff from '@line/liff';

@Injectable({
  providedIn: 'root'
})
export class LineService {

  private readonly LIFF_ID = '2008822504-QHufvISJ';
  // ใส่ URL Function ที่คุณ Deploy แล้ว
  private readonly FUNCTION_URL = 'https://rcspzyeyyduobbuamuoq.supabase.co/functions/v1/switch-menu';

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
      if (!liff.isLoggedIn()) return false;

      const profile = await liff.getProfile();
      const userId = profile.userId;

      console.log(`🔄 Switching menu to: ${role}`);

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });

      if (!response.ok) throw new Error('Function failed');
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
}