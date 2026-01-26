import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonIcon, IonLabel, IonAvatar, IonButton, IonCard, IonCardContent, 
  IonBadge, IonCardHeader, IonCardSubtitle, IonNote, 
  ModalController, LoadingController, AlertController, IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, schoolOutline, logOutOutline, cardOutline } from 'ionicons/icons';

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

  constructor(
    private lineService: LineService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) { 
    addIcons({ peopleOutline, schoolOutline, logOutOutline, cardOutline });
  }

  async ngOnInit() {
    await this.initData();
  }

  async initData() {
    this.isLiffLoading = true;
    // 1. Init LIFF
    await this.lineService.initLiff();
    
    if (this.lineService.isInClient()) {
      // 2. ดึง Profile จาก LINE
      this.lineProfile = await this.lineService.getProfile();
      
      if (this.lineProfile) {
        // 3. Sync กับ Database เพื่อดู Role ปัจจุบัน
        // (AuthService ที่เราแก้แล้ว จะเช็คให้ว่ามี user ไหม ถ้าไม่มีก็สร้างให้เป็น guest)
        const dbUser = await this.authService.syncLineProfile(this.lineProfile);
        
        if (dbUser) {
          this.currentRole = dbUser.role; // อัปเดต Role ตาม DB
          console.log('✅ Current Role form DB:', this.currentRole);
        }
      }
    } else {
      console.log('💻 Running in Browser');
      // Mock data for browser testing
      this.lineProfile = { displayName: 'Browser Test', pictureUrl: '', userId: 'test_browser' };
    }
    this.isLiffLoading = false;
  }

  // --- 🟢 Flow 1: Visitor Register ---
  async openVisitorRegister() {
    const modal = await this.modalCtrl.create({
      component: VisitorRegistrationModalComponent,
      componentProps: { lineData: this.lineProfile }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data?.registered) {
      const visitorForm = data.visitorData;

      const dbPayload = {
        full_name: `${visitorForm.firstName} ${visitorForm.lastName}`,
        phone_number: visitorForm.phone,
        company: visitorForm.company,
        email: visitorForm.email,
        role: 'visitor'
      };

      await this.confirmRoleChange('visitor', dbPayload);
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
      
      // ปิดหน้า LIFF ให้อัตโนมัติ เพื่อให้ User เห็นเมนูใหม่
      // this.lineService.closeWindow(); 

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
  }

  getRoleColor(role: string) {
    switch (role) {
      case 'visitor': return 'success';
      case 'host': return 'primary';
      case 'user': return 'tertiary';
      default: return 'medium';
    }
  }
}