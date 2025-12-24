import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonLabel, IonInput, IonSelect, IonSelectOption, IonDatetime, 
  IonButton, IonIcon, IonCard, IonCardContent, IonGrid, IonRow, IonCol,
  IonButtons, IonDatetimeButton, IonModal, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personAddOutline, businessOutline, calendarOutline, 
  timeOutline, checkmarkCircleOutline, mailOutline, 
  callOutline, paperPlaneOutline, informationCircleOutline, closeOutline,
  personOutline, locationOutline, keyOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-create-invite-modal',
  standalone: true,
  templateUrl: './create-invite-modal.component.html',
  styleUrls: ['./create-invite-modal.component.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
    IonLabel, IonInput, IonSelect, IonSelectOption, IonDatetime, 
    IonButton, IonIcon, IonCard, IonCardContent, IonGrid, IonRow, IonCol,
    IonButtons, IonDatetimeButton, IonModal
  ]
})
export class CreateInviteModalComponent implements OnInit {
  
  // Form Data Structure
  bookingForm = {
    visitor: { 
      firstName: '', 
      lastName: '', 
      email: '', 
      phone: '', 
      company: '' 
    },
    access: { 
      buildingId: 'BLD-12', 
      passType: '1-Day Pass', 
      selectedZones: [] 
    },
    timing: { 
      date: new Date().toISOString(), 
      startTime: '09:00', 
      endTime: '17:00' 
    }
  };

  constructor(private modalCtrl: ModalController) {
    addIcons({ 
      personAddOutline, businessOutline, calendarOutline, 
      timeOutline, checkmarkCircleOutline, mailOutline, 
      callOutline, paperPlaneOutline, informationCircleOutline, closeOutline,
      personOutline, locationOutline, keyOutline
    });
  }

  ngOnInit() {}

  close() {
    this.modalCtrl.dismiss();
  }

  submitInvite() {
    console.log('Submitting Invite...', this.bookingForm);
    // Logic การบันทึก หรือส่ง API
    this.modalCtrl.dismiss({ created: true });
  }
}