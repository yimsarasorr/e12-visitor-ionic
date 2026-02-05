import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonIcon, IonLabel, IonAvatar, IonButton, IonCard, IonCardContent, 
  IonBadge, IonCardHeader, IonCardSubtitle, IonNote, 
  ModalController, LoadingController, AlertController, IonButtons, IonSpinner, 
  IonSegment, IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  peopleOutline, schoolOutline, logOutOutline, cardOutline, 
  chatbubblesOutline, logInOutline, qrCodeOutline, refreshOutline, 
  chevronForwardOutline, alertCircleOutline, bugOutline, copyOutline
} from 'ionicons/icons';
import { UAParser } from 'ua-parser-js';

// Import Services
import { LineService } from '../services/line.service';
import { AuthService } from '../services/auth.service';
// Import Components
import { VisitorRegistrationModalComponent } from '../components/ui/visitor-registration-modal/visitor-registration-modal.component';
import { FastpassHeaderComponent } from '../components/ui/fastpass-header/fastpass-header.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonSpinner, IonButtons, 
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonList, IonItem, IonIcon, IonLabel, IonAvatar, IonButton, IonCard, 
    IonCardContent, IonBadge, IonCardHeader, IonCardSubtitle, IonNote,
    IonSegment, IonSegmentButton, FastpassHeaderComponent
  ]
})
export class ProfilePage implements OnInit {

  currentRole: string = 'guest'; // default role
  lineProfile: any = null;
  isLiffLoading = false;
  isLoggedIn = false;
  selectedTab = 'dashboard';

  // ➕ Debug & Browser Check
  browserInfo: any = null;
  isChromeOnIOS = false;

