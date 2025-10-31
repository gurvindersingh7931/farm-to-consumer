import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SubscriptionService, SubscriptionPlan, SubscriptionStatus } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';

declare var Razorpay: any;

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss'
})
export class SubscriptionComponent implements OnInit, OnDestroy {
  plans: SubscriptionPlan[] = [];
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoading = false;
  isProcessingPayment = false;
  errorMessage = '';
  successMessage = '';
  selectedPlan: 'monthly' | 'yearly' | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSubscriptionPlans();
    this.loadSubscriptionStatus();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadSubscriptionPlans(): void {
    this.isLoading = true;
    this.subscriptionService.getSubscriptionPlans().subscribe({
      next: (response) => {
        this.plans = response.plans;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load subscription plans';
        this.isLoading = false;
      }
    });
  }

  loadSubscriptionStatus(): void {
    this.subscriptionService.getSubscriptionStatus().subscribe({
      next: (response) => {
        this.subscriptionStatus = response;
      },
      error: (error) => {
        console.error('Failed to load subscription status:', error);
      }
    });
  }

  selectPlan(planType: 'monthly' | 'yearly'): void {
    this.selectedPlan = planType;
    this.errorMessage = '';
    this.successMessage = '';
  }

  purchaseSubscription(): void {
    if (!this.selectedPlan) {
      this.errorMessage = 'Please select a subscription plan';
      return;
    }

    if (this.subscriptionStatus?.isPremium) {
      this.errorMessage = 'You already have an active premium subscription';
      return;
    }

    this.isProcessingPayment = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.subscriptionService.createOrder(this.selectedPlan).subscribe({
      next: (response) => {
        this.openRazorpayCheckout(response);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create payment order';
        this.isProcessingPayment = false;
      }
    });
  }

  openRazorpayCheckout(orderResponse: any): void {
    const options = {
      key: 'rzp_test_1DP5mmOlF5G5ag', // Replace with your Razorpay key
      amount: orderResponse.order.amount,
      currency: orderResponse.order.currency,
      name: 'Farm-to-Consumer',
      description: `${this.subscriptionService.getPlanDisplayName(this.selectedPlan!)} Subscription`,
      order_id: orderResponse.order.id,
      handler: (response: any) => {
        this.verifyPayment(response, orderResponse.order.id);
      },
      prefill: {
        name: this.authService.getCurrentUser()?.firstName + ' ' + this.authService.getCurrentUser()?.lastName,
        email: this.authService.getCurrentUser()?.email,
      },
      theme: {
        color: '#2ecc71'
      },
      modal: {
        ondismiss: () => {
          this.isProcessingPayment = false;
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  verifyPayment(paymentResponse: any, orderId: string): void {
    this.subscriptionService.verifyPayment(
      orderId,
      paymentResponse.razorpay_payment_id,
      paymentResponse.razorpay_signature
    ).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.isProcessingPayment = false;
        this.loadSubscriptionStatus();
        this.selectedPlan = null;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Payment verification failed';
        this.isProcessingPayment = false;
      }
    });
  }

  cancelSubscription(): void {
    if (!confirm('Are you sure you want to cancel your premium subscription?')) {
      return;
    }

    this.subscriptionService.cancelSubscription().subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadSubscriptionStatus();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to cancel subscription';
      }
    });
  }

  isPremiumActive(): boolean {
    return this.subscriptionService.isPremiumActive(this.subscriptionStatus?.premiumExpiresAt);
  }

  getDaysRemaining(): number {
    return this.subscriptionService.getDaysRemaining(this.subscriptionStatus?.premiumExpiresAt);
  }

  formatCurrency(amount: number): string {
    return this.subscriptionService.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.subscriptionService.formatDate(dateString);
  }

  getYearlySavings(): number {
    return this.subscriptionService.getYearlySavings();
  }

  getPlanDisplayName(planType: 'monthly' | 'yearly'): string {
    return this.subscriptionService.getPlanDisplayName(planType);
  }

  isPlanSelected(planType: 'monthly' | 'yearly'): boolean {
    return this.selectedPlan === planType;
  }

  getPlanFeatures(): string[] {
    return [
      'Unlimited crop listings',
      'Priority customer support',
      'Advanced analytics dashboard',
      'Featured listing placement',
      'Direct farmer-consumer messaging',
      'Seasonal crop recommendations'
    ];
  }
}
