import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  OrderService,
  Order,
  OrderStatus,
  OrderStats,
} from '../../services/order.service';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatToolbarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
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
  orderDate: Date | null = null;

  // Columns for Material table
  displayedColumns: string[] = [
    'id',
    'consumer',
    'crop',
    'quantity',
    'total',
    'status',
    'createdAt',
    'actions'
  ];

  constructor(
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadStats();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.seedDummyData();
    this.isLoading = false;

    // this.orderService
    //   .getFarmerOrders(
    //     this.currentPage,
    //     this.limit,
    //     this.selectedStatus as OrderStatus | undefined
    //   )
    //   .subscribe({
    //   next: (response) => {
    //     this.orders = response.orders;
    //     this.totalPages = response.pagination.totalPages;
    //     this.isLoading = false;
    //   },
    //   error: (error) => {
    //     this.errorMessage = error.error?.message || 'Failed to load orders';
    //     this.isLoading = false;
    //     // For UI testing when backend fails, seed some dummy orders
    //     this.seedDummyData();
    //   }
    // });
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

  /** Temporary helper: hardcoded dummy data for UI/testing */
  private seedDummyData(): void {
    const now = new Date().toISOString();

    this.orders = [
      {
        id: 101,
        consumerId: 1,
        farmerId: 10,
        cropId: 1001,
        quantity: 25,
        pricePerUnit: 40,
        totalAmount: 1000,
        status: OrderStatus.PENDING,
        deliveryAddress: 'Green Valley Apartments, Block A',
        deliveryDate: now,
        notes: 'Please deliver before 6 PM.',
        createdAt: now,
        updatedAt: now,
        consumer: {
          id: 1,
          firstName: 'Ankit',
          lastName: 'Sharma',
          email: 'ankit@example.com'
        },
        farmer: {
          id: 10,
          firstName: 'Ramesh',
          lastName: 'Yadav',
          email: 'ramesh@example.com',
          farmerProfile: {
            farmName: 'Yadav Organic Farms',
            phone: '+91-9876543210',
            address: 'Village Sundar, Block-2',
            city: 'Pune'
          }
        },
        crop: {
          id: 1001,
          name: 'Organic Tomatoes',
          unit: 'kg',
          imageUrl: '',
          category: 'Vegetables',
          description: 'Fresh organic tomatoes from local farm',
          pricePerKg: 40
        }
      },
      {
        id: 102,
        consumerId: 2,
        farmerId: 10,
        cropId: 1002,
        quantity: 10,
        pricePerUnit: 60,
        totalAmount: 600,
        status: OrderStatus.ACCEPTED,
        deliveryAddress: 'Sunrise Society, Tower 3',
        deliveryDate: now,
        notes: '',
        createdAt: now,
        updatedAt: now,
        consumer: {
          id: 2,
          firstName: 'Priya',
          lastName: 'Verma',
          email: 'priya@example.com'
        },
        farmer: {
          id: 10,
          firstName: 'Ramesh',
          lastName: 'Yadav',
          email: 'ramesh@example.com',
          farmerProfile: {
            farmName: 'Yadav Organic Farms',
            phone: '+91-9876543210',
            address: 'Village Sundar, Block-2',
            city: 'Pune'
          }
        },
        crop: {
          id: 1002,
          name: 'Basmati Rice',
          unit: 'kg',
          imageUrl: '',
          category: 'Grains',
          description: 'Premium long-grain basmati rice',
          pricePerKg: 60
        }
      },
      {
        id: 103,
        consumerId: 3,
        farmerId: 10,
        cropId: 1003,
        quantity: 5,
        pricePerUnit: 120,
        totalAmount: 600,
        status: OrderStatus.COMPLETED,
        deliveryAddress: 'Lakeview Residency, Tower 5',
        deliveryDate: now,
        notes: 'Leave at security gate.',
        createdAt: now,
        updatedAt: now,
        consumer: {
          id: 3,
          firstName: 'Rahul',
          lastName: 'Patel',
          email: 'rahul@example.com'
        },
        farmer: {
          id: 10,
          firstName: 'Ramesh',
          lastName: 'Yadav',
          email: 'ramesh@example.com',
          farmerProfile: {
            farmName: 'Yadav Organic Farms',
            phone: '+91-9876543210',
            address: 'Village Sundar, Block-2',
            city: 'Pune'
          }
        },
        crop: {
          id: 1003,
          name: 'Alphonso Mangoes',
          unit: 'dozen',
          imageUrl: '',
          category: 'Fruits',
          description: 'Sweet Alphonso mangoes from Ratnagiri',
          pricePerKg: 120
        }
      }
    ];

    this.totalPages = 1;

    const totalOrders = this.orders.length;
    const pendingOrders = this.orders.filter(o => o.status === OrderStatus.PENDING).length;
    const accepted = this.orders.filter(o => o.status === OrderStatus.ACCEPTED).length;
    const rejected = this.orders.filter(o => o.status === OrderStatus.REJECTED).length;
    const completed = this.orders.filter(o => o.status === OrderStatus.COMPLETED).length;
    const cancelled = this.orders.filter(o => o.status === OrderStatus.CANCELLED).length;
    const totalRevenue = this.orders.reduce((sum, o) => sum + o.totalAmount, 0);

    this.stats = {
      total: totalOrders,
      totalOrders,
      pending: pendingOrders,
      pendingOrders,
      accepted,
      rejected,
      completed,
      cancelled,
      statusBreakdown: [
        { status: 'pending', count: pendingOrders, percentage: totalOrders ? (pendingOrders / totalOrders) * 100 : 0 },
        { status: 'accepted', count: accepted, percentage: totalOrders ? (accepted / totalOrders) * 100 : 0 },
        { status: 'rejected', count: rejected, percentage: totalOrders ? (rejected / totalOrders) * 100 : 0 },
        { status: 'completed', count: completed, percentage: totalOrders ? (completed / totalOrders) * 100 : 0 },
        { status: 'cancelled', count: cancelled, percentage: totalOrders ? (cancelled / totalOrders) * 100 : 0 }
      ],
      recentOrders: totalOrders,
      totalRevenue
    };
  }
}
