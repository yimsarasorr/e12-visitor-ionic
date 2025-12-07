import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, UserProfile } from '../../../services/auth.service';
// 1. Import Icon ที่ต้องใช้
import { addIcons } from 'ionicons';
import { chevronDownOutline, personCircleOutline, alertCircle } from 'ionicons/icons';

@Component({
  selector: 'app-fastpass-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './fastpass-header.component.html',
  styleUrls: ['./fastpass-header.component.scss']
})
export class FastpassHeaderComponent implements OnInit, OnDestroy {
  @Input() selectedUserId: string | null = null;
  @Output() userSelected = new EventEmitter<UserProfile>();

  users: UserProfile[] = [];
  isLoading = false;
  loadError: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {
    // 2. ลงทะเบียน Icon ตรงนี้ครับ
    addIcons({ 
      'chevron-down-outline': chevronDownOutline,
      'person-circle-outline': personCircleOutline,
      'alert-circle': alertCircle
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onUserChange(event: CustomEvent): void {
    const value = event.detail.value as string | null;
    this.selectedUserId = value;
    const selectedUser = this.users.find(user => user.id === value) || null;
    if (selectedUser) {
      this.userSelected.emit(selectedUser);
    }
  }

  retry(): void {
    this.fetchUsers();
  }

  private fetchUsers(): void {
    this.isLoading = true;
    this.loadError = null;

    this.authService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: users => {
          this.users = users;
          if (!this.selectedUserId && users.length > 0) {
            this.selectedUserId = users[0].id;
            this.userSelected.emit(users[0]);
          } else if (this.selectedUserId) {
            const preselected = users.find(user => user.id === this.selectedUserId);
            if (preselected) {
              this.userSelected.emit(preselected);
            }
          }
        },
        error: err => {
          console.error('Failed to load users', err);
          this.loadError = 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้';
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }
}