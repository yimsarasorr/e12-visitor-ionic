import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, 
  IonIcon, IonItem, IonLabel, IonInput, IonNote, ModalController,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, personOutline, businessOutline, callOutline, checkmarkCircleOutline } from 'ionicons/icons';
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

  // Mock Data: สมมติว่า Host กรอกมาให้แค่นี้ (Visitor ต้องกรอกเพิ่มเอง)
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
    addIcons({ closeOutline, personOutline, businessOutline, callOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    // สมมติ: ดึงข้อมูลบางส่วนจาก Invite Code (ถ้ามี)
    // ในสถานการณ์จริง API จะ return ข้อมูลบางอย่างมาให้
    this.formData.company = 'Partner Co., Ltd.'; // Host อาจจะระบุบริษัทมาแล้ว
    console.log('Current User ID:', this.currentUserId);
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async submitRegistration() {
    if (!this.currentUserId) {
      console.error('ไม่พบ User ID ไม่สามารถบันทึกข้อมูลได้');
      return;
    }

    this.isLoading = true;
    try {
      const updateData = {
        first_name: this.formData.firstName,
        last_name: this.formData.lastName,
        phone: this.formData.phone,
        company: this.formData.company,
        role: 'visitor',
        updated_at: new Date()
      };

      const profileResult = await this.authService.updateProfile(this.currentUserId, updateData);
      if (!profileResult) throw new Error('Update profile failed');

      await this.authService.changeRichMenu(this.currentUserId, 'visitor');
      this.step = 'success';
    } catch (error) {
      console.error('Registration Error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  finish() {
    // ส่งข้อมูลกลับไปบอกหน้า Profile ว่าลงทะเบียนเสร็จแล้ว
    this.modalCtrl.dismiss({ 
      registered: true,
      visitorData: this.formData 
    });
  }
}