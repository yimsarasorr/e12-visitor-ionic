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
  
  // ✅ เพิ่มตัวแปรเช็คสถานะ login ให้ UI ใช้
  isLoggedIn = false;

  constructor(
    private lineService: LineService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { 
    // ✅ เพิ่ม icon logInOutline สำหรับปุ่ม Login
    addIcons({logOutOutline, logInOutline, peopleOutline, schoolOutline, cardOutline, chatbubblesOutline});
  }

  async ngOnInit() {
    await this.initData();
  }

  async initData() {
    this.isLiffLoading = true;
    await this.lineService.initLiff();
    
    // ✅ แก้ไขใหม่: เช็คสถานะจริงจาก LIFF SDK อย่างเดียว (ไม่สนว่าเป็น Browser หรือ App)
    // ถ้าเคย Login ค้างไว้ ค่านี้จะเป็น true, ถ้าไม่เคย หรือ Logout แล้วจะเป็น false
    this.isLoggedIn = this.lineService.isLoggedIn();

    if (this.isLoggedIn) {
      // 🟢 กรณี Login อยู่จริง (ดึงข้อมูลจริง)
      console.log('✅ User is logged in (LIFF)');
      
      try {
        this.lineProfile = await this.lineService.getProfile();
        
        if (this.lineProfile) {
          // Sync ลง Database
          const dbUser = await this.authService.syncLineProfile(this.lineProfile);
          if (dbUser) {
            this.currentRole = dbUser.role;
            console.log('✅ Current Role form DB:', this.currentRole);
          }
        }
      } catch (error) {
        console.error('Error getting profile:', error);
      }
    } else {
      // 🔴 กรณีไม่ได้ Login (Browser จะตกมาที่นี่ และ HTML จะโชว์ปุ่ม Login)
      console.log('❌ User is NOT logged in. Waiting for user action.');
      this.lineProfile = null;
      this.currentRole = 'guest';
    }
    
    this.isLiffLoading = false;
  }

  // ✅ เพิ่มฟังก์ชันนี้เพื่อให้ปุ่ม "เข้าสู่ระบบด้วย LINE" ใน HTML เรียกใช้
  loginNow() {
    // เรียกฟังก์ชัน login ใน service (ที่มี redirectUri)
    this.lineService.login(); 
  }

  // --- 🟢 Flow 1: Visitor Register ---
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

  async changeRole(role: string) {
     await this.confirmRoleChange(role, {});
  }
  
  logout() {
    this.lineService.logout();
    // เพิ่ม reload เพื่อเคลียร์ state หน้าจอ
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
          message: `เปลี่ยนเมนูเป็น ${role} เรียบร้อย`,
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

  openLineOA(): void {
    const link = this.lineService.getLineOALink();
    window.open(link, '_system');
  }
}