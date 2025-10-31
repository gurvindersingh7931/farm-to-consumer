import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OrderService, Order, OrderStatus, OrderStats, AcceptOrderRequest, RejectOrderRequest } from '../../services/order.service';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-management.component.html',
  styleUrl: './order-management.component.scss'
})
export class OrderManagementComponent implements OnInit {
  orders: Order[] = [];
  stats: OrderStats | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentPage = 1;
  totalPages = 1;
  limit = 10;
  selectedStatus = '';
  selectedOrder: Order | null = null;
  showAcceptModal = false;
  showRejectModal = false;
  showStatusModal = false;
  acceptForm = {
    deliveryDate: '',
    notes: ''
  };
  rejectForm = {
    reason: ''
  };
  statusForm = {
    status: OrderStatus.COMPLETED,
    deliveryDate: '',
    notes: ''
  };

  constructor(
    private authService: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadStats();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: any = {
      page: this.currentPage,
      limit: this.limit
    };

    if (this.selectedStatus) {
      params.status = this.selectedStatus;
    }

    this.orderService.getFarmerOrders(params).subscribe({
      next: (response) => {
        this.orders = response.orders;
        this.totalPages = response.pagination.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load orders';
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.orderService.getOrderStats().subscribe({
      next: (response) => {
        this.stats = response.stats;
      },
      error: (error) => {
        console.error('Failed to load order stats:', error);
      }
    });
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.loadOrders();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadOrders();
  }

  openAcceptModal(order: Order): void {
    this.selectedOrder = order;
    this.acceptForm = {
      deliveryDate: '',
      notes: ''
    };
    this.showAcceptModal = true;
  }

  openRejectModal(order: Order): void {
    this.selectedOrder = order;
    this.rejectForm = {
      reason: ''
    };
    this.showRejectModal = true;
  }

  openStatusModal(order: Order): void {
    this.selectedOrder = order;
    this.statusForm = {
      status: OrderStatus.COMPLETED,
      deliveryDate: '',
      notes: ''
    };
    this.showStatusModal = true;
  }

  closeModals(): void {
    this.showAcceptModal = false;
    this.showRejectModal = false;
    this.showStatusModal = false;
    this.selectedOrder = null;
  }

  acceptOrder(): void {
    if (!this.selectedOrder) return;

    const data: AcceptOrderRequest = {
      deliveryDate: this.acceptForm.deliveryDate || undefined,
      notes: this.acceptForm.notes || undefined
    };

    this.orderService.acceptOrder(this.selectedOrder.id, data).subscribe({
      next: (response) => {
        this.successMessage = 'Order accepted successfully';
        this.closeModals();
        this.loadOrders();
        this.loadStats();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to accept order';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  rejectOrder(): void {
    if (!this.selectedOrder) return;

    const data: RejectOrderRequest = {
      reason: this.rejectForm.reason || undefined
    };

    this.orderService.rejectOrder(this.selectedOrder.id, data).subscribe({
      next: (response) => {
        this.successMessage = 'Order rejected successfully';
        this.closeModals();
        this.loadOrders();
        this.loadStats();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to reject order';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  updateOrderStatus(): void {
    if (!this.selectedOrder) return;

    const data = {
      status: this.statusForm.status,
      deliveryDate: this.statusForm.deliveryDate || undefined,
      notes: this.statusForm.notes || undefined
    };

    this.orderService.updateOrderStatus(this.selectedOrder.id, data).subscribe({
      next: (response) => {
        this.successMessage = 'Order status updated successfully';
        this.closeModals();
        this.loadOrders();
        this.loadStats();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to update order status';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  // Helper methods
  getStatusDisplayName(status: OrderStatus): string {
    return this.orderService.getStatusDisplayName(status);
  }

  getStatusClass(status: OrderStatus): string {
    return this.orderService.getStatusClass(status);
  }

  getStatusColor(status: OrderStatus): string {
    return this.orderService.getStatusColor(status);
  }

  canAcceptOrder(order: Order): boolean {
    return this.orderService.canAcceptOrder(order);
  }

  canRejectOrder(order: Order): boolean {
    return this.orderService.canRejectOrder(order);
  }

  canUpdateStatus(order: Order): boolean {
    return this.orderService.canUpdateStatus(order);
  }

  formatCurrency(amount: number): string {
    return this.orderService.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.orderService.formatDate(dateString);
  }

  formatDateTime(dateString: string): string {
    return this.orderService.formatDateTime(dateString);
  }

  getStatusOptions(): Array<{ value: OrderStatus; label: string }> {
    return [
      { value: OrderStatus.ACCEPTED, label: 'Accepted' },
      { value: OrderStatus.COMPLETED, label: 'Completed' },
      { value: OrderStatus.CANCELLED, label: 'Cancelled' }
    ];
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getCompletedOrdersCount(): number {
    if (!this.stats?.statusBreakdown) return 0;
    const completed = this.stats.statusBreakdown.find(s => s.status === 'completed');
    return completed?.count || 0;
  }
}
