import { Component, OnInit, Input } from '@angular/core'; // ✅ ลบ Output, EventEmitter ออก
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
  
  currentUser: UserProfile | null = null;

  constructor(private authService: AuthService) {
    addIcons({ 'person-circle-outline': personCircleOutline });
  }

  async ngOnInit() {
    if (this.userProfile) {
      this.currentUser = this.userProfile;
    } else {
      this.authService.getCurrentUserProfile().subscribe(profile => {
        this.currentUser = profile;
      });
    }
  }
}