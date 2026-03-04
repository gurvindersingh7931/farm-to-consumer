import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface FarmerProfile {
  id?: number;
  userId: number;
  phone?: string;
  farmName?: string;
  farmDescription?: string;
  farmLocation?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  profilePhoto?: string;
  website?: string;
  isVerified?: boolean;
  hasVerifiedBadge?: boolean;
  isBoosted?: boolean;
  rating?: number;
  totalRatings?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: any;
}

export interface CreateFarmerProfileRequest {
  phone?: string;
  farmName?: string;
  farmDescription?: string;
  farmLocation?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
}

export interface UpdateFarmerProfileRequest extends CreateFarmerProfileRequest {}

export interface FarmerProfileResponse {
  message: string;
  farmer: FarmerProfile;
}

export interface FarmersResponse {
  message: string;
  farmers: FarmerProfile[];
  total: number;
}

export interface SearchFarmersParams {
  q?: string;
  location?: string;
  premium?: boolean;
  limit?: number;
  offset?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface SearchFarmersResponse {
  message: string;
  farmers: FarmerProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdatePremiumStatusRequest {
  hasVerifiedBadge?: boolean;
  isBoosted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FarmerService {
  private readonly API_URL = 'http://localhost:3000/api';

  private currentFarmerProfileSubject = new BehaviorSubject<FarmerProfile | null>(null);
  currentFarmerProfile$ = this.currentFarmerProfileSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  // For FormData uploads: DO NOT set Content-Type; browser sets multipart boundary
  private getAuthOnlyHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  // Create farmer profile
  createProfile(profileData: CreateFarmerProfileRequest, profilePhoto?: File): Observable<FarmerProfileResponse> {
    const formData = new FormData();
    
    // Append profile data
    Object.keys(profileData).forEach(key => {
      const value = profileData[key as keyof CreateFarmerProfileRequest];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Append profile photo if provided
    if (profilePhoto) {
      formData.append('profilePhoto', profilePhoto);
    }

    return this.http.post<FarmerProfileResponse>(`${this.API_URL}/farmer/profile`, formData, {
      headers: this.getAuthOnlyHeaders()
    });
  }

  // Get farmer profile
  getProfile(): Observable<FarmerProfileResponse> {
    return this.http.get<FarmerProfileResponse>(`${this.API_URL}/farmer/profile`, {
      headers: this.getAuthHeaders()
    });
  }

  // Update farmer profile
  updateProfile(profileData: UpdateFarmerProfileRequest, profilePhoto?: File): Observable<FarmerProfileResponse> {
    const formData = new FormData();
    
    // Append profile data
    Object.keys(profileData).forEach(key => {
      const value = profileData[key as keyof UpdateFarmerProfileRequest];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Append profile photo if provided
    if (profilePhoto) {
      formData.append('profilePhoto', profilePhoto);
    }

    return this.http.put<FarmerProfileResponse>(`${this.API_URL}/farmer/profile`, formData, {
      headers: this.getAuthOnlyHeaders()
    });
  }

  // Delete farmer profile
  deleteProfile(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/farmer/profile`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all farmers (public)
  getAllFarmers(params?: { search?: string; location?: string; premium?: boolean }): Observable<FarmersResponse> {
    let url = `${this.API_URL}/farmer/farmers`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.location) queryParams.append('location', params.location);
      if (params.premium !== undefined) queryParams.append('premium', params.premium.toString());
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.http.get<FarmersResponse>(url);
  }

  // Search farmers (public)
  searchFarmers(params: SearchFarmersParams): Observable<SearchFarmersResponse> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.location) queryParams.append('location', params.location);
    if (params.premium !== undefined) queryParams.append('premium', params.premium.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.latitude) queryParams.append('latitude', params.latitude.toString());
    if (params.longitude) queryParams.append('longitude', params.longitude.toString());
    if (params.radius) queryParams.append('radius', params.radius.toString());

    const url = `${this.API_URL}/farmer/farmers/search?${queryParams.toString()}`;
    return this.http.get<SearchFarmersResponse>(url);
  }

  // Get farmer by ID (public)
  getFarmerById(id: number): Observable<FarmerProfileResponse> {
    return this.http.get<FarmerProfileResponse>(`${this.API_URL}/farmer/farmers/${id}`);
  }

  // Update premium status (farmer only)
  updatePremiumStatus(premiumData: UpdatePremiumStatusRequest): Observable<FarmerProfileResponse> {
    return this.http.put<FarmerProfileResponse>(`${this.API_URL}/farmer/premium-status`, premiumData, {
      headers: this.getAuthHeaders()
    });
  }

  // Helper methods
  getProfilePhotoUrl(profilePhoto?: string): string {
    if (!profilePhoto) {
      return '/assets/default-farmer.png';
    }
    // Absolute S3 URL
    if (profilePhoto.startsWith('http://') || profilePhoto.startsWith('https://')) {
      return profilePhoto;
    }
    // Relative path starting with /uploads
    if (profilePhoto.startsWith('/uploads')) {
      return `${environment.backendUrl}${profilePhoto}`;
    }
    // Legacy relative path without leading slash
    if (profilePhoto.startsWith('uploads/')) {
      return `${environment.backendUrl}/${profilePhoto}`;
    }
    return profilePhoto;
  }

  setCurrentFarmerProfile(profile: FarmerProfile | null): void {
    this.currentFarmerProfileSubject.next(profile);
  }


  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  validateWebsite(website: string): boolean {
    if (!website) return true; // Optional field
    const websiteRegex = /^https?:\/\/.+\..+/;
    return websiteRegex.test(website);
  }

  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  }

  // Premium feature helpers
  isPremiumFarmer(farmer: FarmerProfile): boolean {
    return farmer.user?.isPremium || false;
  }

  hasVerifiedBadge(farmer: FarmerProfile): boolean {
    return farmer.hasVerifiedBadge || false;
  }

  isBoosted(farmer: FarmerProfile): boolean {
    return farmer.isBoosted || false;
  }

  getPremiumBadges(farmer: FarmerProfile): string[] {
    const badges: string[] = [];
    if (this.isPremiumFarmer(farmer)) {
      badges.push('Premium');
    }
    if (this.hasVerifiedBadge(farmer)) {
      badges.push('Verified');
    }
    if (this.isBoosted(farmer)) {
      badges.push('Boosted');
    }
    return badges;
  }

  getPremiumBadgeClass(badge: string): string {
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
