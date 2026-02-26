import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { CropCardComponent, CropCardData } from '../../shared/crop-card/crop-card.component';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CropBrowseService, CropListing, CropFilters, CropSortOptions, CropCategory } from '../../services/crop-browse.service';
import { CropService } from '../../services/crop.service';
import { MapsService } from '../../services/maps.service';

@Component({
  selector: 'app-crop-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, PaginationComponent, CropCardComponent],
  templateUrl: './crop-browse.component.html',
  styleUrls: ['./crop-browse.component.scss']
})
export class CropBrowseComponent implements OnInit, OnDestroy {
  crops: CropListing[] = [];
  categories: CropCategory[] = [];
  isLoading = false;
  errorMessage = '';
  
  // View mode
  viewMode: 'grid' | 'list' = 'grid';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalCrops = 0;
  limit = 12;
  
  // Location and radius filtering
  userLatitude: number | null = null;
  userLongitude: number | null = null;
  selectedRadius = 10; // Default 10km
  radiusOptions = [2, 5, 10, 15, 20];
  isLocationEnabled = false;
  
  // Filters
  filters: CropFilters = {
    isAvailable: true
  };
  
  // Sort options
  sortOptions: CropSortOptions[] = [];
  selectedSort: CropSortOptions = { field: 'freshness', direction: 'asc' };
  
  // Search
  searchTerm = '';
  private searchSubject = new Subject<string>();
  
  // Filter UI state
  showFilters = false;
  showSortOptions = false;
  
  // Price range
  minPrice = 0;
  maxPrice = 100;
  priceRange = { min: 0, max: 100 };
  
  // Distance
  maxDistance = 50;
  userLocation: { latitude: number; longitude: number } | null = null;
  
