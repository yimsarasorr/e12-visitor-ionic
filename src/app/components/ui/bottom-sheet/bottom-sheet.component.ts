import { Component, inject, ElementRef, ViewChild, Renderer2, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BottomSheetService, SheetData, ExpansionState } from '../../../services/bottom-sheet.service';
import { AccessListComponent } from '../../access-list/access-list.component';

// 1. Import addIcons และชื่อ Icon ที่ใช้
import { addIcons } from 'ionicons';
import { 
  business, 
  businessOutline, 
  close, 
  cubeOutline, 
  navigateOutline, 
  chevronForwardOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule, IonicModule, AccessListComponent],
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss']
})
export class BottomSheetComponent implements OnInit {
  public bottomSheetService = inject(BottomSheetService);
  private renderer = inject(Renderer2);

  @ViewChild('sheet') sheetRef!: ElementRef;

  currentData: SheetData = { mode: 'hidden' };
  currentState: 'hidden' | ExpansionState = 'peek';

  private startY = 0;
  private startHeight = 0;
  private isDragging = false;

  constructor() {
    // 2. Register Icon ทั้งหมดที่ใช้ใน HTML ของหน้านี้
    addIcons({ 
      business, 
      businessOutline, 
      close, 
      cubeOutline, 
      navigateOutline, 
      chevronForwardOutline 
    });
  }

  ngOnInit() {
    // 1. Subscribe Content
    this.bottomSheetService.sheetState$.subscribe(data => {
      this.currentData = data;
      if (data.mode === 'hidden') {
        this.setState('hidden');
        return;
      }

      const nextState = this.bottomSheetService.getCurrentExpansionState();
      this.setState(nextState);
    });

    // 2. Subscribe Height State
    this.bottomSheetService.expansionState$.subscribe(state => {
      this.setState(state);
    });
  }

  // --- Logic การลาก (เหมือนเดิม) ---
  onTouchStart(event: TouchEvent | MouseEvent) {
    this.isDragging = true;
    this.startY = this.getClientY(event);
    const el = this.sheetRef.nativeElement;
    this.startHeight = el.offsetHeight;
    this.renderer.setStyle(el, 'transition', 'none');
  }

  onTouchMove(event: TouchEvent | MouseEvent) {
    if (!this.isDragging) return;
    const clientY = this.getClientY(event);
    const deltaY = this.startY - clientY;
    const newHeight = this.startHeight + deltaY;
    const maxHeight = window.innerHeight - 60; 

    if (newHeight > 0 && newHeight <= maxHeight) {
      this.renderer.setStyle(this.sheetRef.nativeElement, 'height', `${newHeight}px`);
    }
  }

  onTouchEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    const el = this.sheetRef.nativeElement;
    this.renderer.setStyle(el, 'transition', 'height 0.4s cubic-bezier(0.25, 1, 0.5, 1)');
    this.renderer.removeStyle(el, 'height');

    const ratio = el.offsetHeight / window.innerHeight;
    if (ratio > 0.65) {
      this.setState('expanded', true);
    } else if (ratio > 0.35) {
      this.setState('default', true);
    } else {
      this.setState('peek', true);
    }
  }

  private getClientY(event: TouchEvent | MouseEvent): number {
    return event instanceof TouchEvent ? event.touches[0].clientY : event.clientY;
  }

  private setState(state: 'hidden' | ExpansionState, emit = false) {
    if (this.currentState === state) return;
    this.currentState = state;

    if (emit && state !== 'hidden') {
      this.bottomSheetService.setExpansionState(state as ExpansionState);
    }
  }
  
  selectBuilding(item: any) {
    this.bottomSheetService.triggerAction('enter-building', item.id);
  }

  backToList() {
    this.bottomSheetService.close();
  }
}