import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import {
  SubscriptionService,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../services/subscription.service';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss',
})
export class SubscriptionComponent implements OnInit {
  plans: SubscriptionPlan[] = [];
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoading = false;
  isProcessingPayment = false;
  errorMessage = '';
  successMessage = '';
  selectedPlan: 'monthly' | 'yearly' | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadSubscriptionPlans();
    this.loadSubscriptionStatus();
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
      },
    });
  }

  loadSubscriptionStatus(): void {
    this.subscriptionService.getSubscriptionStatus().subscribe({
      next: (response) => {
        this.subscriptionStatus = response;
      },
      error: () => {},
    });
  }

  selectPlan(planType: 'monthly' | 'yearly' | string): void {
    this.selectedPlan = planType === 'monthly' || planType === 'yearly' ? planType : null;
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

    const description = `${this.subscriptionService.getPlanDisplayName(this.selectedPlan)} Subscription`;

    this.subscriptionService
      .createOrderAndOpenCheckout(this.selectedPlan, description)
      .subscribe({
        next: ({ orderResponse, paymentSuccess }) => {
          this.verifyPayment(
            orderResponse.order.id,
            paymentSuccess.razorpay_payment_id,
            paymentSuccess.razorpay_signature
          );
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.errorMessage =
              error?.message || error?.error?.message || 'Payment was cancelled or failed';
            this.isProcessingPayment = false;
          });
        },
      });
  }

  verifyPayment(orderId: string, paymentId: string, signature: string): void {
    this.subscriptionService.verifyPayment(orderId, paymentId, signature).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.successMessage = response.message;
          this.isProcessingPayment = false;
          this.selectedPlan = null;
          this.loadSubscriptionStatus();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.errorMessage = error.error?.message || 'Payment verification failed';
          this.isProcessingPayment = false;
        });
      },
    });
  }

  cancelSubscription(): void {
    if (
      !confirm('Are you sure you want to cancel your premium subscription?')
    ) {
      return;
    }

    this.subscriptionService.cancelSubscription().subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.successMessage = response.message;
          this.errorMessage = '';
          this.loadSubscriptionStatus();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.errorMessage =
            error.error?.message || 'Failed to cancel subscription';
        });
      },
    });
  }

  isPremiumActive(): boolean {
    return this.subscriptionService.isPremiumActive(
      this.subscriptionStatus?.premiumExpiresAt
    );
  }

  getDaysRemaining(): number {
    return this.subscriptionService.getDaysRemaining(
      this.subscriptionStatus?.premiumExpiresAt
    );
  }

  formatCurrency(amount: number): string {
    return this.subscriptionService.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.subscriptionService.formatDate(dateString);
  }

  getYearlySavings(): number {
    const monthlyPlan = this.plans.find((p) => p.id === 'monthly');
    const yearlyPlan = this.plans.find((p) => p.id === 'yearly');
    return this.subscriptionService.getYearlySavings(
      monthlyPlan?.amount,
      yearlyPlan?.amount
    );
  }

  getPlanDisplayName(planType: 'monthly' | 'yearly'): string {
    return this.subscriptionService.getPlanDisplayName(planType);
  }

  isPlanSelected(planType: 'monthly' | 'yearly' | string): boolean {
    return this.selectedPlan === planType;
  }

  getSelectedPlanAmount(): number {
    if (!this.selectedPlan) return 0;
    const plan = this.plans.find((p) => p.id === this.selectedPlan);
    return plan?.amount ?? 0;
  }

  getPlanFeatures(): string[] {
    return [
      'Unlimited crop listings',
      'Priority customer support',
      'Advanced analytics dashboard',
      'Featured listing placement',
      'Direct farmer-consumer messaging',
      'Seasonal crop recommendations',
    ];
  }

  getComparisonRows(): { feature: string; free: string; premium: string }[] {
    return [
      { feature: 'Crop listings', free: 'Up to 10 active', premium: 'Unlimited' },
      { feature: 'Support', free: 'Basic', premium: 'Priority' },
      { feature: 'Analytics', free: 'Basic', premium: 'Advanced' },
      { feature: 'Placement', free: 'Standard', premium: 'Featured' },
      { feature: 'Messaging', free: 'Limited', premium: 'Unlimited' },
      { feature: 'Recommendations', free: 'Basic', premium: 'AI-powered' },
    ];
  }
}
