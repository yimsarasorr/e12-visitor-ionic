import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';

// Import Components
import { MapViewComponent } from '../components/map-view/map-view.component';
import { BuildingViewComponent } from '../components/building-view/building-view.component';
import { FloorPlanComponent } from '../components/floor-plan/floor-plan.component';
import { BottomSheetComponent } from '../components/ui/bottom-sheet/bottom-sheet.component';

// Import Services
import { BottomSheetService } from '../services/bottom-sheet.service';
import { BuildingDataService, BuildingData } from '../services/building-data.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.page.html',
  styleUrls: ['./explore.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    MapViewComponent,
    BuildingViewComponent,
    FloorPlanComponent,
    BottomSheetComponent
  ]
})
export class ExplorePage implements OnInit {
  // Services
  private bottomSheetService = inject(BottomSheetService);
  private buildingDataService = inject(BuildingDataService);
  private cdr = inject(ChangeDetectorRef);

  // State
  public viewMode: 'map' | 'building' | 'floor' = 'map';
  public buildingData!: BuildingData;
  public selectedFloorIndex: number | null = null;
  public selectedFloorValue: number | null = null;
  public lastActiveFloor: number | null = null;
  public isLoading = false;

  // Mock Data
  public mockBuildings = [
    { id: 'E12', name: 'อาคารเรียนรวม 12 ชั้น (E12)', description: 'ศูนย์รวมห้องปฏิบัติการวิศวกรรม' },
    { id: 'kmitl_it', name: 'คณะเทคโนโลยีสารสนเทศ (IT)', description: 'ตึกกระจกริมน้ำ' },
    { id: 'kmitl_cl', name: 'สำนักหอสมุดกลาง (CL)', description: 'ศูนย์การเรียนรู้' },
    { id: 'kmitl_hall', name: 'หอประชุมเจ้าพระยาสุรวงษ์ฯ', description: 'หอประชุมใหญ่ สจล.' }
  ];

  constructor() {
    addIcons({ arrowBack }); // Register Icon สำหรับปุ่ม Back
    this.buildingData = this.prepareBuildingData(this.buildingDataService.getFallback());
  }

  ngOnInit() {
    this.bottomSheetService.open('building-list', this.mockBuildings, 'อาคารในบริเวณ');
    this.bottomSheetService.setExpansionState('peek');

    this.bottomSheetService.action$.subscribe(event => {
      if (event.action === 'enter-building') {
        this.onBuildingSelected(event.payload);
      }
    });
  }

  onBuildingSelected(buildingId: string): void {
    console.log('Entering building:', buildingId);
    this.loadBuilding(buildingId);
    this.viewMode = 'building';
    this.bottomSheetService.close();
  }

  loadBuilding(buildingId: string): void {
    this.isLoading = true;
    this.buildingDataService.getBuilding(buildingId).pipe(take(1)).subscribe(data => {
      this.buildingData = this.prepareBuildingData(data);
      this.selectedFloorIndex = null;
      this.selectedFloorValue = null;
      this.lastActiveFloor = null;
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  onFloorSelected(floorNumber: number): void {
    this.selectFloor(floorNumber);
  }

  selectFloor(floorNumber: number): void {
    const index = this.buildingData.floors.findIndex((f: any) => f.floor === floorNumber);
    if (index === -1) return;

    this.lastActiveFloor = floorNumber;
    this.selectedFloorIndex = index;
    this.selectedFloorValue = floorNumber;
    this.viewMode = 'floor';

    setTimeout(() => {
      this.bottomSheetService.showAccessList([]);
      this.bottomSheetService.setExpansionState('peek');
    }, 100);

    this.cdr.detectChanges();
  }

  resetToBuildingOverview(): void {
    if (this.viewMode === 'floor') {
      this.viewMode = 'building';
      this.bottomSheetService.close();
    } else {
      this.viewMode = 'map';
      this.bottomSheetService.open('building-list', this.mockBuildings, 'อาคารในบริเวณ');
      this.bottomSheetService.setExpansionState('peek');
    }
  }

  get selectedFloorData(): any {
    if (this.selectedFloorIndex === null) return null;
    return this.buildingData.floors[this.selectedFloorIndex];
  }

  private prepareBuildingData(data: BuildingData): BuildingData {
    // Logic เดิมของคุณสำหรับการเตรียมข้อมูลตึก (จำลอง walls, floors)
    // ผมใส่แบบย่อไว้ให้ ถ้าคุณมี logic เต็มๆ ใน app.component.ts เดิม ให้ก๊อปมาใส่แทน function นี้นะครับ
    const baseData = { ...data };
    // ... (วาง Logic prepareBuildingData เดิมของคุณที่นี่) ...
    return baseData;
  }
}