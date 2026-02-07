import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // ==========================================
  // ส่วนใหม่: สำหรับ Register & Rich Menu Flow
  // ==========================================

  // 1. Sync User จาก LINE ลง DB (ใช้ตอนเปิดแอป)
  async syncLineProfile(lineProfile: any): Promise<any> {
    try {
      // 1.1 เช็คใน DB ว่ามี user นี้ไหม
      const { data: existingUser } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('line_user_id', lineProfile.userId)
        .single();

      if (existingUser) {
        // 1.2 ถ้ามี: อัปเดตข้อมูลล่าสุด (ชื่อ/รูป)
        await this.supabase.from('profiles').update({
          full_name: lineProfile.displayName,
          picture_url: lineProfile.pictureUrl
        }).eq('id', existingUser.id);
        
        return existingUser;
      }

      // 1.3 ถ้าไม่มี: สร้างใหม่ (Default Role = 'guest')
      const { data: newUser, error } = await this.supabase
        .from('profiles')
        .insert({
          line_user_id: lineProfile.userId,
          full_name: lineProfile.displayName,
          picture_url: lineProfile.pictureUrl,
          role: 'guest'
        })
        .select()
        .single();

      if (error) throw error;
      return newUser;

    } catch (err) {
      console.error('Auth Sync Error:', err);
      return null;
    }
  }

  // 2. อัปเดต Role และข้อมูลอื่นๆ
  async updateProfile(userId: string, updateData: any) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(updateData)
        .eq('line_user_id', userId)
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