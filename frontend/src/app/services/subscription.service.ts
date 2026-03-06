import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import {
  RazorpayPaymentService,
  RazorpayOrderResponse,
  RazorpayPaymentSuccess,
} from './razorpay-payment.service';

export const SUBSCRIPTION_PAYMENT_CONTEXT = 'subscription_farmer';

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
  razorpayKeyId?: string;
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
  providedIn: 'root',
})
export class SubscriptionService {
  private apiUrl = `${environment.backendUrl}/api/payment`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private razorpayPayment: RazorpayPaymentService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getSubscriptionPlans(): Observable<{ plans: SubscriptionPlan[] }> {
    return this.http.get<{ plans: SubscriptionPlan[] }>(
      `${this.apiUrl}/plans?context=${SUBSCRIPTION_PAYMENT_CONTEXT}`
    );
  }

  createOrder(planId: 'monthly' | 'yearly'): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(
      `${this.apiUrl}/create-order`,
      {
        paymentContext: SUBSCRIPTION_PAYMENT_CONTEXT,
        planId,
      },
      { headers: this.getAuthHeaders() }
    );
  }

  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Observable<VerifyPaymentResponse> {
    return this.http.post<VerifyPaymentResponse>(
      `${this.apiUrl}/verify-payment`,
      { orderId, paymentId, signature },
      { headers: this.getAuthHeaders() }
    );
  }

  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(
      `${this.apiUrl}/subscription-status`,
      { headers: this.getAuthHeaders() }
    );
  }

  cancelSubscription(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/cancel-subscription`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Create order, open Razorpay checkout, and return success payload for verification.
   * Uses backend-provided key (secure). Rejects if user cancels or payment fails.
   */
  createOrderAndOpenCheckout(
    planId: 'monthly' | 'yearly',
    description: string
  ): Observable<{ orderResponse: CreateOrderResponse; paymentSuccess: RazorpayPaymentSuccess }> {
    return this.createOrder(planId).pipe(
      switchMap((orderResponse) => {
        const keyId = orderResponse.razorpayKeyId;
        if (!keyId) {
          throw new Error('Payment key not available');
        }
        const user = this.authService.getCurrentUser();
        return this.razorpayPayment.openCheckout({
          order: orderResponse.order,
          keyId,
          description,
          userName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : undefined,
          userEmail: user?.email,
          themeColor: '#a0835c',
        }).pipe(
          map((paymentSuccess) => ({ orderResponse, paymentSuccess }))
        );
      })
    );
  }

  isPremiumActive(premiumExpiresAt?: string): boolean {
    if (!premiumExpiresAt) return false;
    return new Date(premiumExpiresAt) > new Date();
  }

  getDaysRemaining(premiumExpiresAt?: string): number {
    if (!premiumExpiresAt) return 0;
    const expiryDate = new Date(premiumExpiresAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  formatCurrency(amount: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getPlanDisplayName(planType: 'monthly' | 'yearly'): string {
    return planType === 'monthly' ? 'Monthly Premium' : 'Yearly Premium';
  }

  getYearlySavings(monthlyAmount?: number, yearlyAmount?: number): number {
    const monthly = monthlyAmount ?? 1;
    const yearly = yearlyAmount ?? 10;
    return monthly * 12 - yearly;
  }
}
