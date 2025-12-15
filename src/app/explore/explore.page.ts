import { Component, OnInit, inject, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
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
import { FastpassHeaderComponent } from '../components/ui/fastpass-header/fastpass-header.component';

// Import Services
import { BottomSheetService } from '../services/bottom-sheet.service';
import { BuildingDataService, BuildingData } from '../services/building-data.service';
import { AuthService, UserProfile } from '../services/auth.service';
import { FloorplanInteractionService } from '../services/floorplan/floorplan-interaction.service';
import { Subscription, take } from 'rxjs';

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
    BottomSheetComponent,
    FastpassHeaderComponent
  ]
})
export class ExplorePage implements OnInit, AfterViewInit, OnDestroy {
  // Services
  private bottomSheetService = inject(BottomSheetService);
  private buildingDataService = inject(BuildingDataService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private floorplanInteraction = inject(FloorplanInteractionService);

  // State
  public viewMode: 'map' | 'building' | 'floor' = 'map';
  public buildingData!: BuildingData;
  public selectedFloorIndex: number | null = null;
  public selectedFloorValue: number | null = null;
  public lastActiveFloor: number | null = null;
  public isLoading = false;
  public isFloorFullscreen = false;
  public selectedUserId: string | null = null;
  public selectedUserProfile: UserProfile | null = null;
  private currentPermissionSubscription?: Subscription;
  private currentPermissionList: string[] = [];

  // Mock Data
  public mockBuildings = [
    { id: 'E12', name: 'อาคารเรียนรวม 12 ชั้น (E12)', description: 'ศูนย์รวมห้องปฏิบัติการวิศวกรรม' },
    { id: 'kmitl_it', name: 'คณะเทคโนโลยีสารสนเทศ (IT)', description: 'ตึกกระจกริมน้ำ' },
    { id: 'kmitl_cl', name: 'สำนักหอสมุดกลาง (CL)', description: 'ศูนย์การเรียนรู้' },
    { id: 'kmitl_hall', name: 'หอประชุมเจ้าพระยาสุรวงษ์ฯ', description: 'หอประชุมใหญ่ สจล.' }
  ];

  private tabBarObserver?: ResizeObserver;
  private readonly totalFloors = 12;
  private readonly floorColorPalette: string[] = [
    '#f94144', '#f3722c', '#f8961e', '#f9844a', '#f9c74f', '#90be6d',
    '#43aa8b', '#4d908e', '#577590', '#277da1', '#a855f7', '#ef476f'
  ];

  constructor() {
    addIcons({ arrowBack });
    this.buildingData = this.prepareBuildingData(this.buildingDataService.getFallback());
  }

  ngOnInit() {
    this.bottomSheetService.open('building-list', this.mockBuildings, 'อาคารในบริเวณ');
    this.bottomSheetService.setExpansionState('default');

    this.bottomSheetService.action$.subscribe(event => {
      if (event.action === 'enter-building') {
        this.onBuildingSelected(event.payload);
      }
    });

    // Delay measurement slightly to ensure the tab bar is rendered
    setTimeout(() => this.syncFooterHeight(), 0);

    // Preload users so selection stays consistent when header initialises
  }

  ngAfterViewInit(): void {
    this.registerTabBarObserver();
  }

  ngOnDestroy(): void {
    this.currentPermissionSubscription?.unsubscribe();
    this.tabBarObserver?.disconnect();
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
    this.isFloorFullscreen = false;

    setTimeout(() => {
      this.bottomSheetService.showAccessList(this.currentPermissionList, 'peek');
      this.bottomSheetService.setExpansionState('peek');
    }, 100);

    this.cdr.detectChanges();
  }

  resetToBuildingOverview(): void {
    if (this.viewMode === 'floor') {
      this.viewMode = 'building';
      this.isFloorFullscreen = false;
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
    const baseData: BuildingData = {
      buildingId: data?.buildingId ?? 'E12',
      buildingName: data?.buildingName ?? 'E12 Engineering Building',
      floors: Array.isArray(data?.floors) ? [...data.floors] : []
    };

    const baseWalls = baseData.floors[0]?.walls ? this.cloneWalls(baseData.floors[0].walls) : [];

    const hydratedFloors = baseData.floors
      .map((floor: any, index: number) => ({
        ...floor,
        floor: typeof floor.floor === 'number' ? floor.floor : index + 1,
        floorName: floor.floorName ?? `ชั้น ${typeof floor.floor === 'number' ? floor.floor : index + 1}`,
        color: floor.color ?? this.floorColorPalette[index % this.floorColorPalette.length],
        zones: Array.isArray(floor.zones)
          ? floor.zones.map((zone: any) => ({
            ...zone,
            areas: Array.isArray(zone.areas) ? zone.areas : [],
            rooms: Array.isArray(zone.rooms) ? zone.rooms : [],
            objects: Array.isArray(zone.objects) ? zone.objects : []
          }))
          : []
      }))
      .sort((a, b) => a.floor - b.floor);

    const existingCount = hydratedFloors.length;
    for (let floorNumber = existingCount + 1; floorNumber <= this.totalFloors; floorNumber++) {
      hydratedFloors.push(
        this.createPlaceholderFloor(
          floorNumber,
          this.floorColorPalette[(floorNumber - 1) % this.floorColorPalette.length],
          baseWalls
        )
      );
    }

    return {
      ...baseData,
      floors: hydratedFloors
    };
  }

  onUserSelected(user: UserProfile): void {
    this.selectedUserProfile = user;
    this.selectedUserId = user.id;
    console.log('Selected user:', user);
    this.resolvePermissionsForUser(user);
  }

  private resolvePermissionsForUser(user: UserProfile): void {
    this.currentPermissionSubscription?.unsubscribe();
    this.currentPermissionSubscription = this.authService
      .getUserPermissions(user.id, user.is_staff)
      .subscribe({
        next: permissionList => {
          this.currentPermissionList = permissionList ?? [];
          this.floorplanInteraction.setPermissionList(this.currentPermissionList);

          if (this.viewMode === 'floor') {
            this.bottomSheetService.showAccessList(this.currentPermissionList, 'peek');
            this.bottomSheetService.setExpansionState('peek');
          }
        },
        error: err => {
          console.error('Failed to resolve permissions for user', err);
          this.currentPermissionList = [];
          this.floorplanInteraction.setPermissionList([]);
          if (this.viewMode === 'floor') {
            this.bottomSheetService.showAccessList([], 'peek');
            this.bottomSheetService.setExpansionState('peek');
          }
        }
      });
  }

  private createPlaceholderFloor(floorNumber: number, color: string, baseWalls: any[]): any {
    const hallBoundary = { min: { x: -7, y: -9 }, max: { x: 7, y: 9 } };
    const liftBoundary = { min: { x: -7, y: -18 }, max: { x: 7, y: -9 } };

    return {
      floor: floorNumber,
      floorName: `ชั้น ${floorNumber}`,
      color,
      walls: this.cloneWalls(baseWalls),
      zones: [
        {
          id: `f${floorNumber}_core_zone`,
          name: 'Core Corridor',
          areas: [
            { id: `f${floorNumber}_hall`, name: `Hall ${floorNumber}`, color: '#cfe9ff', boundary: hallBoundary },
            { id: `f${floorNumber}_lift_lobby`, name: 'Lift Lobby', color: '#b1ddff', boundary: liftBoundary }
          ],
          rooms: [
            {
              id: `f${floorNumber}_wing_left`,
              name: `Learning Studio ${floorNumber}A`,
              color: '#d1c4f6',
              boundary: { min: { x: -46, y: -4 }, max: { x: -7, y: 9 } },
              doors: [
                {
                  id: `f${floorNumber}_wing_left_door`,
                  center: { x: -16.75, y: -4 },
                  size: { width: 2, depth: 0.2 },
                  accessLevel: 1
                }
              ]
            },
            {
              id: `f${floorNumber}_wing_right`,
              name: `Innovation Lab ${floorNumber}B`,
              color: '#c3f7d6',
              boundary: { min: { x: 7, y: -4 }, max: { x: 46, y: 9 } },
              doors: [
                {
                  id: `f${floorNumber}_wing_right_door`,
                  center: { x: 16.75, y: -4 },
                  size: { width: 2, depth: 0.2 },
                  accessLevel: 0
                }
              ]
            }
          ],
          objects: [
            {
              id: `f${floorNumber}_collab_hub`,
              type: 'Collaboration Hub',
              boundary: { min: { x: -4, y: -11 }, max: { x: 4, y: -9 } }
            }
          ]
        }
      ]
    };
  }

  private cloneWalls(walls: any[]): any[] {
    return Array.isArray(walls)
      ? walls.map(wall => ({
          start: { x: wall.start.x, y: wall.start.y },
          end: { x: wall.end.x, y: wall.end.y }
        }))
      : [];
  }

  private registerTabBarObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const tabBar = document.querySelector('ion-tab-bar');
    if (!tabBar) {
      return;
    }

    this.tabBarObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        this.syncFooterHeight(element);
      }
    });

    this.tabBarObserver.observe(tabBar);
  }

  private syncFooterHeight(target?: HTMLElement): void {
    const el = target || document.querySelector('ion-tab-bar');
    if (!el) {
      return;
    }

    const computed = getComputedStyle(el);
    const baseHeight = el.clientHeight;
    const marginTop = parseFloat(computed.marginTop || '0');
    const marginBottom = parseFloat(computed.marginBottom || '0');
    const totalHeight = baseHeight + marginTop + marginBottom;
    document.documentElement.style.setProperty('--vms-tab-bar-height', `${totalHeight}px`);
  }

  onFloorFullscreenChange(fullscreen: boolean): void {
    const previous = this.isFloorFullscreen;
    this.isFloorFullscreen = fullscreen;

    if (previous === fullscreen) {
      return;
    }

    if (fullscreen) {
      this.bottomSheetService.close();
    } else if (this.viewMode === 'floor') {
      // Delay to allow bottom sheet component to re-render when it was removed
      setTimeout(() => {
        this.bottomSheetService.showAccessList(this.currentPermissionList, 'peek');
        this.bottomSheetService.setExpansionState('peek');
      }, 120);
    }
  }
}