import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
  IonIcon, IonLabel, IonAvatar, IonButton, IonSelect, IonSelectOption,
  IonCard, IonCardContent, ModalController, IonButtons, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, settingsOutline, logOutOutline, 
  qrCodeOutline, shieldCheckmarkOutline, arrowForwardOutline 
} from 'ionicons/icons';
import { VisitorRegistrationModalComponent } from '../components/ui/visitor-registration-modal/visitor-registration-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonButtons, 
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, 
    IonIcon, IonLabel, IonAvatar, IonButton, IonSelect, IonSelectOption,
    IonCard, IonCardContent, IonInput
  ]
})
export class ProfilePage implements OnInit {

  // Role จำลอง: 'user' (เจ้าของตึก), 'guest' (คนนอกที่เพิ่งโหลดแอป), 'visitor' (คนนอกที่ลงทะเบียนแล้ว)
  currentRole: string = 'user'; 
  
  inviteCode: string = '';
  visitorProfile: any = null; // เก็บข้อมูลหลังลงทะเบียนเสร็จ

  constructor(private modalCtrl: ModalController) { 
    addIcons({ personOutline, settingsOutline, logOutOutline, qrCodeOutline, shieldCheckmarkOutline, arrowForwardOutline });
  }

  ngOnInit() {
  }

  // ฟังก์ชันกดปุ่ม "ตรวจสอบ Code"
  async verifyInviteCode() {
    if (!this.inviteCode) return;
    
    // เปิด Modal ให้กรอกข้อมูลต่อ
    const modal = await this.modalCtrl.create({
      component: VisitorRegistrationModalComponent,
      componentProps: { code: this.inviteCode } // ส่ง code ไปเผื่อใช้เช็ค
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