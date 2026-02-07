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
    IonSpinner,
    CommonModule, FormsModule, IonContent,
    IonItem, IonIcon, IonLabel, IonAvatar, IonButton, IonCard,
    IonCardContent, IonBadge, IonCardHeader, IonCardSubtitle,
    IonSegment, IonSegmentButton, FastpassHeaderComponent
]
})
export class ProfilePage implements OnInit {

  currentRole: string = 'guest';
  lineProfile: any = null;
  isLiffLoading = false;
  isLoggedIn = false;
  selectedTab = 'dashboard';

  // Debug & Browser Check
  browserInfo: any = null;
  isChromeOnIOS = false;

  constructor(
    private lineService: LineService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { 

    addIcons({
      logOutOutline, cardOutline, qrCodeOutline, 
      chatbubblesOutline, refreshOutline, logInOutline, 
      peopleOutline, schoolOutline, chevronForwardOutline,
      alertCircleOutline, bugOutline, copyOutline
    });
  }

  async ngOnInit() {
    await this.initData();
  }

  copyCurrentLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('คัดลอกลิงก์แล้ว');
    }).catch(err => {
      console.error('Copy failed', err);
      alert('ไม่สามารถคัดลอกได้: ' + url);
    });
  }

  // ฟังก์ชัน Copy User ID
  copyUserId() {
    if (this.lineProfile?.userId) {
      navigator.clipboard.writeText(this.lineProfile.userId).then(() => {
        alert('Copied User ID: ' + this.lineProfile.userId);
      });
    }
  }

  async initData() {
    this.isLiffLoading = true;

    // ฝั่งรับ ตรวจ bridge_user ใน URL (Safari/Chrome หลังถูกดีดมา)
    const params = new URLSearchParams(window.location.search);
    const bridgeData = params.get('bridge_user');

    if (bridgeData) {
      console.log('Received Data via Bridge!');
      try {
        const jsonString = decodeURIComponent(atob(bridgeData));
        const userData = JSON.parse(jsonString);

        this.lineProfile = userData;
        this.isLoggedIn = true;

        const dbUser = await this.authService.syncLineProfile(this.lineProfile);
        if (dbUser) this.currentRole = dbUser.role;

        console.log('Bridge Login Success');

        // ลบ query ออกจาก URL
        const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

        this.isLiffLoading = false;
        return;
      } catch (e) {
        console.error('Bridge Data Error:', e);
      }
    }

    // ฝั่งส่ง ทำงานใน LINE App
    try {
      await this.lineService.initLiff();

      const parser = new UAParser();
      const result = parser.getResult();

      const isInLineApp =
        result.ua.includes('Line') ||
        (this.lineService.isLoggedIn() && (result.browser.name?.includes('Line') ?? false));

      if (this.lineService.isLoggedIn() && isInLineApp) {
        console.log('Starting Bridge Protocol...');

        const profile = await this.lineService.getProfile();
        const dataToSend = JSON.stringify({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl
        });
        const safeData = encodeURIComponent(btoa(dataToSend));

        const baseUrl = window.location.href.split('?')[0];
        const targetUrl = `${baseUrl}?bridge_user=${safeData}`;
        const pureUrl = targetUrl.replace('https://', '').replace('http://', '');

        if (result.os.name === 'iOS') {
          // iOS -> Safari
          console.log('iOS: Bouncing to Safari...');
          const safariUrl = targetUrl.replace('https://', 'x-safari-https://');
          window.location.href = safariUrl;
        } else if (result.os.name === 'Android') {
          // Android -> Chrome via intent
          console.log('Android: Bouncing to Chrome...');
          const intent = `intent://${pureUrl}#Intent;scheme=https;package=com.android.chrome;end`;
          window.location.href = intent;
        } else {
          // Desktop/others stay and proceed normally
          this.lineProfile = profile;
          const dbUser = await this.authService.syncLineProfile(this.lineProfile);
          if (dbUser) this.currentRole = dbUser.role;
        }
        return;
      }

      // กรณีทั่วไป: เปิดตรงใน Safari/Chrome
      if (this.lineService.isLoggedIn()) {
        this.lineProfile = await this.lineService.getProfile();
        const dbUser = await this.authService.syncLineProfile(this.lineProfile);
        if (dbUser) this.currentRole = dbUser.role;
      } else {
        this.lineService.login();
      }
    } catch (e) {
      console.error(e);
    }

    this.isLiffLoading = false;
  }

  // // เช็ค Browser + Auto Redirect ไป Safari สำหรับ iOS
  // handleBrowserCheck() {
  //   const parser = new UAParser();
  //   const result = parser.getResult();
  //   this.browserInfo = result; // เก็บไว้โชว์ Debug

  //   // 1) ดึงพารามิเตอร์จาก URL ที่ LINE ส่งมาให้ Chrome
  //   const params = new URLSearchParams(window.location.search);
  //   const code = params.get('code');
  //   const state = params.get('state');
  //   const liffState = params.get('liff.state');

  //   // เช็คว่าเป็น iOS และไม่ใช่ Safari
  //   const isIOS = result.os?.name === 'iOS';
  //   const isNotSafari = result.browser?.name !== 'Mobile Safari';

  //   if (isIOS && isNotSafari) {
  //     this.isChromeOnIOS = true;

  //     // CASE 1: ขากลับ (Login เสร็จแล้ว มี Code ติดมา) -> ส่งกลับ Safari ด้วย URL สะอาด
  //     if (code) {
  //       console.log('Got Code from LINE! Relaying to Safari...');
  //       const host = window.location.host;      // เช่น e12-visitor-ionic.vercel.app
  //       const path = window.location.pathname;  // เช่น /tabs/profile

  //       let cleanUrl = `x-safari-https://${host}${path}?code=${encodeURIComponent(code)}`;
  //       if (state) cleanUrl += `&state=${encodeURIComponent(state)}`;
  //       if (liffState) cleanUrl += `&liff.state=${encodeURIComponent(liffState)}`;

  //       console.log('Sending Clean URL to Safari:', cleanUrl);
  //       window.location.href = cleanUrl;
  //       return;
  //     }

  //     // CASE 2: ขาไป (ครั้งแรก ยังไม่มี Code) -> ดีดไป Safari เพื่อเริ่ม Login
  //     const currentUrl = window.location.href;
  //     if (currentUrl.startsWith('https://')) {
  //       const safariUrl = currentUrl.replace('https://', 'x-safari-https://');
  //       setTimeout(() => { window.location.href = safariUrl; }, 500);
  //     }
  //   }
  // }

  // --- Flow 1: Visitor Register (ยังไม่ implement) ---
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

  // --- Flow 2: KMITL Login (Mock) (ยังไม่ implement) ---
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

  // --- Shared Logic: บันทึก Role และเปลี่ยนเมนู ---
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

  //ฟังก์ชัน Logout
  logout() {
    this.lineService.logout();
    
    this.lineProfile = null;
    this.isLoggedIn = false;
    this.currentRole = 'guest';
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

  // ✅ Dev Tools: Force Switch Role
  async debugSwitchRole(role: string): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: `Dev Force: ${role}...` });
    await loading.present();

    try {
      // 1. เรียก Cloud Function เปลี่ยน Menu
      const success = await this.lineService.switchMenu(role);

      if (success) {
        this.currentRole = role;

        // 2. อัปเดต DB 
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