import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CropListing {
  id: number;
  farmerId: number;
  name: string;
  description?: string;
  pricePerKg: number;
  unit: string;
  quantity: number;
  availableQuantity: number;
  imageUrl?: string;
  category: string;
  isAvailable: boolean;
  isOrganic: boolean;
  isActive?: boolean;
  isPremium?: boolean;
  harvestDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  totalRatings?: number;
  farmer?: {
    id: number;
    firstName: string;
    lastName: string;
    farmName?: string;
    city?: string;
    state?: string;
    distance?: number;
    rating?: number;
    totalRatings?: number;
    isPremium?: boolean;
    hasVerifiedBadge?: boolean;
    isBoosted?: boolean;
    latitude?: number;
    longitude?: number;
    farmerProfile?: {
      id: number;
      farmName?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      profilePhoto?: string;
      website?: string;
      farmDescription?: string;
      isVerified: boolean;
      hasVerifiedBadge: boolean;
      isBoosted: boolean;
    };
  };
}

export interface CropFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  maxDistance?: number;
  minRating?: number;
  isOrganic?: boolean;
  isAvailable?: boolean;
  farmerPremium?: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CropSortOptions {
  field: 'price' | 'freshness' | 'distance' | 'rating' | 'createdAt';
  direction: 'asc' | 'desc';
}

export interface CropBrowseParams {
  page?: number;
  limit?: number;
  filters?: CropFilters;
  sort?: CropSortOptions;
}

export interface CropBrowseResponse {
  message: string;
  crops: CropListing[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
}

export interface CropCategory {
  name: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class CropBrowseService {
  private readonly API_URL = `${environment.backendUrl}/api`;

  constructor(private http: HttpClient) {}

  // Get 4 random premium crops for featured section
  getPremiumFeaturedCrops(limit = 4): Observable<{ message: string; crops: CropListing[] }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<{ message: string; crops: CropListing[] }>(
      `${this.API_URL}/crop/premium-featured`,
      { params }
    );
  }

  // Browse crops with filters and sorting
  browseCrops(params: CropBrowseParams): Observable<CropBrowseResponse> {
    let httpParams = new HttpParams();

    // Pagination
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    // Filters
    if (params.filters) {
      const filters = params.filters;
      
      if (filters.search) {
        httpParams = httpParams.set('search', filters.search);
      }
      if (filters.category) {
        httpParams = httpParams.set('category', filters.category);
      }
      if (filters.minPrice !== undefined) {
        httpParams = httpParams.set('minPrice', filters.minPrice.toString());
      }
      if (filters.maxPrice !== undefined) {
        httpParams = httpParams.set('maxPrice', filters.maxPrice.toString());
      }
      if (filters.maxDistance !== undefined) {
        httpParams = httpParams.set('maxDistance', filters.maxDistance.toString());
      }
      if (filters.minRating !== undefined) {
        httpParams = httpParams.set('minRating', filters.minRating.toString());
      }
      if (filters.isOrganic !== undefined) {
        httpParams = httpParams.set('isOrganic', filters.isOrganic.toString());
      }
      if (filters.isAvailable !== undefined) {
        httpParams = httpParams.set('isAvailable', filters.isAvailable.toString());
      }
      if (filters.farmerPremium !== undefined) {
        httpParams = httpParams.set('farmerPremium', filters.farmerPremium.toString());
      }
      if (filters.location) {
        httpParams = httpParams.set('latitude', filters.location.latitude.toString());
        httpParams = httpParams.set('longitude', filters.location.longitude.toString());
      }
    }

    // Sorting
    if (params.sort) {
      httpParams = httpParams.set('sortBy', params.sort.field);
      httpParams = httpParams.set('sortOrder', params.sort.direction);
    }

    return this.http.get<CropBrowseResponse>(`${this.API_URL}/crop/browse`, { params: httpParams });
  }

  // Get crop categories
  getCategories(): Observable<{ categories: CropCategory[] }> {
    return this.http.get<{ categories: CropCategory[] }>(`${this.API_URL}/crop/categories`);
  }

  // Get crop by ID
  getCropById(id: number): Observable<{ crop: CropListing }> {
    return this.http.get<{ crop: CropListing }>(`${this.API_URL}/crop/${id}`);
  }

  // Rate a farmer by farmer's user id
  rateFarmer(farmerUserId: number, rating: number): Observable<{ message: string; rating: number; totalRatings: number }> {
    return this.http.post<{ message: string; rating: number; totalRatings: number }>(
      `${this.API_URL}/farmer/farmers/${farmerUserId}/rate`,
      { rating }
    );
  }

  // Get user's rating for a farmer
  getUserRating(farmerUserId: number): Observable<{ rating: number | null }> {
    return this.http.get<{ rating: number | null }>(`${this.API_URL}/farmer/farmers/${farmerUserId}/my-rating`);
  }

  // Get farmer's crops
  getFarmerCrops(farmerId: number, params?: { page?: number; limit?: number }): Observable<CropBrowseResponse> {
    let httpParams = new HttpParams();
    
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<CropBrowseResponse>(`${this.API_URL}/crop/farmer/${farmerId}`, { params: httpParams });
  }

  // Helper methods
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  }

  formatDistance(distance?: number): string {
    if (!distance) return 'Distance unknown';
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysSinceHarvest(harvestDate?: string): number | null {
    if (!harvestDate) return null;
    
    const harvest = new Date(harvestDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - harvest.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  getFreshnessBadge(harvestDate?: string): { text: string; class: string } {
    return { text: 'Fresh', class: 'badge-fresh' };
    // const days = this.getDaysSinceHarvest(harvestDate);
    
    // if (days === null) {
    //   return { text: 'Unknown', class: 'badge-unknown' };
    // }
    
    // if (days <= 1) {
    //   return { text: 'Very Fresh', class: 'badge-very-fresh' };
    // } else if (days <= 3) {
    //   return { text: 'Fresh', class: 'badge-fresh' };
    // } else if (days <= 7) {
    //   return { text: 'Good', class: 'badge-good' };
    // } else {
    //   return { text: 'Older', class: 'badge-older' };
    // }
  }

  getRatingStars(rating?: number): { full: number; half: boolean; empty: number } {
    if (!rating) {
      return { full: 0, half: false, empty: 5 };
    }
    
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    
    return { full, half, empty };
  }

  getPremiumBadges(farmer?: CropListing['farmer']): string[] {
    if (!farmer) return [];
    
    const badges: string[] = [];
    
    if (farmer.isPremium) {
      badges.push('Premium');
    }
    if (farmer.hasVerifiedBadge) {
      badges.push('Verified');
    }
    if (farmer.isBoosted) {
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

  // Default sort options
  getDefaultSortOptions(): CropSortOptions[] {
    return [
      { field: 'freshness', direction: 'asc' },
      { field: 'distance', direction: 'asc' },
      { field: 'price', direction: 'asc' },
      { field: 'rating', direction: 'desc' },
      { field: 'createdAt', direction: 'desc' }
    ];
  }

  getSortDisplayName(sort: CropSortOptions): string {
    const fieldNames: Record<string, string> = {
      price: 'Price',
      freshness: 'Freshness',
      distance: 'Distance',
      rating: 'Rating',
      createdAt: 'Newest'
    };
    
    const direction = sort.direction === 'asc' ? ' (Low to High)' : ' (High to Low)';
    
    return fieldNames[sort.field] + direction;
  }

  // Default filter values
  getDefaultFilters(): CropFilters {
    return {
      isAvailable: true,
      isOrganic: undefined,
      farmerPremium: undefined
    };
  }

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
