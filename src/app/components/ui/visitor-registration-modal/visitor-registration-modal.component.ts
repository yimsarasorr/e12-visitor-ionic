import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, 
  IonIcon, IonItem, IonLabel, IonInput, IonNote, ModalController,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, personOutline, businessOutline, callOutline, checkmarkCircleOutline } from 'ionicons/icons';

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

  constructor(private modalCtrl: ModalController) {
    addIcons({ closeOutline, personOutline, businessOutline, callOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    // สมมติ: ดึงข้อมูลบางส่วนจาก Invite Code (ถ้ามี)
    // ในสถานการณ์จริง API จะ return ข้อมูลบางอย่างมาให้
    this.formData.company = 'Partner Co., Ltd.'; // Host อาจจะระบุบริษัทมาแล้ว
  }

  close() {
    this.modalCtrl.dismiss();
  }

  submitRegistration() {
    this.isLoading = true;
    
    // Simulate API Call
    setTimeout(() => {
      this.isLoading = false;
      this.step = 'success';
    }, 1500);
  }

  finish() {
    // ส่งข้อมูลกลับไปบอกหน้า Profile ว่าลงทะเบียนเสร็จแล้ว
    this.modalCtrl.dismiss({ 
      registered: true,
      visitorData: this.formData 
    });
  }
}