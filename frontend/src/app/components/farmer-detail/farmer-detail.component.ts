import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil } from 'rxjs';
import { FarmerService, FarmerProfile } from '../../services/farmer.service';
import { AuthService } from '../../services/auth.service';
import { CropBrowseService } from '../../services/crop-browse.service';
import { MapsService } from '../../services/maps.service';

@Component({
  selector: 'app-farmer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatCardModule, MatButtonModule, MatChipsModule],
  templateUrl: './farmer-detail.component.html',
  styleUrls: ['./farmer-detail.component.scss']
})
export class FarmerDetailComponent implements OnInit, OnDestroy {
  farmerId: number | null = null;
  farmerProfile: FarmerProfile | null = null;
  isLoading = false;
  errorMessage = '';
  
  // Rating
  currentRating = 0;
  userRating = 0;
  totalRatings = 0;
  isSubmittingRating = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private farmerService: FarmerService,
    private authService: AuthService,
    private cropBrowseService: CropBrowseService,
    private maps: MapsService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = parseInt(params['id']);
      if (id) {
        this.farmerId = id;
        this.loadFarmerDetails();
      } else {
        this.errorMessage = 'Invalid farmer ID';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFarmerDetails(): void {
    if (!this.farmerId) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.farmerService.getFarmerById(this.farmerId).subscribe({
      next: (response) => {
        this.farmerProfile = response.farmer;
        this.currentRating = response.farmer.rating || 0;
        this.totalRatings = response.farmer.totalRatings || 0;
        this.isLoading = false;

        // Load user's existing rating if logged in
        if (this.authService.isAuthenticated() && this.farmerId) {
          this.loadUserRating(this.farmerId);
        }

        // Initialize map if coordinates available
        const lat = this.farmerProfile?.latitude;
        const lng = this.farmerProfile?.longitude;
        if (lat && lng) {
          setTimeout(() => {
            this.maps.load().then(() => {
              const el = document.getElementById('farmerMap');
              if (el) this.maps.initMap(el, lat, lng, 13);
            });
          }, 100);
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load farmer details';
        this.isLoading = false;
      }
    });
  }

  loadUserRating(farmerUserId: number): void {
    if (!this.authService.isAuthenticated()) return;
    
    this.cropBrowseService.getUserRating(farmerUserId).subscribe({
      next: (response) => {
        if (response.rating !== null) {
          this.userRating = response.rating;
        }
      },
      error: (error) => {
        console.log('No existing rating found');
      }
    });
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
    if (!this.farmerId || this.isSubmittingRating) return;
    
    this.isSubmittingRating = true;

    this.cropBrowseService.rateFarmer(this.farmerId, rating).subscribe({
      next: ({ rating: newAvg, totalRatings }) => {
        this.currentRating = newAvg;
        this.totalRatings = totalRatings;
        this.isSubmittingRating = false;
      },
      error: (error) => {
        console.error('Failed to rate farmer:', error);
        this.isSubmittingRating = false;
      }
    });
  }

  getFarmerName(): string {
    if (!this.farmerProfile) return 'Unknown Farmer';
    
    if (this.farmerProfile.farmName) {
      return this.farmerProfile.farmName;
    }
    
    return 'Farmer';
  }

  getFarmerLocation(): string {
    if (!this.farmerProfile) return '';
    
    const parts = [
      this.farmerProfile.city,
      this.farmerProfile.state
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  getFullAddress(): string {
    if (!this.farmerProfile) return '';
    
    const parts = [
      this.farmerProfile.address,
      this.farmerProfile.city,
      this.farmerProfile.state,
      this.farmerProfile.zipCode,
      this.farmerProfile.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  getPremiumBadges(): string[] {
    if (!this.farmerProfile) return [];
    
    const badges: string[] = [];
    
    if ((this.farmerProfile as any).isPremium) {
      badges.push('Premium');
    }
    
    if (this.farmerProfile.hasVerifiedBadge) {
      badges.push('Verified');
    }
    
    if (this.farmerProfile.isBoosted) {
      badges.push('Boosted');
    }
    
    return badges;
  }

  getRatingStars(rating: number): { full: number; half: boolean; empty: number } {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    
    return { full, half, empty };
  }

  getFarmerImageUrl(imageUrl?: string): string {
    if (!imageUrl) return '/assets/default-farmer.png';
    return this.farmerService.getProfilePhotoUrl(imageUrl);
  }

  onImageError(event: Event, fallbackSrc: string): void {
    const img = event?.target as HTMLImageElement | null;
    if (img) img.src = fallbackSrc;
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  goBack(): void {
    this.router.navigate(['/browse-crops']);
  }
}

