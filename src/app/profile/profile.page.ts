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
  personOutline, globeOutline
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
  isLiffLoading = false;
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
      personOutline, globeOutline
    });
  }

  async ngOnInit() {
    await this.initData();
  }

  private async initData() {
    this.isLiffLoading = true;
    try {
      await this.lineService.initLiff();
      if (this.lineService.isLoggedIn()) {
        console.log('User is already logged in LINE.');
        await this.fetchUserProfile();
      } else {
        console.log('User is NOT logged in. Show Landing Page.');
      }
    } catch (error) {
      console.error('LIFF Init Error:', error);
    } finally {
      this.isLiffLoading = false;
    }
  }

  async loginWithLine() {
    this.lineService.login();
  }

  async continueAsGuest() {
    this.lineProfile = {
      userId: this.generateGuestId(),
      displayName: 'Guest User',
      pictureUrl: 'assets/shapes.svg'
    };
    this.isLoggedIn = true;
    this.currentRole = 'guest';
    await this.ensureGuestProfileRecord();
  }

  async fetchUserProfile() {
    this.lineProfile = await this.lineService.getProfile();
    if (this.lineProfile) {
      this.isLoggedIn = true;
      const dbUser = await this.authService.syncLineProfile(this.lineProfile);
      if (dbUser?.role) this.currentRole = dbUser.role;
    }
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

  // ฟังก์ชันเปิด LINE OA (ลิงก์ External)
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

  private generateGuestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `guest-${crypto.randomUUID()}`;
    }
    return `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  private async ensureGuestProfileRecord(): Promise<void> {
    if (!this.lineProfile?.userId) return;
    try {
      await this.authService.syncLineProfile({
        userId: this.lineProfile.userId,
        displayName: this.lineProfile.displayName,
        pictureUrl: this.lineProfile.pictureUrl
      });
    } catch (error) {
      console.warn('Guest profile sync failed', error);
    }
  }

  segmentChanged(ev: any) {
    this.selectedTab = ev.detail.value;
  }
}