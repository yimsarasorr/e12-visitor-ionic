import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, 
  IonIcon, IonSearchbar, IonCard, IonItem, IonLabel, 
  IonAvatar, IonBadge, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronBackOutline, searchOutline, addOutline, 
  timeOutline, calendarOutline
} from 'ionicons/icons';
import { CreateInviteModalComponent } from '../components/ui/create-invite-modal/create-invite-modal.component';

interface CalendarDate {
  dateObj: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  fullDate: string;
}

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, 
    IonIcon, IonSearchbar, IonCard, IonItem, IonLabel, 
    IonAvatar, IonBadge
  ],
  providers: [DatePipe]
})
export class BookingsPage implements OnInit {
  
  calendarDates: CalendarDate[] = [];
  selectedDate: string = '';
  showSearch = false;
  
  // Mock Data (ใส่ให้ครบ Type)
  allBookings: any[] = [
    {
      id: 1,
      visitorName: 'สมชาย เข็มกลัด',
      company: 'Digital Agency Co.',
      time: '10:00 - 12:00',
      status: 'pending',
      date: '2025-12-24',
      avatar: 'https://i.pravatar.cc/150?u=1'
    },
    {
      id: 2,
      visitorName: 'Dr. Strange',
      company: 'Marvel Studio',
      time: '13:00 - 16:00',
      status: 'approved',
      date: '2025-12-24',
      avatar: 'https://i.pravatar.cc/150?u=2'
    },
    {
      id: 3,
      visitorName: 'Tony Stark',
      company: 'Stark Industries',
      time: '09:00 - 10:00',
      status: 'expired',
      date: '2025-12-22',
      avatar: 'https://i.pravatar.cc/150?u=3'
    }
  ];

  filteredBookings: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private datePipe: DatePipe
  ) { 
    addIcons({ chevronBackOutline, searchOutline, addOutline, timeOutline, calendarOutline });
  }

  ngOnInit() {
    this.generateCalendar();
    // Default select today
    const today = new Date().toISOString().split('T')[0];
    // ถ้าวันนี้ไม่มีใน List (เช่นวันหยุด) ให้เลือกวันแรกของ List แทนก็ได้
    this.selectDate(today);
  }

  generateCalendar() {
    this.calendarDates = [];
    const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 2); 

    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      
      const dateStr = d.toISOString().split('T')[0];
      const isToday = dateStr === today.toISOString().split('T')[0];

      this.calendarDates.push({
        dateObj: d,
        dayName: days[d.getDay()],
        dayNumber: d.getDate().toString(),
        isToday: isToday,
        fullDate: dateStr
      });
    }
  }

  selectDate(dateStr: string) {
    this.selectedDate = dateStr;
    this.filterBookings();
  }

  filterBookings() {
    this.filteredBookings = this.allBookings.filter(b => b.date === this.selectedDate);
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'active': return 'primary'; 
      case 'expired': return 'medium';
      default: return 'medium';
    }
  }

  getStatusLabel(status: string) {
    switch (status) {
      case 'approved': return 'อนุมัติแล้ว';
      case 'pending': return 'รออนุมัติ';
      case 'active': return 'Check-in แล้ว';
      case 'expired': return 'หมดอายุ';
      default: return status;
    }
  }

  async openCreateModal() {
    const modal = await this.modalCtrl.create({
      component: CreateInviteModalComponent,
      presentingElement: await this.modalCtrl.getTop() || undefined,
      canDismiss: true,
      breakpoints: [0, 1], 
      initialBreakpoint: 1, 
      mode: 'ios' 
    });

    await modal.present();
    
    const { data } = await modal.onWillDismiss();
    if (data?.created) {
      console.log('New invite created, refreshing list...');
    }
  }
}