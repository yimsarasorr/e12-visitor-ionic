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
  chevronForwardOutline
} from 'ionicons/icons';

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
      peopleOutline, schoolOutline, chevronForwardOutline
    });
  }

  async ngOnInit() {
    await this.initData();
  }

  async initData() {
    this.isLiffLoading = true;
    
    // 1. Init LIFF SDK
    await this.lineService.initLiff();

    // 2. ตรวจสอบสถานะ Login จริง
    const _isLoggedIn = this.lineService.isLoggedIn();
    this.isLoggedIn = _isLoggedIn;

    if (_isLoggedIn) {
      // ✅ กรณี Login แล้ว: ดึงข้อมูลและ Sync DB
      console.log('✅ User is logged in (LIFF)');
      try {
        this.lineProfile = await this.lineService.getProfile();

        if (this.lineProfile) {
          console.log('👤 Profile:', this.lineProfile.userId);
          
          // Sync ลง Database
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
      // 🚀 กรณีหลุด Login: สั่ง Auto Login ทันที (Force Redirect)
      console.log('🔄 Not logged in. Redirecting to LINE Login...');
      this.lineService.login(); 
      // โค้ดจะหยุดทำงานตรงนี้เพราะ Browser จะ Redirect หน้าไปที่อื่น
    }

    this.isLiffLoading = false;
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