import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Crop {
  id?: number;
  farmerId: number;
  name: string;
  description?: string;
  pricePerKg: number | string;
  quantity: number | string;
  unit: string;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  isPremium: boolean;
  isAvailable: boolean;
  harvestDate?: string;
  expiryDate?: string;
  location?: string;
  organic: boolean;
  isOrganic?: boolean;
  createdAt?: string;
  updatedAt?: string;
  farmer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface CreateCropRequest {
  name: string;
  description?: string;
  pricePerKg: number | string;
  quantity: number | string;
  unit: string;
  category: string;
  harvestDate?: string;
  expiryDate?: string;
  location?: string;
  organic?: boolean;
}

export interface UpdateCropRequest extends CreateCropRequest {
  isActive?: boolean;
  isAvailable?: boolean;
  removeImage?: boolean;
}

export interface CropResponse {
  message: string;
  crop: Crop;
}

export interface CropsResponse {
  crops: Crop[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CategoriesResponse {
  categories: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CropService {
  private apiUrl = `${environment.backendUrl}/api/crop`;

  public categoryOptions = [
    'Vegetables',
    'Fruits',
    'Grains',
    'Herbs',
    'Nuts',
    'Legumes',
    'Root Vegetables',
    'Leafy Greens',
    'Berries',
    'Citrus',
    'Stone Fruits',
    'Tropical Fruits',
    'Cereals',
    'Spices',
    'Mushrooms',
    'Other'
  ];

  public unitOptions = [
    'kg',
    'lbs',
    'pieces',
    'bunches',
    'bags',
    'boxes',
    'crates',
    'tons',
    'grams',
    'ounces'
  ];

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders(contentType: 'json' | 'formData' = 'json'): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (contentType === 'json') {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  // Create crop
  createCrop(cropData: CreateCropRequest, image?: File): Observable<CropResponse> {
    const formData = new FormData();
    
    // Append crop data
    Object.keys(cropData).forEach(key => {
      const value = cropData[key as keyof CreateCropRequest];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Append image if provided
    if (image) {
      formData.append('image', image);
    }

    return this.http.post<CropResponse>(
      `${this.apiUrl}`,
      formData,
      { headers: this.getAuthHeaders('formData') }
    );
  }

  // Get farmer's crops
  getFarmerCrops(page: number = 1, limit: number = 10, category?: string, isActive?: boolean): Observable<CropsResponse> {
    let params = `page=${page}&limit=${limit}`;
    if (category) params += `&category=${category}`;
    if (isActive !== undefined) params += `&isActive=${isActive}`;

    return this.http.get<CropsResponse>(
      `${this.apiUrl}?${params}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Get crop by ID
  getCropById(id: number): Observable<{ crop: Crop }> {
    return this.http.get<{ crop: Crop }>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Update crop
  updateCrop(id: number, cropData: UpdateCropRequest, image?: File): Observable<CropResponse> {
    const formData = new FormData();
    
    // Append crop data
    Object.keys(cropData).forEach(key => {
      const value = cropData[key as keyof UpdateCropRequest];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Append image if provided
    if (image) {
      formData.append('image', image);
    }

    return this.http.put<CropResponse>(
      `${this.apiUrl}/${id}`,
      formData,
      { headers: this.getAuthHeaders('formData') }
    );
  }

  // Delete crop
  deleteCrop(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Get all crops (public)
  getAllCrops(
    page: number = 1,
    limit: number = 20,
    category?: string,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    organic?: boolean
  ): Observable<CropsResponse> {
    let params = `page=${page}&limit=${limit}`;
    if (category) params += `&category=${category}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;
    if (minPrice !== undefined) params += `&minPrice=${minPrice}`;
    if (maxPrice !== undefined) params += `&maxPrice=${maxPrice}`;
    if (organic !== undefined) params += `&organic=${organic}`;

    return this.http.get<CropsResponse>(`${this.apiUrl}/public?${params}`);
  }

  // Get crop categories
  getCropCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${this.apiUrl}/categories`);
  }

  // Toggle crop availability
  toggleAvailability(id: number): Observable<CropResponse> {
    return this.http.patch<CropResponse>(
      `${this.apiUrl}/${id}/toggle-availability`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Get crop image URL with robust fallback handling
  getCropImageUrl(imagePath?: string, category?: string): string {
    // Check if imagePath exists and is valid
    if (imagePath && imagePath.trim() !== '' && imagePath.length > 10) {
      // Absolute S3 URL
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      // Local upload path
      if (imagePath.startsWith('/uploads')) {
        return `${environment.backendUrl}${imagePath}`;
      }
    }
    
    // Return category-specific default image if category is known
    if (category) {
      return this.getCategoryDefaultImage(category);
    }
    
    // Return generic default image for all other cases
    return 'assets/default-crop.svg';
  }

  // Get category-specific default image
  private getCategoryDefaultImage(category: string): string {
    const lowercaseCategory = category.toLowerCase();
    
    switch (lowercaseCategory) {
      case 'vegetables':
        return 'assets/category-images/vegetables-default.svg';
      case 'fruits':
        return 'assets/category-images/fruits-default.svg';
      case 'grains':
        return 'assets/category-images/grains-default.svg';
      case 'herbs':
        return 'assets/category-images/herbs-default.svg';
      default:
        return 'assets/default-crop.svg';
    }
  }

  // Check if image URL is valid (handles 404 cases)
  isValidImageUrl(url: string): boolean {
    // Check for dummy image paths that don't exist
    if (url.includes('dummy.jpg') || url.includes('-dummy.')) {
      return false;
    }
    
    // Check for empty or invalid paths
    if (!url || url.trim() === '' || url === 'null' || url === 'undefined') {
      return false;
    }
    
    return true;
  }

  // Get fallback image for failed image loads
  getFallbackImage(category?: string): string {
    if (category) {
      return this.getCategoryDefaultImage(category);
    }
    return 'assets/default-crop.svg';
  }

  // Validate price
  validatePrice(price: number): boolean {
    return price > 0 && price <= 10000; // Reasonable price range
  }

  // Validate quantity
  validateQuantity(quantity: number): boolean {
    return quantity > 0 && quantity <= 100000; // Reasonable quantity range
  }

  // Format price for display
  formatPrice(price: number | string): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(numPrice);
  }

  // Format quantity for display
  formatQuantity(quantity: number | string, unit: string): string {
    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    return `${numQuantity.toFixed(1)} ${unit}`;
  }

  // Check if crop is expired
  isCropExpired(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }

  // Check if crop is expiring soon (within 7 days)
  isCropExpiringSoon(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  }

  // Get crop status
  getCropStatus(crop: Crop): 'active' | 'inactive' | 'expired' | 'expiring' | 'sold-out' {
    if (!crop.isActive) return 'inactive';
    if (!crop.isAvailable) return 'sold-out';
    if (this.isCropExpired(crop.expiryDate)) return 'expired';
    if (this.isCropExpiringSoon(crop.expiryDate)) return 'expiring';
    return 'active';
  }

  // Get status color class
  getStatusColorClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'expired': return 'status-expired';
      case 'expiring': return 'status-expiring';
      case 'sold-out': return 'status-sold-out';
      default: return 'status-unknown';
    }
  }

  // Get status display text
  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'active': return 'Available';
      case 'inactive': return 'Inactive';
      case 'expired': return 'Expired';
      case 'expiring': return 'Expiring Soon';
      case 'sold-out': return 'Sold Out';
      default: return 'Unknown';
    }
  }
}
