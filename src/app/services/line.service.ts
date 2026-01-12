import { Injectable } from '@angular/core';
import liff from '@line/liff';

@Injectable({
  providedIn: 'root'
})
export class LineService {

  private readonly LIFF_ID = '2008822504-QHufvISJ'; 
  // ⚠️ ใส่ URL ที่ได้จากการ Deploy Supabase เมื่อกี้
  private readonly FUNCTION_URL = 'https://rcspzyeyyduobbuamuoq.supabase.co/functions/v1/switch-menu';

  constructor() { }

  async initLiff() {
    try {
      await liff.init({ liffId: this.LIFF_ID });
      console.log('LIFF Initialized!');
      
      if (!liff.isLoggedIn()) {
        liff.login(); // บังคับ Login ถ้ายังไม่ได้ Login
      }
    } catch (error) {
      console.error('LIFF Init Error:', error);
    }
  }

  // เช็คว่าเปิดใน LINE ไหม
  isInClient(): boolean {
    return liff.isInClient();
  }

  // ดึงข้อมูล User (User ID, Display Name, Picture)
  async getProfile() {
    try {
      const profile = await liff.getProfile();
      return profile;
    } catch (error) {
      console.error('Get Profile Error:', error);
      return null;
    }
  }

  // ดึงค่า Query Param จาก URL (เช่น ?code=INV-1234)
  getInviteCodeFromUrl(): string | null {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('code');
  }

  // ฟังก์ชันสั่งเปลี่ยน Rich Menu
  async switchMenu(role: string) {
    try {
      if (!liff.isLoggedIn()) {
        throw new Error('User not logged in');
      }

      // 1. หา User ID จาก LIFF
      const profile = await liff.getProfile();
      const userId = profile.userId;

      console.log(`🔄 Requesting menu switch to: ${role} for ${userId}`);

      // 2. ยิงไปหา Supabase Function
      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': 'Bearer ...' // ถ้าเปิด verify jwt ต้องใส่ แต่ตอนนี้เราปิดไว้
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

  // ฟังก์ชันปิดหน้าจอ LIFF (กดเปลี่ยนเสร็จควรปิดเลย เมนูจะได้โผล่)
  closeWindow() {
    if (liff.isInClient()) {
      liff.closeWindow();
    }
  }
}