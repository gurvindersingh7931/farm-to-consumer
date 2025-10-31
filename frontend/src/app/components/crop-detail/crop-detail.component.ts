import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CropBrowseService, CropListing } from '../../services/crop-browse.service';
import { AuthService } from '../../services/auth.service';
import { CropService } from '../../services/crop.service';
import { MapsService } from '../../services/maps.service';


import { OrderPlacementComponent, CropForOrder } from '../order-placement/order-placement.component';

@Component({
  selector: 'app-crop-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, OrderPlacementComponent],
  templateUrl: './crop-detail.component.html',
  styleUrls: ['./crop-detail.component.scss']
})
export class CropDetailComponent implements OnInit, OnDestroy {
  crop: CropListing | null = null;
  isLoading = false;
  errorMessage = '';
  currentRating = 0;
  userRating = 0;
  isSubmittingRating = false;
  showOrderModal = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    public route: ActivatedRoute,
    private router: Router,
    private cropBrowseService: CropBrowseService,
    private authService: AuthService,
    public cropService: CropService,
    private maps: MapsService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const cropId = params['id'];
      if (cropId) {
        this.loadCropDetails(cropId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCropDetails(cropId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cropBrowseService.getCropById(parseInt(cropId)).subscribe({
      next: (response) => {
        this.crop = response.crop;
        this.currentRating = this.crop.averageRating || 0;
        this.isLoading = false;
        // Initialize map if coordinates available
        const lat = this.crop?.farmer?.farmerProfile?.latitude;
        const lng = this.crop?.farmer?.farmerProfile?.longitude;
        if (lat && lng) {
          this.maps.load().then(() => {
            const el = document.getElementById('cropMap');
            if (el) this.maps.initMap(el, lat, lng, 13);
          });
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load crop details';
        this.isLoading = false;
      }
    });
  }

  getCropImageUrl(imageUrl?: string): string {
    return this.cropService.getCropImageUrl(imageUrl, this.crop?.category);
  }

  getFarmerImageUrl(imageUrl?: string): string {
    if (!imageUrl) {
      return '/assets/images/default-farmer-avatar.png';
    }

    if (imageUrl.startsWith('uploads/')) {
      return `http://localhost:3000/${imageUrl}`;
    }

    return imageUrl;
  }

  getFarmerName(): string {
    if (!this.crop?.farmer) return 'Unknown Farmer';
    
    if (this.crop.farmer.farmerProfile?.farmName) {
      return this.crop.farmer.farmerProfile.farmName;
    }
    
    return `${this.crop.farmer.firstName} ${this.crop.farmer.lastName}`;
  }

  getFarmerLocation(): string {
    if (!this.crop?.farmer?.farmerProfile) return '';
    
    const parts = [
      this.crop.farmer.farmerProfile.city,
      this.crop.farmer.farmerProfile.state
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  getFullAddress(): string {
    if (!this.crop?.farmer?.farmerProfile) return '';
    
    const parts = [
      this.crop.farmer.farmerProfile.address,
      this.crop.farmer.farmerProfile.city,
      this.crop.farmer.farmerProfile.state,
      this.crop.farmer.farmerProfile.zipCode,
      this.crop.farmer.farmerProfile.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  getFreshnessBadge(harvestDate?: string): { text: string; class: string } {
    if (!harvestDate) {
      return { text: 'Unknown', class: 'badge-unknown' };
    }

    const harvest = new Date(harvestDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - harvest.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      return { text: 'Just Harvested', class: 'badge-fresh' };
    } else if (daysDiff <= 3) {
      return { text: 'Very Fresh', class: 'badge-very-fresh' };
    } else if (daysDiff <= 7) {
      return { text: 'Fresh', class: 'badge-fresh' };
    } else if (daysDiff <= 14) {
      return { text: 'Good', class: 'badge-good' };
    } else {
      return { text: 'Older', class: 'badge-old' };
    }
  }

  getRatingStars(rating: number): { full: number; half: boolean; empty: number } {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    
    return { full, half, empty };
  }

  onStarClick(rating: number): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.userRating = rating;
    this.submitRating(rating);
  }

  submitRating(rating: number): void {
    if (!this.crop || this.isSubmittingRating) return;
    
    this.isSubmittingRating = true;
    
    // TODO: Implement rating submission API
    setTimeout(() => {
      this.currentRating = (this.currentRating + rating) / 2; // Simple average for demo
      this.isSubmittingRating = false;
    }, 1000);
  }

  contactFarmer(): void {
    if (!this.crop?.farmer) return;
    
    // TODO: Implement contact farmer functionality
    alert(`Contacting ${this.getFarmerName()}...`);
  }

  goBack(): void {
    this.router.navigate(['/browse-crops']);
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  getPremiumBadges(): string[] {
    if (!this.crop?.farmer) return [];
    
    const badges: string[] = [];
    
    if (this.crop.farmer.isPremium) {
      badges.push('Premium');
    }
    
    if (this.crop.farmer.farmerProfile?.hasVerifiedBadge) {
      badges.push('Verified');
    }
    
    if (this.crop.farmer.farmerProfile?.isBoosted) {
      badges.push('Boosted');
    }
    
    return badges;
  }

  getBadgeClass(badge: string): string {
    switch (badge.toLowerCase()) {
      case 'premium':
        return 'badge-premium';
      case 'verified':
        return 'badge-verified';
      case 'boosted':
        return 'badge-boosted';
      default:
        return 'badge-default';
    }
  }

  openOrderModal(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const user = this.authService.getCurrentUser();
    if (user?.role !== 'consumer') {
      alert('Only consumers can place orders');
      return;
    }

    this.showOrderModal = true;
  }

  closeOrderModal(): void {
    this.showOrderModal = false;
  }

  getCropForOrder(): CropForOrder | null {
    if (!this.crop) return null;

    return {
      id: this.crop.id,
      name: this.crop.name,
      pricePerKg: this.crop.pricePerKg,
      availableQuantity: this.crop.availableQuantity,
      unit: this.crop.unit,
      imageUrl: this.crop.imageUrl,
      farmer: this.crop.farmer
    };
  }

  onImageError(event: Event, fallbackSrc: string): void {
    const img = event?.target as HTMLImageElement | null;
    if (img) img.src = fallbackSrc;
  }
}
