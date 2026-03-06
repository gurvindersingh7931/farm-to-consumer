import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { FarmerService, FarmerProfile, SearchFarmersParams } from '../../services/farmer.service';
import { MapsService } from '../../services/maps.service';
import {
  FARMERS_LIST_DEFAULT_PAGE_SIZE,
  FARMERS_LIST_DEFAULT_RADIUS_KM,
  FARMERS_LIST_PAGE_SIZE_OPTIONS,
  FARMERS_LIST_RADIUS_OPTIONS_KM
} from '../../constants/farmers-list.constants';

@Component({
  selector: 'app-farmers-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './farmers-list.component.html',
  styleUrl: './farmers-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FarmersListComponent implements OnInit {
  farmers: FarmerProfile[] = [];
  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  locationQuery = '';
  premiumFilter = false;
  totalItems = 0;

  pageIndex = 0;
  pageSize = FARMERS_LIST_DEFAULT_PAGE_SIZE;
  readonly pageSizeOptions = [...FARMERS_LIST_PAGE_SIZE_OPTIONS];

  // Location and radius filtering
  userLatitude: number | null = null;
  userLongitude: number | null = null;
  selectedRadius = FARMERS_LIST_DEFAULT_RADIUS_KM;
  readonly radiusOptions = [...FARMERS_LIST_RADIUS_OPTIONS_KM];
  isLocationEnabled = false;
  isLocationAvailable = false;

  constructor(
    private farmerService: FarmerService,
    private maps: MapsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.getCurrentLocation();
    this.loadFarmers();
  }

  loadFarmers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const params: SearchFarmersParams = {
      q: this.searchQuery || undefined,
      location: this.locationQuery || undefined,
      premium: this.premiumFilter || undefined,
      limit: this.pageSize,
      offset: this.pageIndex * this.pageSize,
      latitude: this.userLatitude || undefined,
      longitude: this.userLongitude || undefined,
      radius: this.isLocationEnabled ? this.selectedRadius : undefined
    };

    this.farmerService
      .searchFarmers(params)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.farmers = response.farmers;
          this.totalItems = response.total;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to load farmers';
          this.cdr.markForCheck();
        }
      });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadFarmers();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadFarmers();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.locationQuery = '';
    this.premiumFilter = false;
    this.isLocationEnabled = false;
    this.selectedRadius = FARMERS_LIST_DEFAULT_RADIUS_KM;
    this.pageIndex = 0;
    this.loadFarmers();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadFarmers();
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
          this.isLocationAvailable = true;
        },
        (error) => {
          console.error('Error getting location:', error);
          this.isLocationAvailable = false;
          this.isLocationEnabled = false;
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      this.isLocationAvailable = false;
      this.isLocationEnabled = false;
    }
  }

  onRadiusChange(): void {
    if (this.isLocationEnabled) {
      this.pageIndex = 0;
      this.loadFarmers();
    }
  }

  toggleLocationFilter(): void {
    if (!this.isLocationAvailable) {
      this.isLocationEnabled = false;
      return;
    }
    this.isLocationEnabled = !this.isLocationEnabled;
    this.pageIndex = 0;
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
