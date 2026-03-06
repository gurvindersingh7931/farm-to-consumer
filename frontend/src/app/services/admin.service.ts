import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'consumer' | 'admin';
  isActive: boolean;
  isPremium?: boolean;
  suspendedUntil?: string;
  suspensionReason?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
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
}

export interface UserManagementStats {
  users: {
    total: number;
    active: number;
    blocked: number;
    suspended: number;
    newThisWeek: number;
    premium: number;
  };
  farmers: {
    verified: number;
    unverified: number;
    total: number;
    verificationRate: string;
  };
}

export interface DashboardStats {
  users: {
    total: number;
    farmers: number;
    consumers: number;
    admins: number;
    active: number;
    inactive: number;
    premium: number;
    recent: number;
    monthly: number;
  };
  farmers: {
    totalProfiles: number;
    verified: number;
    boosted: number;
    badged: number;
  };
  crops: {
    total: number;
    active: number;
    available: number;
    premium: number;
    organic: number;
    recent: number;
  };
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    recent: number;
  };
  orders: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
    rejected: number;
    cancelled: number;
    recent: number;
  };
  revenue: {
    total: number;
    monthly: number;
    weekly: number;
  };
}

export interface TopFarmer {
  farmerId: number;
  name: string;
  email: string;
  cropCount: number;
}

export interface ChartData {
  timeline: {
    labels: string[];
    userRegistrations: number[];
    orderCounts: number[];
    revenues: number[];
    cropsListed?: number[];
    newConsumers?: number[];
    newFarmers?: number[];
  };
  roleDistribution: {
    farmers: number;
    consumers: number;
    admins: number;
  };
  orderStatusDistribution: {
    pending: number;
    accepted: number;
    completed: number;
    rejected: number;
    cancelled: number;
  };
  topFarmers?: TopFarmer[];
}

export interface Activity {
  type: string;
  id: number;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface UsersResponse {
  message: string;
  users: User[];
  total: number;
}

export interface UserResponse {
  message: string;
  user: User;
}

export interface StatsResponse {
  message: string;
  stats: DashboardStats;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'farmer' | 'consumer' | 'admin';
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders() {
    return this.authService.getAuthHeaders();
  }

  // Dashboard Statistics
  getDashboardStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.API_URL}/admin/dashboard/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  getChartData(period: '7d' | '30d' | '90d' = '7d'): Observable<{ data: ChartData }> {
    return this.http.get<{ data: ChartData }>(`${this.API_URL}/admin/dashboard/charts?period=${period}`, {
      headers: this.getAuthHeaders()
    });
  }

  getRecentActivities(limit: number = 20): Observable<{ activities: Activity[] }> {
    return this.http.get<{ activities: Activity[] }>(`${this.API_URL}/admin/dashboard/activities?limit=${limit}`, {
      headers: this.getAuthHeaders()
    });
  }

