import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: number;
  consumerId: number;
  farmerId: number;
  cropId: number;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress?: string;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  consumer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  farmer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    farmerProfile?: {
      farmName?: string;
      phone?: string;
      address?: string;
      city?: string;
    };
  };
  crop?: {
    id: number;
    name: string;
    unit: string;
    imageUrl?: string;
    category: string;
    description?: string;
    pricePerKg: number;
  };
}

export interface CreateOrderRequest {
  cropId: number;
  quantity: number;
  deliveryAddress?: string;
  deliveryDate?: string;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface OrderResponse {
  message: string;
  order: Order;
}

export interface OrdersResponse {
  message: string;
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface OrderStats {
  total: number;
  totalOrders: number;
  pending: number;
  pendingOrders: number;
  accepted: number;
  rejected: number;
  completed: number;
  cancelled: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  recentOrders: number;
  totalRevenue: number;
}

export interface AcceptOrderRequest {
  deliveryDate?: string;
  notes?: string;
}

export interface RejectOrderRequest {
  reason?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.backendUrl}/api/order`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Create order (Consumer)
  createOrder(orderData: CreateOrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(
      this.apiUrl,
      orderData,
      { headers: this.getAuthHeaders() }
    );
  }

  // Get consumer orders
  getConsumerOrders(page: number = 1, limit: number = 10, status?: OrderStatus): Observable<OrdersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<OrdersResponse>(
      `${this.apiUrl}/consumer`,
      { 
        headers: this.getAuthHeaders(),
        params 
      }
    );
  }

  // Get farmer orders
  getFarmerOrders(page: number = 1, limit: number = 10, status?: OrderStatus): Observable<OrdersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<OrdersResponse>(
      `${this.apiUrl}/farmer`,
      { 
        headers: this.getAuthHeaders(),
        params 
      }
    );
  }

  // Get order by ID
  getOrderById(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Update order status (Farmer)
  updateOrderStatus(id: number, statusData: UpdateOrderStatusRequest): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(
      `${this.apiUrl}/${id}/status`,
      statusData,
      { headers: this.getAuthHeaders() }
    );
  }

  // Cancel order (Consumer)
  cancelOrder(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${id}/cancel`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Accept order (Farmer)
  acceptOrder(id: number, data: AcceptOrderRequest): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(
      `${this.apiUrl}/${id}/accept`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  // Reject order (Farmer)
  rejectOrder(id: number, data: RejectOrderRequest): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(
      `${this.apiUrl}/${id}/reject`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  // Get order statistics
  getOrderStats(): Observable<{ stats: OrderStats }> {
    return this.http.get<{ stats: OrderStats }>(
      `${this.apiUrl}/stats`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Helper methods
  getStatusDisplayName(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Pending';
      case OrderStatus.ACCEPTED:
        return 'Accepted';
      case OrderStatus.REJECTED:
        return 'Rejected';
      case OrderStatus.COMPLETED:
        return 'Completed';
      case OrderStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  }

  getStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'status-pending';
      case OrderStatus.ACCEPTED:
        return 'status-accepted';
      case OrderStatus.REJECTED:
        return 'status-rejected';
      case OrderStatus.COMPLETED:
        return 'status-completed';
      case OrderStatus.CANCELLED:
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  }

  canCancelOrder(order: Order, currentUserId: number): boolean {
    return order.consumerId === currentUserId && order.status === OrderStatus.PENDING;
  }

  canUpdateOrderStatus(order: Order, currentUserId: number): boolean {
    return order.farmerId === currentUserId && 
           (order.status === OrderStatus.PENDING || order.status === OrderStatus.ACCEPTED);
  }

  canAcceptOrder(order: Order): boolean {
    return order.status === OrderStatus.PENDING;
  }

  canRejectOrder(order: Order): boolean {
    return order.status === OrderStatus.PENDING;
  }

  canUpdateStatus(order: Order): boolean {
    return order.status === OrderStatus.ACCEPTED;
  }

  getStatusColor(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return '#ffc107';
      case OrderStatus.ACCEPTED:
        return '#17a2b8';
      case OrderStatus.REJECTED:
        return '#dc3545';
      case OrderStatus.COMPLETED:
        return '#28a745';
      case OrderStatus.CANCELLED:
        return '#6c757d';
      default:
        return '#6c757d';
    }
  }

  formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatCurrency(amount: number): string {
    return this.formatPrice(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(dateString: string): string {
    return this.formatDate(dateString);
  }
}
