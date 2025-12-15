import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map, startWith } from 'rxjs';
import { IonBadge, IonIcon } from '@ionic/angular/standalone';
import { FloorplanInteractionService } from '../../services/floorplan/floorplan-interaction.service';
import { FloorplanBuilderService } from '../../services/floorplan/floorplan-builder.service';

interface DoorStatus {
  id: string;
  label: string;
  allowed: boolean;
}

interface RoomAccessSummary {
  id: string;
  name: string;
  floor: number;
  zoneName?: string;
  color: string;
  doors: DoorStatus[];
  boundary?: any;
  center?: any;
}

@Component({
  selector: 'app-access-list',
  standalone: true,
  imports: [CommonModule, IonIcon, IonBadge],
  templateUrl: './access-list.component.html',
  styleUrls: ['./access-list.component.css']
})
export class AccessListComponent implements OnInit {
  private interactionService = inject(FloorplanInteractionService);
  private builder = inject(FloorplanBuilderService);

  public accessibleRooms$!: Observable<RoomAccessSummary[]>;

  ngOnInit(): void {
    this.accessibleRooms$ = this.interactionService.permissionList$.pipe(
      startWith([]),
      map(assetIds => this.buildRoomSummaries(assetIds))
    );
  }

  focusRoom(room: RoomAccessSummary): void {
    this.interactionService.focusOnAsset(room.id);
  }

  private buildRoomSummaries(allowList: string[]): RoomAccessSummary[] {
    const floorData = this.interactionService.getCurrentFloorData();
    if (!floorData?.zones) {
      return [];
    }
    const allowedSet = new Set((allowList || []).filter(Boolean));

    const rooms: RoomAccessSummary[] = [];
    floorData.zones.forEach((zone: any) => {
      zone.rooms?.forEach((room: any) => {
        const doorStatuses: DoorStatus[] = (room.doors || []).map((door: any) => ({
          id: door.id,
          label: door.name ?? 'ประตู',
          allowed: allowedSet.has(door.id) || allowedSet.has(room.id)
        }));

        const anyAllowed = allowedSet.has(room.id) || doorStatuses.some(d => d.allowed);
        const badgeColor = this.builder.getAssignedRoomColor(room.id) ?? room.color ?? '#94a3b8';

        rooms.push({
          id: room.id,
          name: room.name ?? room.id,
          floor: floorData.floor,
          zoneName: zone.name,
          color: anyAllowed ? badgeColor : this.fadeColor(badgeColor),
          doors: doorStatuses,
          boundary: room.boundary,
          center: room.center
        });
      });
    });

    return rooms.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }

  private fadeColor(color: string): string {
    const sanitized = color.replace('#', '');
    const normalized = sanitized.length === 3
      ? sanitized.split('').map(c => c + c).join('')
      : sanitized.padStart(6, '0');
    const base = parseInt(normalized, 16);
    const r = (base >> 16) & 255;
    const g = (base >> 8) & 255;
    const b = base & 255;
    const mix = (component: number) => Math.round(component + (209 - component) * 0.45); // 209 = 0xd1
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }
}