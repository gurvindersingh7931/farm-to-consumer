import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  duration: number;
  currency: string;
}

export interface Subscription {
  id: number;
  planType: 'monthly' | 'yearly';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  premiumExpiresAt?: string;
  subscriptions: Subscription[];
}

export interface CreateOrderRequest {
  planType: 'monthly' | 'yearly';
}

export interface CreateOrderResponse {
  message: string;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  subscription: {
    id: number;
    planType: 'monthly' | 'yearly';
    amount: number;
    startDate: string;
    endDate: string;
  };
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyPaymentResponse {
  message: string;
  subscription: {
    id: number;
    planType: 'monthly' | 'yearly';
    amount: number;
    status: string;
    startDate: string;
    endDate: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = `${environment.backendUrl}/api/payment`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get available subscription plans
  getSubscriptionPlans(): Observable<{ plans: SubscriptionPlan[] }> {
    return this.http.get<{ plans: SubscriptionPlan[] }>(`${this.apiUrl}/plans`);
  }

  // Create Razorpay order
  createOrder(planType: 'monthly' | 'yearly'): Observable<CreateOrderResponse> {
    const request: CreateOrderRequest = { planType };
    return this.http.post<CreateOrderResponse>(
      `${this.apiUrl}/create-order`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  // Verify payment
  verifyPayment(orderId: string, paymentId: string, signature: string): Observable<VerifyPaymentResponse> {
    const request: VerifyPaymentRequest = { orderId, paymentId, signature };
    return this.http.post<VerifyPaymentResponse>(
      `${this.apiUrl}/verify-payment`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  // Get subscription status
  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(
      `${this.apiUrl}/subscription-status`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Cancel subscription
  cancelSubscription(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/cancel-subscription`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Check if user has active premium subscription
  isPremiumActive(premiumExpiresAt?: string): boolean {
    if (!premiumExpiresAt) return false;
    return new Date(premiumExpiresAt) > new Date();
  }

  // Get days remaining for premium subscription
  getDaysRemaining(premiumExpiresAt?: string): number {
    if (!premiumExpiresAt) return 0;
    const expiryDate = new Date(premiumExpiresAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // Format currency
  formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Get plan display name
  getPlanDisplayName(planType: 'monthly' | 'yearly'): string {
    return planType === 'monthly' ? 'Monthly Premium' : 'Yearly Premium';
  }

  // Get plan savings (yearly vs monthly)
  getYearlySavings(): number {
    const monthlyCost = 999 * 12; // ₹9.99 * 12 months
    const yearlyCost = 9999; // ₹99.99
    return monthlyCost - yearlyCost;
  }
}
