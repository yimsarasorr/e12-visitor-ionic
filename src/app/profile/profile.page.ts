import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonIcon, IonLabel, IonAvatar, IonButton, IonCard, IonCardContent, 
  IonBadge, IonCardHeader, IonCardSubtitle, IonNote, 
  ModalController, LoadingController, AlertController, IonButtons, IonSpinner, 
  IonSegment, IonSegmentButton, IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  peopleOutline, schoolOutline, logOutOutline, cardOutline, 
  chatbubblesOutline, logInOutline, qrCodeOutline, refreshOutline, 
  chevronForwardOutline, alertCircleOutline, bugOutline, copyOutline,
  personOutline, globeOutline, personAddOutline
} from 'ionicons/icons';

// Import Services
import { LineService } from '../services/line.service';
import { AuthService } from '../services/auth.service';
import { VisitorRegistrationModalComponent } from '../components/ui/visitor-registration-modal/visitor-registration-modal.component';
import { FastpassHeaderComponent } from '../components/ui/fastpass-header/fastpass-header.component';

declare const liff: any;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonSpinner, IonGrid, IonRow, IonCol,
    CommonModule, FormsModule, IonContent,
    IonItem, IonIcon, IonLabel, IonAvatar, IonButton, IonCard,
    IonCardContent, IonBadge, IonCardHeader, IonCardSubtitle,
    IonSegment, IonSegmentButton, FastpassHeaderComponent
  ]
})
export class ProfilePage implements OnInit {

