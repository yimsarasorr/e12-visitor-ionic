import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Observable, from, map } from 'rxjs';

export interface RolePermission {
  role: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  floor_number: number;
}

export interface UserProfile {
  id: string;
  full_name: string;
  is_staff: boolean;
  role_label?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ✅ แก้ไข 1: สร้าง Client ตรงนี้เลย เพื่อลดโอกาสเกิด Multiple Instance
  private supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);

  constructor() {}

  // --- 1. Login ผ่าน LINE (เอา Token มาแลก Session) ---
  async signInWithLineToken(idToken: string) {
    const { data, error } = await this.supabase.auth.signInWithIdToken({
      provider: 'line',
      token: idToken,
    });
    if (error) throw error;
    return data.user;
  }

  // --- 2. Login แบบ Guest (Anonymous) ---
  async signInAnonymously() {
    const { data, error } = await this.supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  }

  // --- 3. อัปเกรด Guest เป็น User ถาวร (Email/Password) ---
  async upgradeGuestToEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      email: email,
      password: password
    });
    if (error) throw error;
    return data.user;
  }

  // --- Utility: ดึง User ปัจจุบัน ---
  async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  // ==========================================
  // ส่วนใหม่: สำหรับ Register & Rich Menu Flow
  // ==========================================

  // ✅ แก้ไข 2: ใช้ Upsert แทน Select+Insert เพื่อแก้ Error 406
  async syncLineProfile(lineProfile: any): Promise<any> {
    try {
      // Upsert: ถ้ามี ID นี้แล้วให้อัปเดต ถ้ายังไม่มีให้สร้างใหม่ (Atomic Operation)
      const { data, error } = await this.supabase
        .from('profiles')
        .upsert({
          id: lineProfile.userId,            // ต้องตรงกับ Auth UID
          full_name: lineProfile.displayName || 'Guest User',
          picture_url: lineProfile.pictureUrl,
          role: lineProfile.role || 'guest'  // Default role ถ้าไม่ส่งมา
        }, { onConflict: 'id' })             // ยึด id เป็นหลัก
        .select()
        .single(); // Upsert เสร็จแล้วค่อยดึงค่ากลับมา จะไม่มีทาง Error 406

      if (error) throw error;
      return data;

    } catch (err) {
      console.error('Auth Sync Error:', err);
      // ในกรณีนี้อาจจะ throw error ต่อไปเพื่อให้หน้าบ้านรู้ว่า save ไม่สำเร็จ
      throw err;
    }
  }

  // 2. อัปเดต Role และข้อมูลอื่นๆ
  async updateProfile(userId: string, updateData: any) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Update Profile Error:', err);
      return null;
    }
  }

  async changeRichMenu(userId: string, newRole: string) {
    const { data, error } = await this.supabase.functions.invoke('switch-menu', {
      body: { userId, role: newRole }
    });
    if (error) throw error;
    return data;
  }

  // ==========================================
  // Logic เช็คสิทธิ์ประตู 
  // ==========================================

  getRoles(): Observable<RolePermission[]> {
    const request = this.supabase
      .from('roles')
      .select('role');
    return from(request).pipe(map(response => response.data || []));
  }

  getPermissionList(role: string): Observable<string[]> {
    const request = this.supabase
      .from('access_rules')
      .select('asset_id')
      .eq('role', role);
    return from(request).pipe(
      map(response => response.data ? response.data.map((item: any) => item.asset_id) : [])
    );
  }

  getUsers(): Observable<UserProfile[]> {
    const request = this.supabase
      .from('profiles')
      .select('id, full_name, is_staff') 
      .order('is_staff', { ascending: false });

    return from(request).pipe(
      map(response => {
        if (response.error || !response.data) return [];
        return response.data.map((u: any) => ({
          id: u.id,
          full_name: u.full_name || u.display_name,
          is_staff: u.is_staff,
          role_label: `${u.full_name} (${u.is_staff ? 'Staff' : 'Visitor'})`
        }));
      })
    );
  }

  getUserPermissions(userId: string, isStaff: boolean): Observable<string[]> {
    if (isStaff) {
      return from(this.supabase.from('assets').select('id')).pipe(
        map(res => res.data ? res.data.map((a: any) => a.id) : [])
      );
    }
    const now = new Date().toISOString();
    const request = this.supabase
      .from('invitation_access_items')
      .select('asset_id, invitations!inner(visitor_id, valid_from, valid_until)')
      .eq('invitations.visitor_id', userId)
      .lte('invitations.valid_from', now)
      .gte('invitations.valid_until', now);

    return from(request).pipe(
      map(response => response.data ? response.data.map((item: any) => item.asset_id) : [])
    );
  }
}