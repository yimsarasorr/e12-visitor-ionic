import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService, UserProfile } from '../../../services/auth.service';
import { addIcons } from 'ionicons';
import { personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-fastpass-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './fastpass-header.component.html',
  styleUrls: ['./fastpass-header.component.scss']
})
export class FastpassHeaderComponent implements OnInit {
  @Input() userProfile: UserProfile | null = null;
  @Output() userSelected = new EventEmitter<UserProfile>();

  currentUser: UserProfile | null = null;
  users: UserProfile[] = [];
  selectedUserId: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService) {
    addIcons({ 'person-circle-outline': personCircleOutline });
  }

  async ngOnInit() {
    if (this.userProfile) {
      this.currentUser = this.userProfile;
    } else {
      this.fetchUsers();
    }
  }

  private fetchUsers(): void {
    this.isLoading = true;
    this.authService.getCurrentUserProfile().subscribe({
      next: (user) => {
        if (user) {
          this.users = [user];
          this.selectedUserId = user.id;
          this.currentUser = user;
          this.userSelected.emit(user);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }
}