  constructor(
    private lineService: LineService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { 
    // Add Icons
    addIcons({
      logOutOutline, cardOutline, qrCodeOutline, 
      chatbubblesOutline, refreshOutline, logInOutline, 
      peopleOutline, schoolOutline, chevronForwardOutline,
      alertCircleOutline, bugOutline, copyOutline
    });
  }

  async ngOnInit() {
    // ➕ เช็ค Browser/OS และพยายามดีดไป Safari บน iOS ถ้าไม่ใช่ Mobile Safari
    this.handleBrowserCheck();
    await this.initData();
  }

  copyCurrentLink() {
    const url = window.location.href;
    // ใช้ API Clipboard ของ Browser
    navigator.clipboard.writeText(url).then(() => {
      alert('คัดลอกลิงก์แล้ว! กรุณานำไปเปิดใน Safari');
    }).catch(err => {
      console.error('Copy failed', err);
      // Fallback เผื่อบาง Browser ไม่รองรับ
      alert('ไม่สามารถคัดลอกได้: ' + url);
    });
  }

  // ✅ ฟังก์ชัน Copy User ID (แก้ Error: copyUserId does not exist)
  copyUserId() {
    if (this.lineProfile?.userId) {
      navigator.clipboard.writeText(this.lineProfile.userId).then(() => {
        alert('Copied User ID: ' + this.lineProfile.userId);
      });
    }
  }

  async initData() {
    this.isLiffLoading = true;

    try {
      // 1) Init LIFF (SDK will read 'code' from URL automatically on Safari)
      await this.lineService.initLiff();
    } catch (e) {
      console.error('LIFF Init Error:', e);
    }

    // 2) Check login state
    if (this.lineService.isLoggedIn()) {
      // ✅ Logged in via relay
      console.log('✅ User is logged in via Relay!');
      try {
        this.lineProfile = await this.lineService.getProfile();
        if (this.lineProfile) {
          const dbUser = await this.authService.syncLineProfile(this.lineProfile);
          if (dbUser) {
            this.currentRole = dbUser.role;
            console.log('🏷️ Role from DB:', this.currentRole);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    } else {
      // 🛑 Not logged in: check if URL still has a code (avoid loop)
      const params = new URLSearchParams(window.location.search);
      if (params.has('code')) {
        console.error('❌ Login failed despite having code (Code might be used/expired)');
        alert('เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณากดปุ่ม "เข้าสู่ระบบ" อีกครั้ง');
        // Do not call login() here to avoid loop
      } else {
        // No code -> begin login flow
        console.log('🚀 Starting Login Flow...');
        this.lineService.login();
      }
    }

    this.isLiffLoading = false;
  }

  // เช็ค Browser + Auto Redirect ไป Safari สำหรับ iOS
  handleBrowserCheck() {
    const parser = new UAParser();
    const result = parser.getResult();
    this.browserInfo = result; // เก็บไว้โชว์ Debug

    // 1) ดึงพารามิเตอร์จาก URL ที่ LINE ส่งมาให้ Chrome
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const liffState = params.get('liff.state');

    // เช็คว่าเป็น iOS และไม่ใช่ Safari
    const isIOS = result.os?.name === 'iOS';
    const isNotSafari = result.browser?.name !== 'Mobile Safari';

    if (isIOS && isNotSafari) {
      this.isChromeOnIOS = true;

      // 🔄 CASE 1: ขากลับ (Login เสร็จแล้ว มี Code ติดมา) -> ส่งกลับ Safari ด้วย URL สะอาด
      if (code) {
        console.log('🔄 Got Code from LINE! Relaying to Safari...');
        const host = window.location.host;      // เช่น e12-visitor-ionic.vercel.app
        const path = window.location.pathname;  // เช่น /tabs/profile

        let cleanUrl = `x-safari-https://${host}${path}?code=${encodeURIComponent(code)}`;
        if (state) cleanUrl += `&state=${encodeURIComponent(state)}`;
        if (liffState) cleanUrl += `&liff.state=${encodeURIComponent(liffState)}`;

        console.log('✨ Sending Clean URL to Safari:', cleanUrl);
        window.location.href = cleanUrl;
        return;
      }

      // 🚀 CASE 2: ขาไป (ครั้งแรก ยังไม่มี Code) -> ดีดไป Safari เพื่อเริ่ม Login
      const currentUrl = window.location.href;
      if (currentUrl.startsWith('https://')) {
        const safariUrl = currentUrl.replace('https://', 'x-safari-https://');
        setTimeout(() => { window.location.href = safariUrl; }, 500);
      }
    }
  }

  // --- 🟢 Flow 1: Visitor Register (เก็บไว้ใช้ในอนาคต) ---
  async openVisitorRegister() {
    const modal = await this.modalCtrl.create({
      component: VisitorRegistrationModalComponent,
      componentProps: { 
        currentUserId: this.lineProfile?.userId 
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data?.registered) {
      this.currentRole = 'visitor';
      const successAlert = await this.alertCtrl.create({
        header: 'ลงทะเบียนสำเร็จ',
        message: 'คุณได้รับสิทธิ์เข้าอาคาร (Visitor) เรียบร้อยแล้ว',
        buttons: ['ตกลง']
      });
      await successAlert.present();
    }
  }

  // --- 🟠 Flow 2: KMITL Login (Mock) (เก็บไว้ใช้ในอนาคต) ---
  async openKmitlLogin() {
    const alert = await this.alertCtrl.create({
      header: 'KMITL SSO Login',
      message: 'จำลองระบบ Login (กรอกรหัสนักศึกษา)',
      inputs: [
        { name: 'username', type: 'text', placeholder: 'รหัสนักศึกษา / บุคลากร' },
        { name: 'password', type: 'password', placeholder: 'รหัสผ่าน' }
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'เข้าสู่ระบบ',
          handler: (data) => {
            if (data.username && data.password) {
              this.processKmitlLogin(data.username);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async processKmitlLogin(username: string) {
    let newRole = 'user'; 
    if (username.startsWith('9')) newRole = 'host';

    const extraData = {
      department: 'Engineering'
    };
    await this.confirmRoleChange(newRole, extraData);
  }

  // --- 🔄 Shared Logic: บันทึก Role และเปลี่ยนเมนู ---
  async confirmRoleChange(newRole: string, extraData: any) {
    const loading = await this.loadingCtrl.create({ message: 'กำลังบันทึกข้อมูล...' });
    await loading.present();

    try {
      const updateData = { role: newRole, ...extraData };
      if (this.lineProfile?.userId) {
         await this.authService.updateProfile(this.lineProfile.userId, updateData);
      }

      await this.lineService.switchMenu(newRole);
      this.currentRole = newRole;
      
      await loading.dismiss();
      
      const successAlert = await this.alertCtrl.create({
        header: 'สำเร็จ',
        message: `เปลี่ยนสถานะเป็น: ${newRole.toUpperCase()} เรียบร้อย`,
        buttons: ['ตกลง']
      });
      await successAlert.present();

    } catch (error) {
      await loading.dismiss();
      console.error(error);
      alert('เกิดข้อผิดพลาด: ' + JSON.stringify(error));
    }
  }

  // ฟังก์ชัน Logout
  logout() {
    this.lineService.logout();
    // Reload เพื่อเริ่ม Flow Login ใหม่
    window.location.reload(); 
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'visitor': return 'success';
      case 'host': return 'primary';
      case 'user': return 'tertiary';
      default: return 'medium';
    }
  }

  // ✅ 🔧 Dev Tools: Force Switch Role (ใช้สำหรับปุ่ม 4 ปุ่มด้านล่าง)
  async debugSwitchRole(role: string): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: `Dev Force: ${role}...` });
    await loading.present();

    try {
      // 1. เรียก Cloud Function เปลี่ยน Menu
      const success = await this.lineService.switchMenu(role);

      if (success) {
        this.currentRole = role;

        // 2. อัปเดต DB ให้ตรงกัน
        if (this.lineProfile?.userId) {
          await this.authService.updateProfile(this.lineProfile.userId, { role });
        }

        const alert = await this.alertCtrl.create({
          header: 'Success',
          message: `เปลี่ยนสถานะเป็น ${role.toUpperCase()} เรียบร้อย`,
          buttons: ['OK']
        });
        await alert.present();
      } else {
        throw new Error('Call function failed');
      }
    } catch (error) {
      console.error(error);
      alert('เปลี่ยนเมนูไม่สำเร็จ: ดู Log ใน Supabase');
    } finally {
      await loading.dismiss();
    }
  }

  // ฟังก์ชันเปิด LINE OA (ลิงก์ External)
  openLineOA(): void {
    const link = this.lineService.getLineOALink();
    window.open(link, '_system');
  }

  segmentChanged(ev: any) {
    this.selectedTab = ev.detail.value;
  }
}