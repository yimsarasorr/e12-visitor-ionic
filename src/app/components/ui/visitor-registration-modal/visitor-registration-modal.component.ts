import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, 
  IonIcon, IonItem, IonLabel, IonInput, IonNote, ModalController,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
// ✅ เพิ่ม mailOutline
import { closeOutline, personOutline, businessOutline, callOutline, checkmarkCircleOutline, mailOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-visitor-registration-modal',
  standalone: true,
  templateUrl: './visitor-registration-modal.component.html',
  styleUrls: ['./visitor-registration-modal.component.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonIcon, IonItem, IonInput, IonSpinner
]
})
export class VisitorRegistrationModalComponent implements OnInit {
  
  @Input() currentUserId: string = '';
  step: 'form' | 'success' = 'form';
  isLoading = false;

  formData = {
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    email: ''
  };

  constructor(
    private modalCtrl: ModalController,
    private authService: AuthService
  ) {
    // ✅ เพิ่ม mailOutline
    addIcons({ closeOutline, personOutline, businessOutline, callOutline, checkmarkCircleOutline, mailOutline });
  }

  ngOnInit() {
    this.formData.company = 'Partner Co., Ltd.';
    console.log('Current User ID:', this.currentUserId);
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async submitRegistration() {
    if (!this.currentUserId) {
      console.error('ไม่พบ User ID ไม่สามารถบันทึกข้อมูลได้');
      alert('ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    this.isLoading = true;
    try {
      const updateData = {
        full_name: `${this.formData.firstName} ${this.formData.lastName}`, // รวมชื่อ-นามสกุล
        phone_number: this.formData.phone, // ใช้ชื่อ column ให้ตรง DB
        company: this.formData.company,
        email: this.formData.email, // ✅ เพิ่ม Email
        role: 'visitor',
        updated_at: new Date()
      };

      // 1. บันทึกข้อมูลลง DB
      const profileResult = await this.authService.updateProfile(this.currentUserId, updateData);
      if (!profileResult) throw new Error('Update profile failed');

      // 2. เปลี่ยน Rich Menu
      await this.authService.changeRichMenu(this.currentUserId, 'visitor');

      // 3. เปลี่ยนสถานะหน้าจอ
      this.step = 'success';

    } catch (error) {
      console.error('Registration Error:', error);
      alert('เกิดข้อผิดพลาด: ' + JSON.stringify(error));
    } finally {
      this.isLoading = false;
    }
  }

  finish() {
    this.modalCtrl.dismiss({ 
      registered: true,
      visitorData: this.formData 
    });
  }
}