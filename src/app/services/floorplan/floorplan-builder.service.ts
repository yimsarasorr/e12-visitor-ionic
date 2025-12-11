// src/app/services/floorplan/floorplan-builder.service.ts
import { Injectable } from '@angular/core';
import * as THREE from 'three';

// Interface นี้ย้ายมาจาก component
interface Boundary {
  min: { x: number; y: number };
  max: { x: number; y: number };
}

@Injectable({
  providedIn: 'root'
})
export class FloorplanBuilderService {
  // Constants
  private readonly wallHeight = 3;
  private readonly wallThickness = 0.2;
  private readonly zoneColorPalette: number[] = [
    0x8ab4f8, // soft blue
    0xf7b7d4, // pastel pink
    0xf6d365, // mellow gold
    0xb4d9ff, // baby blue
    0xd0bdf4, // lavender
    0xffcba4, // light coral
    0xffe4a3, // peach
    0xc4e0f9, // icy blue
    0xe6d5ff, // lilac
    0xfddde6  // rose quartz
  ];

  // Materials
  private wallMaterial!: THREE.MeshStandardMaterial;
  private objectMaterial!: THREE.MeshStandardMaterial;
  private lockedDoorMaterial!: THREE.MeshStandardMaterial;
  private unlockedDoorMaterial!: THREE.MeshStandardMaterial;
  private mutedFloorMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

  private zoneColorAssignments = new Map<string, number>();
  private paletteIndex = 0;

  // Mesh Collections
  private wallMeshes: THREE.Mesh[] = [];
  private objectMeshes: THREE.Mesh[] = [];
  private floorMeshes: THREE.Mesh[] = [];
  private doorMeshes: THREE.Mesh[] = [];
  
  private floorGroup: THREE.Group | null = null;

  constructor() {
    this.initializeMaterials();
  }

