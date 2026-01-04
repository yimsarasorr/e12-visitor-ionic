import { Injectable } from '@angular/core';
import liff from '@line/liff';

@Injectable({
  providedIn: 'root'
})
export class LineService {

  // ⚠️ ใส่ LIFF ID ของคุณที่ได้จาก LINE Developers Console ตรงนี้
  // ถ้ายังไม่มีใส่ 'YOUR_LIFF_ID' ไว้ก่อน (แต่จะรันจริงไม่ได้นะ)
  private readonly LIFF_ID = 'YOUR_LIFF_ID_HERE'; 

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
}