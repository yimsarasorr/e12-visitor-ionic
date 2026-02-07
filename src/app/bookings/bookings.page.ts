import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, Renderer2, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonCard, IonItem, IonLabel,
  IonAvatar, IonBadge, ModalController, GestureController, Gesture, IonFab, IonFabButton, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, timeOutline, calendarOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { FastpassHeaderComponent } from '../components/ui/fastpass-header/fastpass-header.component';
import { CreateInviteModalComponent } from '../components/ui/create-invite-modal/create-invite-modal.component';

interface CalendarDate {
  dateObj: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  fullDate: string;
  hasEvent: boolean;
}

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
  standalone: true,
  imports: [IonButton, IonFabButton, IonFab, 
    CommonModule, FormsModule,
    IonContent, IonIcon, IonCard, IonItem, IonLabel,
    IonAvatar, IonBadge,
    FastpassHeaderComponent
  ]
})
export class BookingsPage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('calendarStrip', { read: ElementRef }) calendarStripRef!: ElementRef;
  private gesture?: Gesture;
  private isAnimating = false;

  currentWeekStart: Date = new Date();
  weekDays: CalendarDate[] = [];
  selectedDate: string = '';
  currentMonthLabel: string = '';

  // Mock Data
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
    private gestureCtrl: GestureController,
    private renderer: Renderer2,
    private ngZone: NgZone
  ) {
    addIcons({ addOutline, timeOutline, calendarOutline, chevronBackOutline, chevronForwardOutline });
  }

  ngOnInit() {
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) - 6 (Sat)
    this.currentWeekStart = new Date(today);
    this.currentWeekStart.setDate(today.getDate() - day);

    this.generateWeekView();
    this.selectDate(today.toISOString().split('T')[0]);
  }

  // เริ่มระบบปัดหลัง View โหลดเสร็จ
  ngAfterViewInit() {
    this.initSwipeGesture();
  }

  ngOnDestroy() {
    if (this.gesture) this.gesture.destroy();
  }

  // ระบบปัดซ้าย/ขวา เพื่อเปลี่ยนสัปดาห์
  initSwipeGesture() {
    if (!this.calendarStripRef) return;
    const element = this.calendarStripRef.nativeElement;

    this.gesture = this.gestureCtrl.create({
      el: element,
      gestureName: 'swipe-calendar',
      threshold: 5,
      direction: 'x',
      onStart: () => {
        this.renderer.setStyle(element, 'transition', 'none');
      },
      onMove: (ev) => {
        if (this.isAnimating) return;
        // ขยับตามระยะนิ้วลาก
        this.renderer.setStyle(element, 'transform', `translateX(${ev.deltaX}px)`);
      },
      onEnd: (ev) => {
        if (this.isAnimating) return;
        // เปิด Transition กลับเพื่อให้เด้งสวย
        this.renderer.setStyle(element, 'transition', 'transform 0.3s cubic-bezier(0.2, 0.0, 0.2, 1)');

        const threshold = 80; // ต้องลากเกิน 80px ถึงจะเปลี่ยนสัปดาห์
        if (ev.deltaX < -threshold) {
          // ปัดซ้ายมาก -> ไปวีคหน้า
          this.renderer.setStyle(element, 'transform', `translateX(-120%)`);
          this.handleSlideChange('next');
        } else if (ev.deltaX > threshold) {
          // ปัดขวามาก -> ไปวีคก่อน
          this.renderer.setStyle(element, 'transform', `translateX(120%)`);
          this.handleSlideChange('prev');
        } else {
          // ไม่ถึงเกณฑ์ -> เด้งกลับที่เดิม
          this.renderer.setStyle(element, 'transform', 'translateX(0)');
        }
      }
    });
    this.gesture.enable(true);
  }

  // Trigger slide-out via button, then delegate to existing slide-change logic
  slideWeek(direction: 'next' | 'prev') {
    if (this.isAnimating || !this.calendarStripRef) return;

    const element = this.calendarStripRef.nativeElement;
    this.renderer.setStyle(element, 'transition', 'transform 0.3s cubic-bezier(0.2, 0.0, 0.2, 1)');
    const translateVal = direction === 'next' ? '-120%' : '120%';
    this.renderer.setStyle(element, 'transform', `translateX(${translateVal})`);

    this.handleSlideChange(direction);
  }

  // จัดการ Slide Out -> อัปเดตข้อมูล -> Teleport -> Slide In
  public handleSlideChange(direction: 'next' | 'prev') {
    this.isAnimating = true;
    const element = this.calendarStripRef.nativeElement;

    // รอให้ Animation ตอนปล่อยนิ้วจบก่อน
    setTimeout(() => {
      // รันใน Angular Zone เพื่อให้หน้าจออัปเดต
      this.ngZone.run(() => {
        if (direction === 'next') this.nextWeek();
        else this.prevWeek();
      });

      // Teleport แล้ว Slide In
      this.renderer.setStyle(element, 'transition', 'none');
      const startPos = direction === 'next' ? '100%' : '-100%';
      this.renderer.setStyle(element, 'transform', `translateX(${startPos})`);
      // Force reflow
      void element.offsetHeight;
      this.renderer.setStyle(element, 'transition', 'transform 0.3s cubic-bezier(0.2, 0.0, 0.2, 1)');
      this.renderer.setStyle(element, 'transform', 'translateX(0)');

      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }, 300);
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

      // [เพิ่ม] เช็คว่าวันนี้มี Booking ไหม
      const hasEvent = this.allBookings.some(b => b.date === dateStr);

      this.weekDays.push({
        dateObj: d,
        dayName: daysTh[d.getDay()],
        dayNumber: d.getDate().toString(),
        isToday: dateStr === todayStr,
        fullDate: dateStr,
        hasEvent // [เพิ่ม] ส่งค่าไป
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
    
    // รอรับค่าเมื่อ Modal ปิด
    const { data } = await modal.onWillDismiss();
    
    if (data?.payload) {
      console.log('Bookings Page Received:', data.payload);
      
      // เพิ่มเข้า List เพื่อดูผลลัพธ์บนหน้าจอทันที
      this.allBookings.push({
        id: Date.now(),
        visitorName: `${data.payload.visitorProfile.firstName} ${data.payload.visitorProfile.lastName}`,
        company: data.payload.visitorProfile.company,
        time: `${data.payload.validStartTimeLocal.slice(0,5)} - ${data.payload.validEndTimeLocal.slice(0,5)}`,
        status: 'pending',
        date: data.payload.validStartDateLocal,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.payload.visitorProfile.firstName)}+${encodeURIComponent(data.payload.visitorProfile.lastName)}`
      });
      
      // Refresh หน้าจอ
      this.selectDate(this.selectedDate);
    }
  }
}