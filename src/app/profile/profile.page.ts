import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonIcon, IonLabel, IonAvatar, IonButton, IonSelect, IonSelectOption, 
  IonCard, IonCardContent, ModalController, IonButtons, IonInput, 
  IonSpinner, IonCardHeader, IonCardTitle, 
  LoadingController // ✅ 1. เพิ่ม LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, settingsOutline, logOutOutline, 
  qrCodeOutline, shieldCheckmarkOutline, arrowForwardOutline,
  peopleOutline, briefcaseOutline // ✅ (Optional) เพิ่มไอคอนสำหรับปุ่มเมนูใหม่
} from 'ionicons/icons';
import { VisitorRegistrationModalComponent } from '../components/ui/visitor-registration-modal/visitor-registration-modal.component';
import { LineService } from '../services/line.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonCardTitle, IonButtons, CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
    IonIcon, IonLabel, IonAvatar, IonButton, IonSelect, IonSelectOption,
    IonCard, IonCardContent, IonInput, IonCardHeader
  ]
})
export class ProfilePage implements OnInit {

  currentRole: string = 'user'; 
  inviteCode: string = '';
  visitorProfile: any = null;
  isLiffLoading = false;
  lineProfile: any = null;

  constructor(
    private modalCtrl: ModalController,
    private lineService: LineService,
    private loadingCtrl: LoadingController // ✅ 2. Inject LoadingController
  ) { 
    // เพิ่ม icon ให้ครบตามที่ HTML ใช้อาจจะดีครับ
    addIcons({ 
      personOutline, settingsOutline, logOutOutline, 
      qrCodeOutline, shieldCheckmarkOutline, arrowForwardOutline,
      peopleOutline, briefcaseOutline 
    });
  }

  async ngOnInit() {
    await this.checkLineContext();
  }

  async checkLineContext() {
    this.isLiffLoading = true;
    await this.lineService.initLiff();
    
    const codeFromUrl = this.lineService.getInviteCodeFromUrl();

    if (this.lineService.isInClient()) {
      console.log('📱 Running inside LINE App');
      this.lineProfile = await this.lineService.getProfile();

      if (codeFromUrl) {
        this.handleGuestFlow(codeFromUrl);
      } else {
        this.currentRole = 'visitor';
        this.mockVisitorDataFromLine();
      }
    } else {
      console.log('💻 Running in Browser');
      if (codeFromUrl) {
        this.handleGuestFlow(codeFromUrl);
      }
    }

    this.isLiffLoading = false;
  }

  handleGuestFlow(code: string) {
    console.log('🎫 Found Invite Code:', code);
    this.currentRole = 'guest';
    this.inviteCode = code;
    setTimeout(() => {
      this.verifyInviteCode();
    }, 500);
  }

  mockVisitorDataFromLine() {
    if (this.lineProfile) {
      this.visitorProfile = {
        firstName: this.lineProfile.displayName,
        lastName: '(LINE)',
        company: 'Via LINE App',
        pictureUrl: this.lineProfile.pictureUrl
      };
    }
  }

  async verifyInviteCode() {
    if (!this.inviteCode) return;
    const modal = await this.modalCtrl.create({
      component: VisitorRegistrationModalComponent,
      componentProps: {
        code: this.inviteCode,
        lineData: this.lineProfile
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.registered) {
      this.currentRole = 'visitor';
      this.visitorProfile = data.visitorData;
    }
  }

  resetToGuest() {
    this.currentRole = 'guest';
    this.inviteCode = '';
    this.visitorProfile = null;
    this.lineProfile = null;
  }

  // ✅ 3. ฟังก์ชัน changeRole ที่หายไป (ใส่ไว้ท้ายสุดก่อนปิด Class)
  async changeRole(roleName: string) {
    // แสดง Loading
    const loading = await this.loadingCtrl.create({
      message: `กำลังเปลี่ยนเมนูเป็น ${roleName}...`,
      duration: 3000
    });
    await loading.present();

    try {
      // เรียก Service ยิงไป Supabase
      const success = await this.lineService.switchMenu(roleName);
      
      await loading.dismiss();

      if (success) {
        // ถ้าสำเร็จ ปิดหน้า LIFF เพื่อให้ User เห็นเมนูใหม่
        this.lineService.closeWindow();
      } else {
        alert('เปลี่ยนเมนูไม่สำเร็จ กรุณาลองใหม่');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('Change Role Error:', error);
      alert('เกิดข้อผิดพลาด: ' + JSON.stringify(error));
    }
  }

}