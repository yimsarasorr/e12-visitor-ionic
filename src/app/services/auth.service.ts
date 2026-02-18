import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Observable, from, map, of } from 'rxjs'; // ✅ เพิ่ม of

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
  private supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    }
  });

  constructor() {}

  // --- 1. Login ผ่าน LINE (เอา Token มาแลก Session) ---
  async signInWithLineToken(idToken: string) {
    // 1. เช็คก่อนว่ามี User อยู่ไหม ถ้าไม่มีให้สร้าง Anonymous ขึ้นมา (เพื่อให้ได้ UID เครื่องเดิม)
    let { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      console.log('🔄 No session found, initializing anonymous session...');
      user = await this.signInAnonymously(); // สร้างหรือกู้คืน Anon Session
    }

    const currentUid = user?.id;
    if (!currentUid) throw new Error("Could not establish a device anchor (Anonymous UID)");

    // 2. ส่ง idToken และ currentUid ไปที่ Edge Function
    const { data, error } = await this.supabase.functions.invoke('line-login', {
      body: { 
        idToken,
        anonymousUid: currentUid 
      }
    });

    if (error) throw error;

    // 3. ใช้ Session ที่ Edge Function ออกให้
    if (data?.session) {
      await this.supabase.auth.setSession(data.session);
      // ✅ คืน user โดยตรง เพื่อให้ profile.page.ts ใช้ user.id ได้
      return data.session.user;
    }
    return null;
  }

  // ✅ แก้ไขฟังก์ชันนี้: ระบบกู้ชีพ Session (Anti-Lock Logic)
  async getCurrentUser(): Promise<User | null> {
    // 1. ลองดึงจาก Memory Cache ก่อน (เร็วสุด ไม่ติด Lock แน่นอน)
    const { data: sessionData } = await this.supabase.auth.getSession();
    if (sessionData.session?.user) {
      return sessionData.session.user;
    }

    // 2. ถ้าไม่มีใน Cache ให้ลองดึงจาก Storage โดยมีระบบ Retry
    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const { data, error } = await this.supabase.auth.getUser();
        
        // ถ้าไม่มี Error คืนค่า User (หรือ null ถ้าไม่มี)
        if (!error) return data.user;

        // ถ้า Error ไม่ใช่เรื่อง Lock (เช่น 401 Unauthorized) ให้ยอมแพ้เลย
        if (!this.isLockError(error)) {
          console.warn('Auth Error (Non-Lock):', error.message);
          return null;
        }

        // ถ้าเป็น Lock Error ให้ throw ไปเข้า catch เพื่อรอ
        throw error;

      } catch (err: any) {
        // เช็คว่าเป็น Error เรื่อง Lock หรือไม่
        if (this.isLockError(err)) {
          console.log(`🔒 Storage Locked, retrying ${i + 1}/${MAX_RETRIES}...`);
          await this.delay(500 * (i + 1)); // รอแบบ Exponential (500ms, 1000ms, 1500ms)
          continue; // วนลูปไปลองใหม่
        }
        // ถ้า Error อื่นๆ คืนค่า null
        return null;
      }
    }
    
    // ถ้าลองจนหมดความอดทนแล้วยัง Lock อยู่ (ซวยจริงๆ)
    // ให้ลองเสี่ยงดู Session อีกรอบเป็นทางเลือกสุดท้าย
    const { data: finalCheck } = await this.supabase.auth.getSession();
    return finalCheck.session?.user || null;
  }

  // Helper เช็ค Error
  private isLockError(err: any): boolean {
    const msg = err?.message || err?.name || '';
    return msg.includes('Lock') || msg.includes('NavigatorLockAcquireTimeoutError');
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ✅ แก้ไขการสร้าง Anonymous: ต้องมั่นใจจริงๆ ว่าไม่มี User
  async signInAnonymously() {
    // เช็คย้ำอีกรอบ
    const existing = await this.getCurrentUser();
    if (existing) return existing;

    console.log('🆕 Creating NEW Device Anchor (Confirmed No Session)');
    const { data, error } = await this.supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) console.error('SignOut Error:', error);
  }

  // 4. แก้ไข Logout ไม่ให้ทำลาย Anonymous Session
  async logicalLogout() {
    // ลบแค่ข้อมูลโปรไฟล์ในเครื่องเพื่อให้แอปกลับไปหน้า Login/Guest
    localStorage.removeItem('user_profile'); 
    // ห้ามเรียก supabase.auth.signOut() เพื่อรักษา UID เดิมไว้
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

  // ✅ 1. เพิ่มฟังก์ชัน: เช็ค Session แบบละเอียด (ไม่ยิง Server)
  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  // ✅ แก้ Profile: ใช้ maybeSingle เพื่อแก้ Error 406
  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // เปลี่ยนจาก .single() เป็น .maybeSingle() เพื่อกัน Error 406
    
    if (error) {
      console.error('Get Profile Error:', error);
      return null;
    }
    return data;
  }

  // ✅ 2. แก้ฟังก์ชันดึง User สำหรับ Header (ดึงแค่คนเดียว)
  getCurrentUserProfile(): Observable<UserProfile | null> {
    return from(this.supabase.auth.getUser()).pipe(
      map(({ data }) => {
        if (!data.user) return null;
        // Map ข้อมูล User เป็น UserProfile format
        return {
          id: data.user.id,
          full_name: data.user.user_metadata['full_name'] || 'Guest',
          is_staff: false, // หรือ check role เอา
          role_label: (data.user.user_metadata['full_name'] || 'Guest')
        } as UserProfile;
      })
    );
  }

  // ==========================================
  // ส่วนใหม่: สำหรับ Register & Rich Menu Flow
  // ==========================================

  async syncLineProfile(lineProfile: any): Promise<any> {
    try {
      const upsertData: any = {
        id: lineProfile.userId, // UUID เครื่อง
        line_user_id: lineProfile.lineUserId, 
        full_name: lineProfile.displayName || 'Guest User',
        picture_url: lineProfile.pictureUrl,
        updated_at: new Date(),
        role: lineProfile.role || 'visitor'
      };

      const { data, error } = await this.supabase
        .from('profiles')
        .upsert(upsertData, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (err) {
      console.error('Auth Sync Error:', err);
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