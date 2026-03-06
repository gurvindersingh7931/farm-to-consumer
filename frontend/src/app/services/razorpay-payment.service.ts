import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpayOrderResponse {
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  razorpayKeyId?: string;
}

export interface RazorpayPaymentSuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  order: RazorpayOrderResponse['order'];
  keyId: string;
  description: string;
  userName?: string;
  userEmail?: string;
  themeColor?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Generic Razorpay payment service. Use for any payment flow (farmer subscription,
 * consumer subscription, one-time payments). Key is fetched from backend, never hardcoded.
 */
@Injectable({
  providedIn: 'root',
})
export class RazorpayPaymentService {
  private readonly apiUrl = `${environment.backendUrl}/api/payment`;
  private scriptLoaded = false;
  private scriptLoadPromise: Promise<void> | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  /** Fetch Razorpay public key from backend (never expose secret). */
  getRazorpayKeyId(): Observable<string> {
    return this.http
      .get<{ razorpayKeyId: string }>(`${this.apiUrl}/config`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res) => res.razorpayKeyId),
        map((keyId) => {
          if (!keyId) {
            throw new Error('Payment service not configured');
          }
          return keyId;
        })
      );
  }

  /** Load Razorpay checkout script once. */
  loadRazorpayScript(): Promise<void> {
    if (this.scriptLoaded && window.Razorpay) {
      return Promise.resolve();
    }
    if (this.scriptLoadPromise) {
      return this.scriptLoadPromise;
    }
    this.scriptLoadPromise = new Promise((resolve, reject) => {
      if (window.Razorpay) {
        this.scriptLoaded = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });
    return this.scriptLoadPromise;
  }

  /**
   * Open Razorpay checkout modal. Returns a Promise that resolves with payment
   * success payload (order_id, payment_id, signature) or rejects on cancel/failure.
   */
  openCheckout(options: RazorpayCheckoutOptions): Observable<RazorpayPaymentSuccess> {
    return from(this.loadRazorpayScript()).pipe(
      switchMap(() => {
        return new Observable<RazorpayPaymentSuccess>((observer) => {
          const rzpOptions = {
            key: options.keyId,
            amount: options.order.amount,
            currency: options.order.currency,
            name: 'Farm-to-Consumer',
            description: options.description,
            order_id: options.order.id,
            prefill: {
              name: options.userName ?? '',
              email: options.userEmail ?? '',
            },
            theme: { color: options.themeColor ?? '#a0835c' },
            handler: (response: RazorpayPaymentSuccess) => {
              observer.next(response);
              observer.complete();
            },
            modal: {
              ondismiss: () => {
                observer.error(new Error('Payment cancelled'));
              },
            },
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzp.on('payment.failed', (data: any) => {
            observer.error(new Error(data.error?.description || 'Payment failed'));
          });
          rzp.open();
        });
      })
    );
  }
}
