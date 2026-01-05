import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonIcon, IonLabel, IonAvatar, IonButton, IonSelect, IonSelectOption,
  IonCard, IonCardContent, ModalController, IonButtons, IonInput, IonSpinner // เพิ่ม IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, settingsOutline, logOutOutline, 
  qrCodeOutline, shieldCheckmarkOutline, arrowForwardOutline 
} from 'ionicons/icons';
import { VisitorRegistrationModalComponent } from '../components/ui/visitor-registration-modal/visitor-registration-modal.component';
import { LineService } from '../services/line.service'; // 1. Import Service

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonButtons,
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem,
    IonIcon, IonLabel, IonAvatar, IonButton, IonSelect, IonSelectOption,
    IonCard, IonCardContent, IonInput, IonSpinner // เพิ่ม IonSpinner
  ]
})
// Profile Page
export class ProfilePage implements OnInit {

  // Role จำลอง: 'user' (เจ้าของตึก), 'guest' (คนนอกที่เพิ่งโหลดแอป), 'visitor' (คนนอกที่ลงทะเบียนแล้ว)
  currentRole: string = 'user'; 
  
  inviteCode: string = '';
  visitorProfile: any = null;

  // ตัวแปรเช็คสถานะการโหลด LIFF
  isLiffLoading = false;
  lineProfile: any = null;

  constructor(
    private modalCtrl: ModalController,
    private lineService: LineService // 2. Inject Service
  ) { 
    addIcons({ personOutline, settingsOutline, logOutOutline, qrCodeOutline, shieldCheckmarkOutline, arrowForwardOutline });
  }

  async ngOnInit() {
    // เริ่มเช็ค LIFF ทันทีที่เข้าหน้า Profile
    await this.checkLineContext(); // เพิ่ม await
  }

  async checkLineContext() {
    this.isLiffLoading = true;

    // Init LIFF
    await this.lineService.initLiff();

    // ดึง Invite Code จาก URL (?code=...) ทำงานได้ทั้ง LINE และ Browser
    const codeFromUrl = this.lineService.getInviteCodeFromUrl();

    // เช็คว่าเปิดใน LINE จริงไหม?
    if (this.lineService.isInClient()) {
      console.log('📱 Running inside LINE App');

      // ดึงข้อมูล User (Binding LINE ID)
      this.lineProfile = await this.lineService.getProfile();

      if (codeFromUrl) {
        // CASE A: มี Code -> เข้าโหมด Guest และเปิดลงทะเบียน
        this.handleGuestFlow(codeFromUrl);
      } else {
        // CASE B: ไม่มี Code -> สมมติเป็น Visitor ที่เข้าดูบัตร
        this.currentRole = 'visitor';
        this.mockVisitorDataFromLine();
      }
    } else {
      console.log('💻 Running in Browser');
      // Browser ก็จำลองด้วย ?code=... ได้
      if (codeFromUrl) {
        this.handleGuestFlow(codeFromUrl);
      }
    }

    this.isLiffLoading = false;
  }

  // แยก Logic การเข้าโหมด Guest
  handleGuestFlow(code: string) {
    console.log('🎫 Found Invite Code:', code);
    this.currentRole = 'guest';
    this.inviteCode = code;

    // Auto-open Modal (รอ UI Render เล็กน้อย)
    setTimeout(() => {
      this.verifyInviteCode();
    }, 500);
  }

  // สร้างข้อมูล Visitor จำลองจาก LINE Profile
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

  // ฟังก์ชันกดปุ่ม "ตรวจสอบ Code"
  async verifyInviteCode() {
    if (!this.inviteCode) return;

    // เปิด Modal ให้กรอกข้อมูลต่อ
    const modal = await this.modalCtrl.create({
      component: VisitorRegistrationModalComponent,
      componentProps: {
        code: this.inviteCode,
        // ส่งข้อมูล LINE Profile เข้าไปใน Modal ด้วย
        lineData: this.lineProfile
      }
    });

    await modal.present();

    // รอรับผลลัพธ์เมื่อ Modal ปิด
    const { data } = await modal.onWillDismiss();
    
    if (data?.registered) {
      // เปลี่ยนสถานะเป็น Visitor เต็มตัว
      this.currentRole = 'visitor';
      this.visitorProfile = data.visitorData;
    }
  }

  // Mock Reset กลับไปเป็น Guest (เผื่อกดเล่น)
  resetToGuest() {
    this.currentRole = 'guest';
    this.inviteCode = '';
    this.visitorProfile = null;
    this.lineProfile = null; // เคลียร์โปรไฟล์ LINE
  }
}