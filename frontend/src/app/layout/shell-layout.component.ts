import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

type MenuItem = { label: string; path: string; icon?: string };

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shell-layout.component.html'
})
export class ShellLayoutComponent implements OnInit {
  sidebarOpen = true;
  menuItems: MenuItem[] = [];
  user: any = null;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    const persisted = localStorage.getItem('sidebarOpen');
    if (persisted !== null) {
      this.sidebarOpen = persisted === 'true';
    }
    this.user = this.auth.getCurrentUser();
    const role = this.user?.role as 'admin' | 'farmer' | 'consumer' | undefined;
    this.menuItems = this.buildMenu(role);
  }

  private buildMenu(role?: 'admin' | 'farmer' | 'consumer'): MenuItem[] {
    if (role === 'admin') {
      return [
        { label: 'Dashboard', path: '/admin-dashboard', icon: '📊' },
        { label: 'Farmers', path: '/admin-dashboard', icon: '🚜' },
        { label: 'Consumers', path: '/admin-dashboard', icon: '🛒' },
        { label: 'Listings', path: '/admin-dashboard', icon: '🧺' },
        { label: 'Verification', path: '/admin-dashboard', icon: '✅' }
      ];
    }
    if (role === 'farmer') {
      return [
        { label: 'Dashboard', path: '/farmer-dashboard', icon: '📊' },
        { label: 'Profile', path: '/farmer-profile', icon: '👤' },
        { label: 'My Crops', path: '/crop-management', icon: '🌾' },
        { label: 'Orders', path: '/order-management', icon: '📋' },
        { label: 'Browse Crops', path: '/browse-crops', icon: '🧺' }
      ];
    }
    if (role === 'consumer') {
      return [
        { label: 'Dashboard', path: '/consumer-dashboard', icon: '📊' },
        { label: 'Browse Crops', path: '/browse-crops', icon: '🧺' },
        { label: 'Find Farmers', path: '/farmers', icon: '📍' }
      ];
    }
    // Public default menu
    return [
      { label: 'Browse Crops', path: '/browse-crops', icon: '🧺' },
      { label: 'Find Farmers', path: '/farmers', icon: '📍' },
      { label: 'Login', path: '/login', icon: '🔐' },
      { label: 'Sign Up', path: '/signup', icon: '✍️' }
    ];
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    localStorage.setItem('sidebarOpen', String(this.sidebarOpen));
  }

  logout(): void {
    this.auth.logout();
  }

  onNavClick(): void {
    // Auto-close sidebar only on small screens
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.sidebarOpen = false;
      localStorage.setItem('sidebarOpen', 'false');
    }
  }
}