  // Rating
  minRating = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private cropBrowseService: CropBrowseService,
    private authService: AuthService,
    public cropService: CropService,
    private maps: MapsService
  ) {
    // Debounce search input
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filters.search = searchTerm;
        this.currentPage = 1;
        this.loadCrops();
      });
  }

  ngOnInit(): void {
    this.getCurrentLocation();
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async initializeComponent(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Load categories and initial data in parallel
      await Promise.all([
        this.loadCategories(),
        this.getUserLocation(),
        this.loadCrops()
      ]);
      
      this.sortOptions = this.cropBrowseService.getDefaultSortOptions();
    } catch (error) {
      this.errorMessage = 'Failed to initialize crop browser';
      console.error('Initialization error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadCategories(): Promise<void> {
    try {
      const response = await this.cropBrowseService.getCategories().toPromise();
      this.categories = response?.categories || [];
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async getUserLocation(): Promise<void> {
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          });
        });
        
        this.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        this.filters.location = this.userLocation;
      } catch (error) {
        console.warn('Could not get user location:', error);
      }
    }
  }

  loadCrops(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params = {
      page: this.currentPage,
      limit: this.limit,
      filters: this.filters,
      sort: this.selectedSort
    };

    this.cropBrowseService.browseCrops(params).subscribe({
      next: (response) => {
        this.crops = response.crops;
        this.totalCrops = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.page;
        
        // Update price range from response
        if (response.filters?.priceRange) {
          this.priceRange = response.filters.priceRange;
          this.minPrice = this.priceRange.min;
          this.maxPrice = this.priceRange.max;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load crops';
        this.isLoading = false;
      }
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadCrops();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadCrops();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadCrops();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleSortOptions(): void {
    this.showSortOptions = !this.showSortOptions;
  }

  clearFilters(): void {
    this.filters = this.cropBrowseService.getDefaultFilters();
    this.searchTerm = '';
    this.minPrice = this.priceRange.min;
    this.maxPrice = this.priceRange.max;
    this.maxDistance = 50;
    this.minRating = 0;
    this.currentPage = 1;
    this.loadCrops();
  }

  onPriceRangeChange(): void {
    this.filters.minPrice = this.minPrice;
    this.filters.maxPrice = this.maxPrice;
    this.onFilterChange();
  }

  onDistanceChange(): void {
    this.filters.maxDistance = this.maxDistance;
    this.onFilterChange();
  }

  onRatingChange(): void {
    this.filters.minRating = this.minRating;
    this.onFilterChange();
  }

  logout(): void {
    this.authService.logout();
  }

  // Helper methods
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  formatPrice(price: number): string {
    return this.cropBrowseService.formatPrice(price);
  }

  formatDistance(distance?: number): string {
    return this.cropBrowseService.formatDistance(distance);
  }

  formatDate(dateString: string): string {
    return this.cropBrowseService.formatDate(dateString);
  }

  getFreshnessBadge(harvestDate?: string): { text: string; class: string } {
    return this.cropBrowseService.getFreshnessBadge(harvestDate);
  }

  getRatingStars(rating?: number): { full: number; half: boolean; empty: number } {
    return this.cropBrowseService.getRatingStars(rating);
  }

  getPremiumBadges(farmer?: CropListing['farmer']): string[] {
    return this.cropBrowseService.getPremiumBadges(farmer);
  }

  getBadgeClass(badge: string): string {
    return this.cropBrowseService.getBadgeClass(badge);
  }

  getSortDisplayName(sort: CropSortOptions): string {
    return this.cropBrowseService.getSortDisplayName(sort);
  }

  getCropImageUrl(crop: CropListing): string {
    const imageUrl = (crop as any).image_url ?? crop.imageUrl;
    return this.cropService.getCropImageUrl(imageUrl, crop.category);
  }

  getCropCardData(crop: CropListing): CropCardData {
    const distance = this.calculateDistance(crop);
    const imageUrl = (crop as any).image_url ?? crop.imageUrl;
    const qty = crop.availableQuantity ?? crop.quantity ?? 0;
    const unit = crop.unit ?? 'kg';
    return {
      name: crop.name,
      imageUrl: this.cropService.getCropImageUrl(imageUrl, crop.category),
      priceText: this.formatPrice(crop.pricePerKg),
      fallbackImageUrl: this.cropService.getFallbackImage(crop.category),
      category: crop.category,
      description: crop.description ?? null, 
      quantityText: `${qty} ${unit} available`,
      isOrganic: crop.isOrganic,
      freshnessBadge: this.getFreshnessBadge(crop.harvestDate),
      premiumBadges: this.getPremiumBadges(crop.farmer),
      isPremium: crop.isPremium,
      statusLabel: this.getStatusDisplayText(this.getCropStatus(crop)),
      statusClass: this.getStatusColorClass(this.getCropStatus(crop)),
      harvestDate: crop.harvestDate ?? null,
      expiryDate: crop.expiryDate ?? null,
      isActive: crop.isActive,
      isAvailable: crop.isAvailable,
      farmerName: this.getFarmerName(crop.farmer),
      farmerLocation: this.getFarmerLocation(crop.farmer),
      distanceText: this.isLocationEnabled && distance !== null ? `${this.formatDistanceNative(distance)} away` : undefined,
      ratingValue: crop.farmer?.rating,
      ratingInfo: crop.farmer?.rating != null ? this.getRatingStars(crop.farmer.rating) : null,
      detailLink: ['/crop-detail', crop.id],
      farmerLink: crop?.farmer?.id != null ? ['/farmer-detail', crop.farmer.id] : null,
    };
  }


  getCropStatus(crop: any): string {
    return this.cropService.getCropStatus(crop);
  }

  getStatusColorClass(status: string): string {
    return this.cropService.getStatusColorClass(status);
  }

  getStatusDisplayText(status: string): string {
    return this.cropService.getStatusDisplayText(status);
  }

  getFarmerName(farmer?: CropListing['farmer']): string {
    if (!farmer) return 'Unknown Farmer';
    
    if (farmer.farmName) {
      return farmer.farmName;
    }
    
    return `${farmer.firstName} ${farmer.lastName}`;
  }

  getFarmerLocation(farmer?: CropListing['farmer']): string {
    if (!farmer) return '';
    
    const parts = [farmer.city, farmer.state].filter(Boolean);
    return parts.join(', ');
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLatitude = position.coords.latitude;
          this.userLongitude = position.coords.longitude;
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
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
      this.filters.maxDistance = this.selectedRadius;
      this.currentPage = 1;
      this.loadCrops();
    }
  }

  toggleLocationFilter(): void {
    this.isLocationEnabled = !this.isLocationEnabled;
    if (this.isLocationEnabled) {
      this.filters.maxDistance = this.selectedRadius;
    } else {
      this.filters.maxDistance = undefined;
    }
    this.currentPage = 1;
    this.loadCrops();
  }

  calculateDistance(crop: CropListing): number | null {
    if (!this.userLatitude || !this.userLongitude || !crop.farmer?.latitude || !crop.farmer?.longitude) {
      return null;
    }
    return this.maps.distanceKm(
      this.userLatitude,
      this.userLongitude,
      crop.farmer.latitude,
      crop.farmer.longitude
    );
  }

  formatDistanceNative(distance: number): string {
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  }

  onImageError(event: Event, fallbackSrc: string): void {
    const img = event?.target as HTMLImageElement | null;
    if (img) img.src = fallbackSrc;
  }
}