  currentRole: string = 'guest';
  lineProfile: any = null;
  isLiffLoading = true;
  isLoggedIn = false; // ใช้คุม State หน้า Landing vs Dashboard
  selectedTab = 'dashboard';

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
      alertCircleOutline, bugOutline, copyOutline,
      personOutline, globeOutline, personAddOutline
    });
  }

  async ngOnInit() {
    this.isLiffLoading = true;
    await new Promise(r => setTimeout(r, 300)); // ให้เวลา Browser กู้ Session

    // 1. เช็ค Session เดิมก่อน ถ้ามีแล้ว "ห้ามสร้างใหม่"
    const user = await this.authService.getCurrentUser();
    if (user) {
      console.log('⚓ Anchor Secured:', user.id);
    } else {
      // ไม่มีจริงๆ ค่อยสร้าง
      await this.authService.signInAnonymously();
    }

    await this.initData();
  }

  private async initData() {
    this.isLiffLoading = true;
    try {
      // 1. เริ่มต้น LIFF
      await this.lineService.initLiff();

      // 2. เช็คว่าเป็น LINE In-App Browser หรือไม่
      if (this.lineService.isInClient()) {
        await this.handleLineInAppFlow();
      } else {
        await this.handleExternalBrowserFlow();
      }
    } catch (error) {
      console.error('Init Error:', error);
    } finally {
      this.isLiffLoading = false;
    }
  }

  // ➤ Flow A: ทำงานใน LINE (Auto Login)
  private async handleLineInAppFlow() {
    // 1. ถ้ายังไม่ Login LINE -> สั่ง Login
    if (!this.lineService.isLoggedIn()) {
      this.lineService.login();
      return;
    }

    // 2. ถ้า Login แล้ว -> เอา ID Token ไปแลก Supabase Session
    const idToken = liff.getIDToken();
    if (idToken) {
      const user = await this.authService.signInWithLineToken(idToken);

      // 3. Sync Profile ลง DB
      const lineProfile = await this.lineService.getProfile();
      await this.finalizeLogin(user, lineProfile);
    }
  }

  // ➤ Flow B: ทำงานนอก LINE (External Browser / Desktop)
  private async handleExternalBrowserFlow() {
    if (this.lineService.isLoggedIn()) {
      try {
        console.log('🔄 Returning from LINE Login...');
        const idToken = liff.getIDToken();

        if (idToken) {
          const user = await this.authService.signInWithLineToken(idToken);
          const lineProfile = await this.lineService.getProfile();
          await this.finalizeLogin(user, lineProfile);

          // ✅ ล้าง code ออกจาก URL ทันทีที่สำเร็จเพื่อกัน Loop
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      } catch (error: any) {
        console.error('Line Redirect Error:', error);

        // ปิด Loading (ถ้ามี)
        await this.loadingCtrl.dismiss().catch(() => {});

        // แจ้ง Error ให้ชัดเจน
        alert('เข้าสู่ระบบไม่สำเร็จ: ' + (error.message || 'Device Mismatch'));

        // ล้าง State LINE ทิ้งเพื่อไม่ให้ Auto-Login อีก
        this.lineService.logout();
      }
    }

    // เช็ค Session ปกติ
    const currentUser = await this.authService.getCurrentUser();
    if (currentUser) {
      const dbProfile = await this.authService.getProfile(currentUser.id);
      this.currentRole = dbProfile?.role || 'guest';
      this.isLoggedIn = true;

      this.lineProfile = {
        userId: currentUser.id,
        displayName: currentUser.user_metadata['full_name'] || 'Guest User',
        pictureUrl: currentUser.user_metadata['picture_url']
      };
    } else {
      this.isLoggedIn = false;
    }
  }

  // ปุ่ม Login ด้วย LINE (ใช้ในกรณีผู้ใช้กดเองจาก Landing)
  async loginWithLine() {
    if (this.lineService.isLoggedIn()) {
      const loading = await this.loadingCtrl.create({ message: 'กำลังซิงค์ข้อมูล...' });
      await loading.present();

      try {
        const idToken = liff.getIDToken();
        if (idToken) {
          const user = await this.authService.signInWithLineToken(idToken);
          const lineProfile = await this.lineService.getProfile();
          await this.finalizeLogin(user, lineProfile);
        }
      } catch (err: any) {
        console.error('Login Error:', err);
        alert('ผิดพลาด: ' + (err.message || 'ไม่สามารถซิงค์ข้อมูลได้'));
        this.lineService.logout();
      } finally {
        await loading.dismiss();
      }
    } else {
      this.lineService.login();
    }
  }

  // ➤ Action: ปุ่ม Guest / Non-LINE User (บน Landing Page)
  async continueAsGuest() {
    this.isLiffLoading = true;
    try {
      // ใช้ฟังก์ชันที่เราแก้ใหม่ ซึ่งจะคืนค่า User เดิมถ้ามีอยู่แล้ว
      const user = await this.authService.signInAnonymously(); 
      
      const guestProfile = {
        userId: user?.id,
        displayName: 'Guest User',
        pictureUrl: 'assets/shapes.svg'
      };

      await this.finalizeLogin(user, guestProfile);
    } catch (error) {
      console.error('Guest Login Failed', error);
    } finally {
      this.isLiffLoading = false;
    }
  }

  // ➤ Action: ปุ่มยืนยันตัวตน (Upgrade Guest -> Email User)
  async upgradeGuestAccount() {
    const alert = await this.alertCtrl.create({
      header: 'ลงทะเบียนผู้ใช้งาน',
      message: 'กรุณากรอกอีเมลและรหัสผ่านเพื่อบันทึกบัญชีนี้ถาวร',
      inputs: [
        { name: 'email', type: 'email', placeholder: 'อีเมล' },
        { name: 'password', type: 'password', placeholder: 'รหัสผ่าน' }
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยืนยัน',
          handler: async (data) => {
            try {
              await this.authService.upgradeGuestToEmail(data.email, data.password);
              const success = await this.alertCtrl.create({ 
                header: 'สำเร็จ', 
                message: 'บัญชีของคุณถูกผูกกับอีเมลเรียบร้อยแล้ว',
                buttons: ['OK']
              });
              await success.present();
            } catch (err: any) {
              const errorAlert = await this.alertCtrl.create({ 
                header: 'ผิดพลาด', 
                message: err.message,
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Helper: จบกระบวนการ Login
  private async finalizeLogin(user: any, profileData: any) {
    const dbUser = await this.authService.syncLineProfile({
      ...profileData,
      userId: user.id,
      lineUserId: profileData.userId,
      role: 'visitor'
    });

    this.lineProfile = {
      ...profileData,
      userId: user.id
    };
    
    this.currentRole = dbUser?.role || 'visitor';
    this.isLoggedIn = true;
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

  copyUserId() {
    if (this.lineProfile?.userId) {
      navigator.clipboard.writeText(this.lineProfile.userId).then(() => {
        alert('Copied User ID: ' + this.lineProfile.userId);
      });
    }
  }

  openLineOA(): void {
    const link = this.lineService.getLineOALink();
    window.open(link, '_system');
  }

  async openVisitorRegister() {
    const modal = await this.modalCtrl.create({
      component: VisitorRegistrationModalComponent,
      componentProps: { currentUserId: this.lineProfile?.userId ?? null }
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
    await this.confirmRoleChange(newRole, { department: 'Engineering' });
  }

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

  // แทนที่ logout เดิมด้วย onLogout แบบไม่ทำลาย Anonymous UID และไม่ reload หน้า
  async onLogout() {
    const alert = await this.alertCtrl.create({
      header: 'ออกจากระบบ',
      message: 'ต้องการกลับไปหน้าเลือกสิทธิ์เข้าใช้งานหรือไม่? (ตัวตนเครื่องจะยังคงเดิม)',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ตกลง',
          handler: async () => {
            // 1. ล้างข้อมูลโปรไฟล์ชั่วคราว แต่ไม่ทำลาย Anonymous Session
            await this.authService.logicalLogout();

            // 2. กลับไปหน้า Landing โดยไม่ต้อง Reload หน้า
            this.lineProfile = null;
            this.currentRole = 'guest';
            this.isLoggedIn = false;
          }
        }
      ]
    });
    await alert.present();
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'visitor': return 'success';
      case 'host': return 'primary';
      case 'user': return 'tertiary';
      default: return 'medium';
    }
  }

  async debugSwitchRole(role: string): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: `Dev Force: ${role}...` });
    await loading.present();
    try {
      const success = await this.lineService.switchMenu(role);
      if (success) {
        this.currentRole = role;
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

  segmentChanged(ev: any) {
    this.selectedTab = ev.detail.value;
  }
}