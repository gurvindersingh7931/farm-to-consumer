import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../services/auth.service';
import { FarmerService } from '../services/farmer.service';

type MenuItem = { label: string; path: string; icon: string };

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTooltipModule],
  templateUrl: './shell-layout.component.html'
})
export class ShellLayoutComponent implements OnInit {
  sidebarOpen = true;
  menuItems: MenuItem[] = [];
  user: any = null;
  avatarUrl: string | null = null;

  constructor(
    private auth: AuthService,
    private farmerService: FarmerService
  ) {}

  ngOnInit(): void {
    const persisted = localStorage.getItem('sidebarOpen');
    if (persisted !== null) {
      this.sidebarOpen = persisted === 'true';
    }
    // On small screens, always start with sidebar hidden so it doesn't shrink content
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.sidebarOpen = false;
    }

    this.user = this.auth.getCurrentUser();
    const role = this.user?.role as 'admin' | 'farmer' | 'consumer' | undefined;
    this.menuItems = this.buildMenu(role);

    if (role === 'farmer') {
      this.farmerService.currentFarmerProfile$.subscribe(profile => {
        if (profile?.profilePhoto) {
          this.avatarUrl = this.farmerService.getProfilePhotoUrl(profile.profilePhoto);
        } else {
          this.avatarUrl = null;
        }
      });

      this.farmerService.getProfile().subscribe({
        next: (response) => {
          this.farmerService.setCurrentFarmerProfile(response.farmer);
        },
        error: () => {
          this.avatarUrl = null;
        }
      });
    }
  }

  private buildMenu(role?: 'admin' | 'farmer' | 'consumer'): MenuItem[] {
    if (role === 'admin') {
      return [
        { label: 'Dashboard', path: '/admin-dashboard', icon: 'dashboard' },
        { label: 'Farmers', path: '/admin-dashboard', icon: 'agriculture' },
        { label: 'Consumers', path: '/admin-dashboard', icon: 'people' },
        { label: 'Listings', path: '/admin-dashboard', icon: 'inventory_2' },
        { label: 'Verification', path: '/admin-dashboard', icon: 'verified' }
      ];
    }
    if (role === 'farmer') {
      return [
        { label: 'Dashboard', path: '/farmer-dashboard', icon: 'dashboard' },
        { label: 'Profile', path: '/farmer-profile', icon: 'person' },
        { label: 'My Crops', path: '/crop-management', icon: 'yard' },
        { label: 'Orders', path: '/order-management', icon: 'receipt_long' },
        { label: 'Browse Crops', path: '/browse-crops', icon: 'shopping_basket' }
      ];
    }
    if (role === 'consumer') {
      return [
        { label: 'Dashboard', path: '/consumer-dashboard', icon: 'dashboard' },
        { label: 'Profile', path: '/consumer-profile', icon: 'person' },
        { label: 'Browse Crops', path: '/browse-crops', icon: 'shopping_basket' },
        { label: 'Find Farmers', path: '/farmers', icon: 'location_on' }
      ];
    }
    // Public default menu
    return [
      { label: 'Browse Crops', path: '/browse-crops', icon: 'shopping_basket' },
      { label: 'Find Farmers', path: '/farmers', icon: 'location_on' },
      { label: 'Login', path: '/login', icon: 'login' },
      { label: 'Sign Up', path: '/signup', icon: 'how_to_reg' }
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



