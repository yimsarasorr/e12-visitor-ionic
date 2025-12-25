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
      selectedZones: ['Common-Area-Building-12', 'Room-405'] 
    },
    timing: { 
      date: new Date().toISOString(), 
      startTime: '08:00',
      endTime: '18:00' 
    }
  };

  // State สำหรับล็อคเวลา
  isTimeLocked = false;

  constructor(private modalCtrl: ModalController) {
    addIcons({ 
      personAddOutline, businessOutline, calendarOutline, 
      timeOutline, checkmarkCircleOutline, mailOutline, 
      callOutline, paperPlaneOutline, informationCircleOutline, closeOutline,
      personOutline, locationOutline, keyOutline
    });
  }

  ngOnInit() {
    this.onPassTypeChange(); // เรียกครั้งแรกเพื่อ set ค่าเริ่มต้น
  }

  close() {
    this.modalCtrl.dismiss();
  }

  // ปรับเวลาอัตโนมัติเมื่อเลือก Pass Type
  onPassTypeChange() {
    const type = this.bookingForm.access.passType;
    if (type === '1-Day Pass') {
      this.bookingForm.timing.startTime = '00:00';
      this.bookingForm.timing.endTime = '23:59';
      this.isTimeLocked = true;
    } else if (type === 'Business Hours') {
      this.bookingForm.timing.startTime = '08:00';
      this.bookingForm.timing.endTime = '17:00';
      this.isTimeLocked = true;
    } else {
      // 1-Time Pass หรืออื่นๆ ให้ปรับเองได้
      this.isTimeLocked = false;
    }
  }

  // --- Main Logic: Generate JSON ---
  submitInvite() {
    const { visitor, access, timing } = this.bookingForm;

    // 1) Prepare Date Objects
    const dateStr = timing.date.split('T')[0];
    const tAny = timing as any;
    const startTimeStr = (tAny.timing_startTime ?? timing.startTime);
    const endTimeStr = (tAny.timing_endTime ?? timing.endTime);

    const startDateObj = new Date(`${dateStr}T${startTimeStr}:00`);
    const endDateObj = new Date(`${dateStr}T${endTimeStr}:59`);
    const nowObj = new Date();

    // 2) Timestamps (Seconds)
    const validStartTimeStamp = Math.floor(startDateObj.getTime() / 1000);
    const validEndTimeStamp = Math.floor(endDateObj.getTime() / 1000);
    const createdAtTimeStamp = Math.floor(nowObj.getTime() / 1000);

    // 3) Local time strings (HH:mm:ss)
    const startTimeLocal = startTimeStr.length === 5 ? `${startTimeStr}:00` : startTimeStr;
    const endTimeLocal = endTimeStr.length === 5 ? `${endTimeStr}:59` : endTimeStr;
    const createdAtTimeLocal = nowObj.toTimeString().split(' ')[0];

    // 4) Payload ตามเทมเพลต
    const payload = {
      visitId: `vis-${this.uuidv4()}`,
      inviteCode: `INV-${this.generateInviteCode()}`,

      hostId: 'ajarn-uuid-001',
      hostDepartment: 'Engineering-IoT',

      visitorProfile: {
        visitorId: `user-${this.uuidv4()}`,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        email: visitor.email,
        phone: visitor.phone,
        company: visitor.company
      },

      accessScope: {
        buildingId: access.buildingId,
        passType: access.passType,
        authorizedZones: access.selectedZones
      },

      status: '1',
      statusDescription: 'pending_approval',

      validStartTimeStamp: validStartTimeStamp,
      validStartDateLocal: dateStr,
      validStartTimeLocal: startTimeLocal,

      validEndTimeStamp: validEndTimeStamp,
      validEndDateLocal: dateStr,
      validEndTimeLocal: endTimeLocal,

      createdAtTimeStamp: createdAtTimeStamp,
      createdAtDateLocal: nowObj.toISOString().split('T')[0],
      createdAtTimeLocal: createdAtTimeLocal,

      timeZoneOffset: '+07:00',

      credential: {
        type: 'FACE_RECOGNITION'
      }
    };

    console.group('Creating Invite Payload');
    console.log(JSON.stringify(payload, null, 2));
    console.groupEnd();

    this.modalCtrl.dismiss({ created: true, payload });
  }

  // Helpers
  private uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}