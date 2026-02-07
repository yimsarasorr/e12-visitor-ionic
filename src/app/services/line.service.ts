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
      });
    } catch (error) {
      console.error('LIFF Init Error:', error);
    }
  }

  login() {
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
    }
  }

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
  
  logout() {
    if (liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    }
  }

  async switchMenu(role: string) {
    try {
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

  getLineOALink(): string {
    return `https://line.me/R/ti/p/${this.LINE_OA_ID}`;
  }
}