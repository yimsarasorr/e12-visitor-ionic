import { Component, inject, ElementRef, ViewChild, Renderer2, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular'; // Import Ionic Module
import { BottomSheetService, SheetData } from '../../services/bottom-sheet.service';
import { AccessListComponent } from '../access-list/access-list.component';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule, IonicModule, AccessListComponent], // ใช้ IonicModule แทน ButtonModule
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss'] // Ionic ใช้ scss โดย default
})
export class BottomSheetComponent implements OnInit {
  public bottomSheetService = inject(BottomSheetService);
  private renderer = inject(Renderer2);

  @ViewChild('sheet') sheetRef!: ElementRef;

  currentData: SheetData = { mode: 'hidden' };
  currentState: 'hidden' | 'peek' | 'default' | 'expanded' = 'hidden';

  private startY = 0;
  private startHeight = 0;
  private isDragging = false;

  ngOnInit() {
    this.bottomSheetService.sheetState$.subscribe(data => {
      this.currentData = data;
      if (data.mode === 'hidden') this.updateState('hidden');
    });

    this.bottomSheetService.expansionState$.subscribe(state => {
      this.updateState(state);
    });
  }

  // --- Logic การลาก (เหมือนเดิมเป๊ะ) ---
  onTouchStart(event: TouchEvent | MouseEvent) {
    this.isDragging = true;
    this.startY = this.getClientY(event);
    const el = this.sheetRef.nativeElement;
    this.startHeight = el.offsetHeight;
    this.renderer.setStyle(el, 'transition', 'none');
  }

  onTouchMove(event: TouchEvent | MouseEvent) {
    if (!this.isDragging) return;
    // ใน Ionic บางทีต้องระวัง event ตีกับ scroll แต่สำหรับ header sheet น่าจะโอเค
    // if (event instanceof TouchEvent) event.preventDefault(); // อาจจะต้องเอาออกถ้าอยากให้ scroll เนื้อหาได้

    const clientY = this.getClientY(event);
    const deltaY = this.startY - clientY;
    const newHeight = this.startHeight + deltaY;
    
    // ปรับ Max Height ให้เว้นระยะจากด้านบนหน่อย
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
    if (ratio > 0.6) this.updateState('expanded');
    else if (ratio > 0.25) this.updateState('default');
    else this.updateState('peek');
  }

  private getClientY(event: TouchEvent | MouseEvent): number {
    return event instanceof TouchEvent ? event.touches[0].clientY : event.clientY;
  }

  updateState(state: 'hidden' | 'peek' | 'default' | 'expanded') {
    this.currentState = state;
    if (state !== 'hidden') {
       this.bottomSheetService.setExpansionState(state);
    }
  }
  
  selectBuilding(item: any) {
    this.bottomSheetService.triggerAction('enter-building', item.id);
  }

  backToList() {
    this.bottomSheetService.close(); // หรือ logic กลับไป list
  }
}