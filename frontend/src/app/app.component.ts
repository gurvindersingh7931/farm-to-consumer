import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
  sidebarOpen = true;

  constructor(private auth: AuthService, private router: Router) {}

  get isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  get user() {
    return this.auth.getCurrentUser();
  }

  get role(): 'admin' | 'farmer' | 'consumer' | null {
    const u = this.user;
    return u?.role ?? null;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.auth.logout();
  }

  // Navigation presets per role
  get menuItems(): { label: string; path: string; icon?: string }[] {
    if (!this.role) return [];
    if (this.role === 'admin') {
      return [
        { label: 'Dashboard', path: '/admin-dashboard', icon: '📊' },
        { label: 'Farmers', path: '/admin-dashboard', icon: '🚜' },
        { label: 'Consumers', path: '/admin-dashboard', icon: '🛒' },
        { label: 'Listings', path: '/admin-dashboard', icon: '🧺' },
        { label: 'Verification', path: '/admin-dashboard', icon: '✅' }
      ];
    }
    if (this.role === 'farmer') {
      return [
        { label: 'Dashboard', path: '/farmer-dashboard', icon: '📊' },
        { label: 'Profile', path: '/farmer-profile', icon: '👤' },
        { label: 'My Crops', path: '/crop-management', icon: '🌾' },
        { label: 'Orders', path: '/order-management', icon: '📋' },
        { label: 'Browse Crops', path: '/browse-crops', icon: '🧺' }
      ];
    }
    // consumer
    return [
      { label: 'Dashboard', path: '/consumer-dashboard', icon: '📊' },
      { label: 'Browse Crops', path: '/browse-crops', icon: '🧺' },
      { label: 'Find Farmers', path: '/farmers', icon: '📍' }
    ];
  }
}