  /**
   * สร้าง Materials ที่จะใช้ซ้ำๆ
   */
  private initializeMaterials(): void {
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      roughness: 0.35,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.objectMaterial = new THREE.MeshStandardMaterial({
      color: 0x9aa4b5,
      roughness: 0.75,
      metalness: 0.05
    });
    this.lockedDoorMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4d4f,
      transparent: false,
      opacity: 1,
      roughness: 0.2,
      metalness: 0
    });
    this.unlockedDoorMaterial = new THREE.MeshStandardMaterial({
      color: 0x25c26e,
      transparent: false,
      opacity: 1,
      roughness: 0.2,
      metalness: 0
    });
  }

  /**
   * สร้างโมเดล 3D ทั้งหมดสำหรับชั้น
   * @param floorData ข้อมูล JSON ของชั้น
   * @returns THREE.Group ที่มี Meshes ทั้งหมด
   */
  public buildFloor(floorData: any): THREE.Group {
    this.clearFloor(); // ล้างของเก่าก่อน (ถ้ามี)
    this.floorGroup = new THREE.Group();

    const bounds = {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    };

    const extendBounds = (x: number, y: number) => {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
    };

    // ( Logic นี้ย้ายมาจาก loadFloorPlan() ใน component )
    if (floorData?.walls) {
      floorData.walls.forEach((wall: any) => {
        const start = new THREE.Vector3(wall.start.x, 0, wall.start.y);
        const end = new THREE.Vector3(wall.end.x, 0, wall.end.y);
        const wallMesh = this.buildWallMesh(start, end, this.wallHeight, this.wallMaterial);
        this.wallMeshes.push(wallMesh);
        this.floorGroup!.add(wallMesh);
        extendBounds(wall.start.x, wall.start.y);
        extendBounds(wall.end.x, wall.end.y);
      });
    }

    floorData?.zones?.forEach((zone: any) => {
      const zoneBoundaries: Boundary[] = [];

      zone.areas?.forEach((area: any) => {
        const areaWidth = area.boundary.max.x - area.boundary.min.x;
        const areaDepth = area.boundary.max.y - area.boundary.min.y;
        const areaGeo = new THREE.PlaneGeometry(areaWidth, areaDepth);
        const areaColor = this.pickZoneColor(area.id || area.name || `area-${this.paletteIndex}`);
        const areaMat = new THREE.MeshStandardMaterial({
          color: areaColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.82,
          roughness: 0.85,
          metalness: 0
        });
        const areaFloor = new THREE.Mesh(areaGeo, areaMat);
        areaFloor.rotation.x = -Math.PI / 2;
        areaFloor.position.set(area.boundary.min.x + areaWidth / 2, 0.01, area.boundary.min.y + areaDepth / 2);
        const areaData = { ...area, floor: floorData.floor };
        areaFloor.userData = { type: 'area', data: areaData };
        this.floorMeshes.push(areaFloor);
        this.floorGroup!.add(areaFloor);
        if (area.boundary) {
          zoneBoundaries.push(area.boundary);
          extendBounds(area.boundary.min.x, area.boundary.min.y);
          extendBounds(area.boundary.max.x, area.boundary.max.y);
        }
      });

      zone.rooms?.forEach((room: any) => {
        const roomWidth = room.boundary.max.x - room.boundary.min.x;
        const roomDepth = room.boundary.max.y - room.boundary.min.y;
        const roomGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const roomColor = this.pickZoneColor(room.id || room.name || `room-${this.paletteIndex}`);
        const roomMat = new THREE.MeshStandardMaterial({
          color: roomColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.88,
          roughness: 0.8,
          metalness: 0
        });
        const roomFloor = new THREE.Mesh(roomGeo, roomMat);
        roomFloor.rotation.x = -Math.PI / 2;
        roomFloor.position.set(room.boundary.min.x + roomWidth / 2, 0.02, room.boundary.min.y + roomDepth / 2);
        const roomData = { ...room, floor: floorData.floor };
        roomFloor.userData = { type: 'room', data: roomData };
        this.floorMeshes.push(roomFloor);
        this.floorGroup!.add(roomFloor);
        if (room.boundary) {
          zoneBoundaries.push(room.boundary);
          extendBounds(room.boundary.min.x, room.boundary.min.y);
          extendBounds(room.boundary.max.x, room.boundary.max.y);
        }

        room.doors?.forEach((door: any) => {
          const geo = new THREE.BoxGeometry(door.size.width, this.wallHeight, door.size.depth);
          const mesh = new THREE.Mesh(geo, this.lockedDoorMaterial); // เริ่มต้นด้วย Locked
          mesh.position.set(door.center.x, this.wallHeight / 2, door.center.y);
          const doorData = { ...door, floor: floorData.floor };
          mesh.userData = { type: 'door', data: doorData };
          this.doorMeshes.push(mesh);
          this.floorGroup!.add(mesh);
          extendBounds(door.center.x, door.center.y);
        });
      });

      zone.objects?.forEach((obj: any) => {
        const width = obj.boundary.max.x - obj.boundary.min.x;
        const depth = obj.boundary.max.y - obj.boundary.min.y;
        const geo = new THREE.BoxGeometry(width, this.wallHeight, depth);
        const mesh = new THREE.Mesh(geo, this.objectMaterial);
        mesh.position.set(obj.boundary.min.x + width / 2, this.wallHeight / 2, obj.boundary.min.y + depth / 2);
        const objectData = { ...obj, floor: floorData.floor };
        mesh.userData = { type: 'object', data: objectData };
        this.objectMeshes.push(mesh);
        this.floorGroup!.add(mesh);
        if (obj.boundary) {
          zoneBoundaries.push(obj.boundary);
          extendBounds(obj.boundary.min.x, obj.boundary.min.y);
          extendBounds(obj.boundary.max.x, obj.boundary.max.y);
        }
      });

      const combined = this.combineBoundaries(zoneBoundaries);
      if (combined) {
        zone.boundary = combined;
        zone.center = {
          x: (combined.min.x + combined.max.x) / 2,
          y: (combined.min.y + combined.max.y) / 2
        };
      }
    });

    if (Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxY)) {
      const baseWidth = bounds.maxX - bounds.minX;
      const baseDepth = bounds.maxY - bounds.minY;
      if (baseWidth > 0 && baseDepth > 0) {
        const baseGeo = new THREE.PlaneGeometry(baseWidth, baseDepth);
        const mutedMaterial = this.getMutedFloorMaterial(floorData?.color ?? 0xdfe6f3);
        const baseMesh = new THREE.Mesh(baseGeo, mutedMaterial);
        baseMesh.rotation.x = -Math.PI / 2;
        baseMesh.position.set(bounds.minX + baseWidth / 2, 0, bounds.minY + baseDepth / 2);
        baseMesh.renderOrder = -5;
        this.floorMeshes.push(baseMesh);
        this.floorGroup!.add(baseMesh);
      }
    }

    return this.floorGroup;
  }

  /**
   * ล้างโมเดลเก่าออกจาก Memory
   */
  public clearFloor(): void {
    if (!this.floorGroup) return;

    this.floorGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
    this.floorGroup = null;
    this.wallMeshes = [];
    this.objectMeshes = [];
    this.floorMeshes = [];
    this.doorMeshes = [];
  }

  /**
   * (แก้ไข) อัปเดต Material ของประตูตาม "Allow List" (string[])
   */
  public updateDoorMaterials(allowList: string[]): void { // (รับ string[] ไม่ใช่ number)
    this.doorMeshes.forEach(door => {
      const doorId = door.userData['data'].id;
      // (แก้ไข Logic)
      if (allowList.includes(doorId)) {
        door.material = this.unlockedDoorMaterial;
      } else {
        door.material = this.lockedDoorMaterial;
      }
    });
  }

  // --- Getters สำหรับ Service อื่นเรียกใช้ ---
  public getWallMeshes = (): THREE.Mesh[] => this.wallMeshes;
  public getObjectMeshes = (): THREE.Mesh[] => this.objectMeshes;
  public getDoorMeshes = (): THREE.Mesh[] => this.doorMeshes;
  public getFloorMeshes = (): THREE.Mesh[] => this.floorMeshes;

  /**
   * (ย้ายมาจาก component)
   * สร้าง Mesh กำแพง
   */
  private buildWallMesh(start: THREE.Vector3, end: THREE.Vector3, height: number, material: THREE.Material): THREE.Mesh {
    const distance = start.distanceTo(end);
    if (distance < 0.1) return new THREE.Mesh();
    const geometry = new THREE.BoxGeometry(distance, height, this.wallThickness);
    const mesh = new THREE.Mesh(geometry, material);
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mesh.position.set(midPoint.x, height / 2, midPoint.z);
    const direction = new THREE.Vector3().subVectors(end, start);
    mesh.rotation.y = Math.atan2(direction.z, direction.x);
    return mesh;
  }

  /**
   * (ย้ายมาจาก component)
   * รวม Boundary
   */
  private combineBoundaries(boundaries: Boundary[]): Boundary | null {
    if (!boundaries.length) {
      return null;
    }
    return boundaries.reduce((acc, boundary) => ({
      min: {
        x: Math.min(acc.min.x, boundary.min.x),
        y: Math.min(acc.min.y, boundary.min.y)
      },
      max: {
        x: Math.max(acc.max.x, boundary.max.x),
        y: Math.max(acc.max.y, boundary.max.y)
      }
    }));
  }

  private pickZoneColor(key: string): number {
    const existing = this.zoneColorAssignments.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const color = this.zoneColorPalette[this.paletteIndex % this.zoneColorPalette.length];
    this.zoneColorAssignments.set(key, color);
    this.paletteIndex += 1;
    return color;
  }

  private getMutedFloorMaterial(colorInput: number | string): THREE.MeshStandardMaterial {
    const key = typeof colorInput === 'string' ? colorInput : `#${colorInput.toString(16)}`;
    const existing = this.mutedFloorMaterialCache.get(key);
    if (existing) {
      return existing;
    }
    const baseColor = new THREE.Color(colorInput as any);
    const washedColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.75);
    const material = new THREE.MeshStandardMaterial({
      color: washedColor,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0
    });
    material.depthWrite = false;
    this.mutedFloorMaterialCache.set(key, material);
    return material;
  }
}