  // User Management
  getAllUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${this.API_URL}/admin/users`, {
      headers: this.getAuthHeaders()
    });
  }

  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.API_URL}/admin/users/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateUser(id: number, userData: UpdateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.API_URL}/admin/users/${id}`, userData, {
      headers: this.getAuthHeaders()
    });
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/admin/users/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // User Management Functions
  blockUser(id: number, reason?: string): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.API_URL}/admin/users/${id}/block`, 
      { reason }, 
      { headers: this.getAuthHeaders() }
    );
  }

  unblockUser(id: number): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.API_URL}/admin/users/${id}/unblock`, 
      {}, 
      { headers: this.getAuthHeaders() }
    );
  }

  verifyFarmer(id: number, verified: boolean, hasVerifiedBadge?: boolean): Observable<{ message: string; farmer: any }> {
    return this.http.put<{ message: string; farmer: any }>(`${this.API_URL}/admin/farmers/${id}/verify`, 
      { verified, hasVerifiedBadge }, 
      { headers: this.getAuthHeaders() }
    );
  }

  getFarmersForVerification(status: 'pending' | 'verified' | 'all' = 'pending'): Observable<{ farmers: any[]; total: number }> {
    return this.http.get<{ farmers: any[]; total: number }>(`${this.API_URL}/admin/farmers/verification?status=${status}`, {
      headers: this.getAuthHeaders()
    });
  }

  getUsersByRole(role: 'farmer' | 'consumer' | 'admin', status?: 'active' | 'blocked', page: number = 1, limit: number = 20): Observable<{ users: User[]; total: number; page: number; totalPages: number }> {
    let params = `?page=${page}&limit=${limit}`;
    if (status) params += `&status=${status}`;
    
    return this.http.get<{ users: User[]; total: number; page: number; totalPages: number }>(`${this.API_URL}/admin/users/role/${role}${params}`, {
      headers: this.getAuthHeaders()
    });
  }

  getUserStats(role: 'farmer' | 'consumer'): Observable<{ stats: any }> {
    return this.http.get<{ stats: any }>(`${this.API_URL}/admin/users/role/${role}/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  searchUsers(query: string, role?: string, status?: string): Observable<{ users: User[]; total: number }> {
    let params = `?query=${encodeURIComponent(query)}`;
    if (role) params += `&role=${role}`;
    if (status) params += `&status=${status}`;
    
    return this.http.get<{ users: User[]; total: number }>(`${this.API_URL}/admin/users/search${params}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Helper methods
  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'farmer':
        return 'Farmer';
      case 'consumer':
        return 'Consumer';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  }

  getStatusDisplayName(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'farmer':
        return 'role-farmer';
      case 'consumer':
        return 'role-consumer';
      case 'admin':
        return 'role-admin';
      default:
        return 'role-default';
    }
  }

  // Enhanced User Management Methods
  
  // Approve/Verify Farmer
  approveFarmer(userId: number): Observable<{message: string, farmer: any}> {
    return this.http.put<{message: string, farmer: any}>(`${this.API_URL}/admin/farmers/${userId}/approve`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Reject Farmer Verification
  rejectFarmer(userId: number, reason?: string): Observable<{message: string, reason: string}> {
    return this.http.put<{message: string, reason: string}>(`${this.API_URL}/admin/farmers/${userId}/reject`, { reason }, {
      headers: this.getAuthHeaders()
    });
  }

  // Suspend/Block User
  suspendUser(userId: number, reason: string, durationDays?: number): Observable<{message: string, suspendedUntil?: Date, reason: string}> {
    return this.http.put<{message: string, suspendedUntil?: Date, reason: string}>(`${this.API_URL}/admin/users/${userId}/suspend`, { 
      reason, 
      duration: durationDays 
    }, {
      headers: this.getAuthHeaders()
    });
  }

  // Restore/Unblock User
  restoreUser(userId: number): Observable<{message: string}> {
    return this.http.put<{message: string}>(`${this.API_URL}/admin/users/${userId}/restore`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete User Account
  deleteUserAccount(userId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.API_URL}/admin/users/${userId}`, {
      headers: this.getAuthHeaders(),
      body: { confirmDelete: true }
    });
  }

  // Get User Management Statistics
  getUserManagementStats(): Observable<{stats: UserManagementStats}> {
    return this.http.get<{stats: UserManagementStats}>(`${this.API_URL}/admin/users/manage/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  // Listing moderation APIs
  getListings(params: { status?: 'approved' | 'pending'; sponsored?: boolean; flagged?: boolean; page?: number; limit?: number; search?: string } = {}): Observable<{ listings: any[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.sponsored !== undefined) query.set('sponsored', String(params.sponsored));
    if (params.flagged !== undefined) query.set('flagged', String(params.flagged));
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);

    const qs = query.toString();
    const url = `${this.API_URL}/admin/listings${qs ? `?${qs}` : ''}`;
    return this.http.get<{ listings: any[]; total: number; page: number; totalPages: number }>(url, { headers: this.getAuthHeaders() });
  }

  approveListing(cropId: number): Observable<{ message: string; crop: any }> {
    return this.http.put<{ message: string; crop: any }>(`${this.API_URL}/admin/listings/${cropId}/approve`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  flagListing(cropId: number, reason?: string): Observable<{ message: string; crop: any }> {
    return this.http.put<{ message: string; crop: any }>(`${this.API_URL}/admin/listings/${cropId}/flag`, { reason }, {
      headers: this.getAuthHeaders()
    });
  }

  sponsorListing(cropId: number, days: number = 30): Observable<{ message: string; crop: any }> {
    return this.http.put<{ message: string; crop: any }>(`${this.API_URL}/admin/listings/${cropId}/sponsor`, { days }, {
      headers: this.getAuthHeaders()
    });
  }

  unsponsorListing(cropId: number): Observable<{ message: string; crop: any }> {
    return this.http.put<{ message: string; crop: any }>(`${this.API_URL}/admin/listings/${cropId}/unsponsor`, {}, {
      headers: this.getAuthHeaders()
    });
  }
}
