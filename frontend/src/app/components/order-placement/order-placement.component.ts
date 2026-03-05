import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { OrderService, CreateOrderRequest } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ModalDialogComponent } from '../../shared/modal-dialog/modal-dialog.component';

export interface CropForOrder {
  id: number;
  name: string;
  pricePerKg: number;
  availableQuantity: number;
  quantity?: number;
  unit: string;
  imageUrl?: string;
  farmer?: {
    id: number;
    firstName: string;
    lastName: string;
    farmerProfile?: {
      farmName?: string;
      phone?: string;
    };
  };
}

@Component({
  selector: 'app-order-placement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalDialogComponent],
  templateUrl: './order-placement.component.html',
  styleUrl: './order-placement.component.scss'
})
export class OrderPlacementComponent implements OnInit, OnDestroy {
  @Input() crop: CropForOrder | null = null;
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();

  orderForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {
    this.orderForm = this.fb.group({
      quantity: ['', [Validators.required, Validators.min(0.1)]],
      deliveryAddress: ['', [Validators.required, Validators.minLength(10)]],
      deliveryDate: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Set minimum delivery date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    // Update form with minimum date
    this.orderForm.patchValue({
      deliveryDate: minDate
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get quantity() { return this.orderForm.get('quantity'); }
  get deliveryAddress() { return this.orderForm.get('deliveryAddress'); }
  get deliveryDate() { return this.orderForm.get('deliveryDate'); }
  get notes() { return this.orderForm.get('notes'); }

  getTotalAmount(): number {
    if (!this.crop || !this.quantity?.value) {
      return 0;
    }
    return this.quantity.value * this.crop.pricePerKg;
  }

  formatPrice(amount: number): string {
    return this.orderService.formatPrice(amount);
  }

  getCropImageUrl(): string {
    if (!this.crop?.imageUrl) {
      return '/assets/images/default-crop.jpg';
    }
    return this.crop.imageUrl.startsWith('http') 
      ? this.crop.imageUrl 
      : `http://localhost:3000/${this.crop.imageUrl}`;
  }

  getFarmerName(): string {
    if (!this.crop?.farmer) {
      return 'Unknown Farmer';
    }
    return `${this.crop.farmer.firstName} ${this.crop.farmer.lastName}`;
  }

  getFarmName(): string {
    return this.crop?.farmer?.farmerProfile?.farmName || 'Farm';
  }

  onQuantityChange(): void {
    const quantityValue = this.quantity?.value;
    if (this.crop && quantityValue > this.crop.availableQuantity) {
      this.quantity?.setErrors({ 
        max: { 
          max: this.crop.availableQuantity, 
          actual: quantityValue 
        } 
      });
    }
  }

  onSubmit(): void {
    if (!this.crop) {
      this.errorMessage = 'No crop selected for order';
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.orderForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';
      this.successMessage = '';

      const orderData: CreateOrderRequest = {
        cropId: this.crop.id,
        quantity: this.quantity?.value,
        deliveryAddress: this.deliveryAddress?.value,
        deliveryDate: this.deliveryDate?.value || undefined,
        notes: this.notes?.value || undefined
      };

      this.orderService.createOrder(orderData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.successMessage = 'Order placed successfully! The farmer will be notified.';
            
            // Reset form after successful submission
            setTimeout(() => {
              this.onClose();
              this.router.navigate(['/consumer-dashboard']);
            }, 2000);
          },
          error: (error) => {
            this.isSubmitting = false;
            this.errorMessage = error.error?.message || 'Failed to place order. Please try again.';
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  onClose(): void {
    this.orderForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
    this.close.emit();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.orderForm.controls).forEach(key => {
      const control = this.orderForm.get(key);
      control?.markAsTouched();
    });
  }
}
