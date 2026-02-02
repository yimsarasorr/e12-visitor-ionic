import { Injectable } from '@angular/core';
import liff from '@line/liff';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LineService {

  private readonly LIFF_ID = environment.liffId;
  private readonly FUNCTION_URL = 'https://rcspzyeyyduobbuamuoq.supabase.co/functions/v1/switch-menu';
  public readonly LINE_OA_ID = '@804vyuvy';

  constructor() { }

  async initLiff() {
    try {
      await liff.init({
        liffId: this.LIFF_ID
        // withLoginOnExternalBrowser: true // removed to prevent auto redirect
      });
    } catch (error) {
      console.error('LIFF Init Error:', error);
    }
  }

  // ✅ เพิ่มฟังก์ชัน Login ธรรมดา (ให้ผู้ใช้กดเอง)
  login() {
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
    }
  }

  // ✅ wrapper สำหรับเช็คสถานะ login
  isLoggedIn(): boolean {
    return liff.isLoggedIn();
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
      // ถ้าเปิดใน Browser แล้วยัง Login ไม่เสร็จ ให้หยุดทำงานก่อน
      if (!liff.isLoggedIn()) {
        console.warn('User not logged in LIFF');
        return false;
      }

      const profile = await liff.getProfile();
      const userId = profile.userId;

      console.log(`🔄 Switching menu to: ${role} for ${userId}`);

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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