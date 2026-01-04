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
    IonCard, IonCardContent, IonInput]
})
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
    // 3. เริ่มกระบวนการเช็ค LIFF
    this.checkLineContext();
  }

  async checkLineContext() {
    this.isLiffLoading = true;

    // Init LIFF
    await this.lineService.initLiff();

    // เช็คว่าเปิดใน LINE จริงไหม?
    if (this.lineService.isInClient()) {
      console.log('✅ Running inside LINE App');

      // ดึงข้อมูล User (Binding LINE ID)
      this.lineProfile = await this.lineService.getProfile();
      console.log('Visitor LINE Profile:', this.lineProfile);

      // ดึง Invite Code จาก URL (?code=...)
      const codeFromUrl = this.lineService.getInviteCodeFromUrl();

      if (codeFromUrl) {
        console.log('🎫 Found Invite Code:', codeFromUrl);

        // Auto Switch to Guest Flow
        this.currentRole = 'guest';
        this.inviteCode = codeFromUrl;

        // Auto Open Modal (UX: เด้งฟอร์มให้กรอกเลย)
        setTimeout(() => {
          this.verifyInviteCode();
        }, 500);
      } else {
        // ถ้าเปิดใน LINE แต่ไม่มี Code -> สมมติเป็น Visitor (Demo)
        this.currentRole = 'visitor';

        // Mock ข้อมูลจาก LINE Profile มาแสดง
        if (this.lineProfile) {
          this.visitorProfile = {
            firstName: this.lineProfile.displayName,
            lastName: '(LINE)',
            company: 'Via LINE App'
          };
        }
      }
    } else {
      console.log('💻 Running in Browser / Normal App');
      // ปล่อยค่า Default
    }

    this.isLiffLoading = false;
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
  }
}