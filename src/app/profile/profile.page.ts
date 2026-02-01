import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonIcon, IonLabel, IonAvatar, IonButton, IonCard, IonCardContent, 
  IonBadge, IonCardHeader, IonCardSubtitle, IonNote, 
  ModalController, LoadingController, AlertController, IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, schoolOutline, logOutOutline, cardOutline, chatbubblesOutline, logInOutline } from 'ionicons/icons';

// Import Services
import { LineService } from '../services/line.service';
import { AuthService } from '../services/auth.service';
// Import Components
import { VisitorRegistrationModalComponent } from '../components/ui/visitor-registration-modal/visitor-registration-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonButtons, 
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonList, IonItem, IonIcon, IonLabel, IonAvatar, IonButton, IonCard, 
    IonCardContent, IonBadge, IonCardHeader, IonCardSubtitle, IonNote
  ]
})
export class ProfilePage implements OnInit {

  currentRole: string = 'guest'; // default
  lineProfile: any = null;
  isLiffLoading = false;
  isLoggedIn = false;

  constructor(
    private lineService: LineService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { 
    addIcons({logOutOutline,logInOutline,cardOutline,chatbubblesOutline,peopleOutline,schoolOutline});
  }

  async ngOnInit() {
    await this.initData();
  }

  async initData() {
    this.isLiffLoading = true;
    await this.lineService.initLiff();

    // ✅ เช็คสถานะจาก LIFF SDK จริง
    const _isLoggedIn = this.lineService.isLoggedIn();
    this.isLoggedIn = _isLoggedIn;

    if (_isLoggedIn) {
      console.log('✅ User is logged in');
      this.lineProfile = await this.lineService.getProfile();

      if (this.lineProfile) {
        console.log('👤 Profile:', this.lineProfile.userId);
        const dbUser = await this.authService.syncLineProfile(this.lineProfile);
        if (dbUser) {
          this.currentRole = dbUser.role;
          console.log('🏷️ Role:', this.currentRole);
        }
      }
    } else {
      console.log('❌ User is NOT logged in. Waiting for user action.');
      this.lineProfile = null;
      this.currentRole = 'guest';
    }

    this.isLiffLoading = false;
  }

  // --- 🟢 Flow 1: Visitor Register ---
  async openVisitorRegister() {
    const modal = await this.modalCtrl.create({
      component: VisitorRegistrationModalComponent,
      // ✅ แก้ไข: ส่ง currentUserId ให้ตรงกับ @Input ใน Modal
      componentProps: { 
        currentUserId: this.lineProfile?.userId 
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    // ✅ แก้ไข: ถ้าลงทะเบียนสำเร็จ ไม่ต้องบันทึกซ้ำซ้อน แค่อัปเดต UI
    if (data?.registered) {
      this.currentRole = 'visitor'; // เปลี่ยน Role ในหน้า UI ทันที
      
      const successAlert = await this.alertCtrl.create({
        header: 'ลงทะเบียนสำเร็จ',
        message: 'คุณได้รับสิทธิ์เข้าอาคาร (Visitor) เรียบร้อยแล้ว',
        buttons: ['ตกลง']
      });
      await successAlert.present();
    }
  }

  // --- 🟠 Flow 2: KMITL Login (Mock) ---
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
    // Logic จำลอง: รหัสขึ้นต้นด้วย '6' = นักศึกษา (User), '9' = อาจารย์ (Host)
    let newRole = 'user'; 
    if (username.startsWith('9')) newRole = 'host';

    const extraData = {
      // ตรงนี้อาจจะเป็น student_id หรือ field อื่นๆ ที่คุณเพิ่มใน table profiles
      department: 'Engineering'
    };

    await this.confirmRoleChange(newRole, extraData);
  }

  // --- 🔄 Shared Logic: บันทึก Role และเปลี่ยนเมนู ---
  async confirmRoleChange(newRole: string, extraData: any) {
    const loading = await this.loadingCtrl.create({ message: 'กำลังบันทึกข้อมูล...' });
    await loading.present();

    try {
      // 1. อัปเดต DB
      const updateData = { role: newRole, ...extraData };
      if (this.lineProfile?.userId) {
         await this.authService.updateProfile(this.lineProfile.userId, updateData);
      }

      // 2. สั่งเปลี่ยน Rich Menu
      await this.lineService.switchMenu(newRole);

      // 3. อัปเดตหน้าจอ
      this.currentRole = newRole;
      
      await loading.dismiss();
      
      const successAlert = await this.alertCtrl.create({
        header: 'ลงทะเบียนสำเร็จ',
        message: `คุณได้รับสิทธิ์: ${newRole.toUpperCase()} เรียบร้อยแล้ว`,
        buttons: ['ตกลง']
      });
      await successAlert.present();

    } catch (error) {
      await loading.dismiss();
      console.error(error);
      alert('เกิดข้อผิดพลาด: ' + JSON.stringify(error));
    }
  }

  // Helper สำหรับปุ่ม Reset
  async changeRole(role: string) {
     await this.confirmRoleChange(role, {});
  }
  
  logout() {
    this.lineService.logout();
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

  // ✅ ฟังก์ชันทดสอบเปลี่ยนเมนู (Debug)
  async debugSwitchRole(role: string): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: `Switching to ${role}...` });
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
          message: `เปลี่ยนเมนูเป็น ${role} เรียบร้อย (กดปิดแล้วดูที่เมนูด้านล่าง)`,
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

  // ฟังก์ชันเปิด LINE OA
  openLineOA(): void {
    const link = this.lineService.getLineOALink();
    window.open(link, '_system');
  }

  
  
  // Trigger LINE Login/App Switch
  loginNow(): void {
    const svc: any = this.lineService as any;
    if (typeof svc.login === 'function') {
      svc.login();
    } else {
      this.lineService.initLiff();
    }
  }
}