import { Injectable } from '@angular/core';
import liff from '@line/liff';

@Injectable({
  providedIn: 'root'
})
export class LineService {

  private readonly LIFF_ID = '2008822504-QHufvISJ'; 
  private readonly FUNCTION_URL = 'https://rcspzyeyyduobbuamuoq.supabase.co/functions/v1/switch-menu';

  constructor() { }

  async initLiff() {
    try {
      await liff.init({ liffId: this.LIFF_ID });
      console.log('LIFF Initialized!');
      
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
    try {
      const profile = await liff.getProfile();
      return profile;
    } catch (error) {
      console.error('Get Profile Error:', error);
      return null;
    }
  }

  getInviteCodeFromUrl(): string | null {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('code');
  }

  async switchMenu(role: string) {
    try {
      if (!liff.isLoggedIn()) {
        throw new Error('User not logged in');
      }

      const profile = await liff.getProfile();
      const userId = profile.userId;

      console.log(`🔄 Requesting menu switch to: ${role} for ${userId}`);

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role })
      });

      if (!response.ok) {
        throw new Error('Function call failed');
      }

      const result = await response.json();
      console.log('✅ Menu switched:', result);
      
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
}