import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FarmerService, FarmerProfile, SearchFarmersParams } from '../../services/farmer.service';
import { MapsService } from '../../services/maps.service';

@Component({
  selector: 'app-farmers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './farmers-list.component.html',
  styleUrl: './farmers-list.component.scss'
})
export class FarmersListComponent implements OnInit {
  farmers: FarmerProfile[] = [];
  filteredFarmers: FarmerProfile[] = [];
  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  locationQuery = '';
  premiumFilter = false;
  currentPage = 1;
  itemsPerPage = 12;
  totalItems = 0;
  
  // Make Math available in template
  Math = Math;
  
  // Location and radius filtering
  userLatitude: number | null = null;
  userLongitude: number | null = null;
  selectedRadius = 10; // Default 10km
  radiusOptions = [2, 5, 10, 15, 20];
  isLocationEnabled = false;

  constructor(
    private farmerService: FarmerService,
    private maps: MapsService
  ) {}

  ngOnInit(): void {
    this.getCurrentLocation();
    this.loadFarmers();
  }

  loadFarmers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: SearchFarmersParams = {
      q: this.searchQuery || undefined,
      location: this.locationQuery || undefined,
      premium: this.premiumFilter || undefined,
      limit: this.itemsPerPage,
      offset: (this.currentPage - 1) * this.itemsPerPage,
      latitude: this.userLatitude || undefined,
      longitude: this.userLongitude || undefined,
      radius: this.isLocationEnabled ? this.selectedRadius : undefined
    };

    this.farmerService.searchFarmers(params).subscribe({
      next: (response) => {
        this.farmers = response.farmers;
        this.filteredFarmers = response.farmers;
        this.totalItems = response.total;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load farmers';
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadFarmers();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadFarmers();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.locationQuery = '';
    this.premiumFilter = false;
    this.isLocationEnabled = false;
    this.selectedRadius = 10;
    this.currentPage = 1;
    this.loadFarmers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadFarmers();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getProfilePhotoUrl(profilePhoto?: string): string {
    return this.farmerService.getProfilePhotoUrl(profilePhoto);
  }

  getPremiumBadges(farmer: FarmerProfile): string[] {
    return this.farmerService.getPremiumBadges(farmer);
  }

  getPremiumBadgeClass(badge: string): string {
    return this.farmerService.getPremiumBadgeClass(badge);
  }

  isPremiumFarmer(farmer: FarmerProfile): boolean {
    return this.farmerService.isPremiumFarmer(farmer);
  }

  hasVerifiedBadge(farmer: FarmerProfile): boolean {
    return this.farmerService.hasVerifiedBadge(farmer);
  }

  isBoosted(farmer: FarmerProfile): boolean {
    return this.farmerService.isBoosted(farmer);
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLatitude = position.coords.latitude;
          this.userLongitude = position.coords.longitude;
          this.isLocationEnabled = true;
        },
        (error) => {
          console.error('Error getting location:', error);
          this.isLocationEnabled = false;
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      this.isLocationEnabled = false;
    }
  }

  onRadiusChange(): void {
    if (this.isLocationEnabled) {
      this.currentPage = 1;
      this.loadFarmers();
    }
  }

  toggleLocationFilter(): void {
    this.isLocationEnabled = !this.isLocationEnabled;
    this.currentPage = 1;
    this.loadFarmers();
  }

  calculateDistance(farmer: FarmerProfile): number | null {
    if (!this.userLatitude || !this.userLongitude || !farmer.latitude || !farmer.longitude) {
      return null;
    }
    return this.maps.distanceKm(
      this.userLatitude,
      this.userLongitude,
      farmer.latitude,
      farmer.longitude
    );
  }

  formatDistance(distance: number): string {
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  }
}
