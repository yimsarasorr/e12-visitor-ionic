import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonCard, IonItem, IonLabel,
  IonAvatar, IonBadge, ModalController, GestureController, Gesture, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, timeOutline, calendarOutline } from 'ionicons/icons';
import { FastpassHeaderComponent } from '../components/ui/fastpass-header/fastpass-header.component';
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
  imports: [IonFabButton, IonFab, 
    CommonModule, FormsModule,
    IonContent, IonIcon, IonCard, IonItem, IonLabel,
    IonAvatar, IonBadge,
    FastpassHeaderComponent
  ]
})
export class BookingsPage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('calendarStrip', { read: ElementRef }) calendarStripRef!: ElementRef;
  private gesture?: Gesture;

  currentWeekStart: Date = new Date(); // วันอาทิตย์เริ่มต้นของสัปดาห์
  weekDays: CalendarDate[] = [];
  selectedDate: string = '';
  currentMonthLabel: string = '';

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
    private gestureCtrl: GestureController
  ) {
    addIcons({ addOutline, timeOutline, calendarOutline });
  }

  ngOnInit() {
    // หาวันอาทิตย์เริ่มต้นสัปดาห์ของวันนี้
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) - 6 (Sat)
    this.currentWeekStart = new Date(today);
    this.currentWeekStart.setDate(today.getDate() - day);

    this.generateWeekView();
    this.selectDate(today.toISOString().split('T')[0]);
  }

  // เริ่มระบบปัดหลัง View โหลดเสร็จ (ต้องมี #calendarStrip ใน HTML บนคอมโพเนนต์แถบสัปดาห์)
  ngAfterViewInit() {
    this.initSwipeGesture();
  }

  ngOnDestroy() {
    if (this.gesture) this.gesture.destroy();
  }

  // สร้างระบบปัดซ้าย/ขวา เพื่อเปลี่ยนสัปดาห์
  initSwipeGesture() {
    if (!this.calendarStripRef) return;

    this.gesture = this.gestureCtrl.create({
      el: this.calendarStripRef.nativeElement,
      gestureName: 'swipe-calendar',
      threshold: 15,
      direction: 'x',
      onEnd: (ev) => {
        if (ev.deltaX < -50) {
          this.nextWeek();
        } else if (ev.deltaX > 50) {
          this.prevWeek();
        }
      }
    });
    this.gesture.enable(true);
  }

  // สร้าง 7 วัน (อา-ส) และอัพเดต month label
  generateWeekView() {
    this.weekDays = [];
    const daysTh = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const todayStr = new Date().toISOString().split('T')[0];

    const midWeek = new Date(this.currentWeekStart);
    midWeek.setDate(midWeek.getDate() + 3);
    this.currentMonthLabel = midWeek.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    for (let i = 0; i < 7; i++) {
      const d = new Date(this.currentWeekStart);
      d.setDate(this.currentWeekStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      this.weekDays.push({
        dateObj: d,
        dayName: daysTh[d.getDay()],
        dayNumber: d.getDate().toString(),
        isToday: dateStr === todayStr,
        fullDate: dateStr
      });
    }

    // ถ้า selectedDate ไม่อยู่ในสัปดาห์นี้ ให้เลือกวันแรก (อาทิตย์)
    if (!this.weekDays.find(w => w.fullDate === this.selectedDate)) {
      this.selectDate(this.weekDays[0]?.fullDate || todayStr);
    }
  }

  // เลื่อนสัปดาห์ย้อนหลัง
  prevWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.generateWeekView();
  }

  // เลื่อนสัปดาห์ถัดไป
  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.generateWeekView();
  }

  selectDate(dateStr: string) {
    this.selectedDate = dateStr;
    this.filterBookings();
  }

  filterBookings() {
    this.filteredBookings = this.allBookings.filter(b => b.date === this.selectedDate);
  }

  // คืน Label สถานะที่หายไป
  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'อนุมัติแล้ว';
      case 'pending': return 'รออนุมัติ';
      case 'active': return 'Check-in แล้ว';
      case 'expired': return 'หมดอายุ';
      default: return status;
    }
  }

  // ปรับให้เรียบง่าย
  getStatusColor(status: string): string {
    // เรียบง่ายตาม requirement
    return status === 'pending' ? 'warning' : status === 'expired' ? 'medium' : 'success';
  }

  async openCreateModal() {
    const modal = await this.modalCtrl.create({
      component: CreateInviteModalComponent,
      mode: 'ios',
      presentingElement: await this.modalCtrl.getTop() || undefined
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.payload) {
      const p = data.payload;
      const date = p.validStartDateLocal;
      const start = (p.validStartTimeLocal || '').slice(0, 5);
      const end = (p.validEndTimeLocal || '').slice(0, 5);
      const visitorName = `${p.visitorProfile.firstName || ''} ${p.visitorProfile.lastName || ''}`.trim();

      // เพิ่มรายการใหม่เข้า list แล้วรีเฟรชตามวัน
      this.allBookings.push({
        id: Date.now(),
        visitorName,
        company: p.visitorProfile.company,
        time: `${start} - ${end}`,
        status: p.statusDescription === 'pending_approval' ? 'pending' : 'approved',
        date,
        avatar: `https://i.pravatar.cc/150?u=${p.visitorProfile.email || p.visitorProfile.phone || p.visitorProfile.visitorId}`
      });
      this.filterBookings();
    }
  }
}