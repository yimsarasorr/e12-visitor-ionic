import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
  IonDatetime, IonDatetimeButton, IonModal, IonButton, IonIcon, 
  IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonNote 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personAddOutline, businessOutline, calendarOutline, 
  timeOutline, checkmarkCircleOutline, mailOutline, 
  callOutline, paperPlaneOutline, informationCircleOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton,
    IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, 
    IonDatetime, IonDatetimeButton, IonModal, IonButton, IonIcon, 
    IonCard, IonCardContent, IonGrid, IonRow, IonCol
  ]
})
export class BookingsPage implements OnInit {

  // จำลองข้อมูล Host (คนที่ Login อยู่)
  hostProfile = {
    id: 'ajarn-uuid-001',
    name: 'อ.สมหมาย (Host)',
    department: 'Engineering-IoT'
  };

  // Form Model
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
      selectedZones: [] as string[]
    },
    timing: {
      date: new Date().toISOString(),
      startTime: '09:00',
      endTime: '17:00'
    }
  };

  // Mock Data: รายชื่อห้องที่ Host เลือกได้
  availableZones = [
    { id: 'Common-Area-Building-12', name: 'พื้นที่ส่วนกลาง (Common Area)' },
    { id: 'Room-405', name: 'ห้อง 405 (IoT Lab)' },
    { id: 'Room-406', name: 'ห้อง 406 (Meeting Room)' },
    { id: 'KLLC-Library', name: 'สำนักหอสมุดกลาง (KLLC)' }
  ];

  constructor() { 
    addIcons({ 
      personAddOutline, businessOutline, calendarOutline, 
      timeOutline, checkmarkCircleOutline, mailOutline, 
      callOutline, paperPlaneOutline, informationCircleOutline 
    });
  }

  ngOnInit() {
    // ตั้งค่าเริ่มต้นเป็นวันพรุ่งนี้
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.bookingForm.timing.date = tomorrow.toISOString();
  }

  generateInvite() {
    // 1. คำนวณ Timestamp
    const selectedDate = new Date(this.bookingForm.timing.date);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const startDateTime = new Date(`${dateStr}T${this.bookingForm.timing.startTime}:00`);
    const startTimestamp = Math.floor(startDateTime.getTime() / 1000);

    const endDateTime = new Date(`${dateStr}T${this.bookingForm.timing.endTime}:00`);
    const endTimestamp = Math.floor(endDateTime.getTime() / 1000);
    
    const now = new Date();
    const createTimestamp = Math.floor(now.getTime() / 1000);

    // 2. สร้าง JSON Payload
    const finalPayload = {
      visitId: `vis-${this.uuidv4()}`,
      inviteCode: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      hostId: this.hostProfile.id,
      hostDepartment: this.hostProfile.department,
      visitorProfile: {
        visitorId: `user-temp-${Math.floor(Math.random() * 1000)}`,
        firstName: this.bookingForm.visitor.firstName,
        lastName: this.bookingForm.visitor.lastName,
        email: this.bookingForm.visitor.email,
        phone: this.bookingForm.visitor.phone,
        company: this.bookingForm.visitor.company
      },
      accessScope: {
        buildingId: this.bookingForm.access.buildingId,
        passType: this.bookingForm.access.passType,
        authorizedZones: this.bookingForm.access.selectedZones
      },
      status: "1",
      statusDescription: "pending_approval",
      validStartTimeStamp: startTimestamp,
      validStartDateLocal: dateStr,
      validStartTimeLocal: `${this.bookingForm.timing.startTime}:00`,
      validEndTimeStamp: endTimestamp,
      validEndDateLocal: dateStr,
      validEndTimeLocal: `${this.bookingForm.timing.endTime}:00`,
      createdAtTimeStamp: createTimestamp,
      createdAtDateLocal: now.toISOString().split('T')[0],
      createdAtTimeLocal: now.toTimeString().split(' ')[0],
      timeZoneOffset: "+07:00",
      credential: {
        type: "FACE_RECOGNITION"
      }
    };

    console.log('--- GENERATED INVITE JSON ---');
    console.log(JSON.stringify(finalPayload, null, 2));
    alert('สร้างคำเชิญเรียบร้อย! (ตรวจสอบใน Console)');
  }

  private uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}