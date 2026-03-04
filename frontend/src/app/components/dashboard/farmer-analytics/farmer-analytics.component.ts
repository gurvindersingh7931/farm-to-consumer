import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

interface AnalyticsOrder {
  id: number;
  date: Date;
  productId: number;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
}

@Component({
  selector: 'app-farmer-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, RouterModule],
  templateUrl: './farmer-analytics.component.html',
  styleUrls: ['./farmer-analytics.component.scss']
})
export class FarmerAnalyticsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsChart') topProductsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersByDayChart') ordersByDayChartRef!: ElementRef<HTMLCanvasElement>;

  private revenueChart?: Chart;
  private statusChart?: Chart;
  private topProductsChart?: Chart;
  private ordersByDayChart?: Chart;

  private orders: AnalyticsOrder[] = [];

  ngAfterViewInit(): void {
    this.generateDummyData();
    this.buildRevenueChart();
    this.buildStatusChart();
    this.buildTopProductsChart();
    this.buildOrdersByDayChart();
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.statusChart?.destroy();
    this.topProductsChart?.destroy();
    this.ordersByDayChart?.destroy();
  }

  private generateDummyData(): void {
    const products = [
      { id: 1, name: 'Organic Tomatoes' },
      { id: 2, name: 'Fresh Lettuce' },
      { id: 3, name: 'Golden Potatoes' },
      { id: 4, name: 'Free-range Eggs' },
      { id: 5, name: 'Sweet Corn' },
      { id: 6, name: 'Seasonal Berries' }
    ];

    const statuses: AnalyticsOrder['status'][] = [
      'pending',
      'accepted',
      'rejected',
      'cancelled',
      'completed'
    ];

    const today = new Date();
    const startDate = new Date();
    startDate.setFullYear(today.getFullYear(), today.getMonth() - 5, 1); // last 6 months

    const daysRange =
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    const orders: AnalyticsOrder[] = [];
    const totalRecords = 1000;

    for (let i = 1; i <= totalRecords; i++) {
      const randomDayOffset = Math.floor(Math.random() * daysRange);
      const date = new Date(startDate.getTime());
      date.setDate(startDate.getDate() + randomDayOffset);

      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 20) + 1;
      const pricePerUnit = 3 + Math.random() * 7; // 3–10
      const totalAmount = Math.round(quantity * pricePerUnit * 100) / 100;

      // Bias towards completed / accepted for more realistic stats
      const statusRoll = Math.random();
      let status: AnalyticsOrder['status'];
      if (statusRoll < 0.6) status = 'completed';
      else if (statusRoll < 0.8) status = 'accepted';
      else if (statusRoll < 0.9) status = 'cancelled';
      else if (statusRoll < 0.95) status = 'pending';
      else status = 'rejected';

      orders.push({
        id: i,
        date,
        productId: product.id,
        productName: product.name,
        quantity,
        totalAmount,
        status
      });
    }

    this.orders = orders;
  }

  private buildRevenueChart(): void {
    const byMonth = new Map<string, number>();

    this.orders.forEach(order => {
      const key = `${order.date.getFullYear()}-${order.date.getMonth() + 1}`;
      byMonth.set(key, (byMonth.get(key) || 0) + order.totalAmount);
    });

    const sortedKeys = Array.from(byMonth.keys()).sort((a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return ay === by ? am - bm : ay - by;
    });

    const labels = sortedKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit'
      });
    });

    const data = sortedKeys.map(key => byMonth.get(key) || 0);

    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Monthly revenue',
            data,
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            fill: true,
            tension: 0.3,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            ticks: { autoSkip: true, maxTicksLimit: 6 }
          },
          y: {
            beginAtZero: true
          }
        }
      }
    };

    this.revenueChart = new Chart(ctx, config);
  }

  private buildStatusChart(): void {
    type StatusKey = 'completed' | 'accepted' | 'pending' | 'cancelled' | 'rejected';
    const counts: Record<StatusKey, number> = {
      completed: 0,
      accepted: 0,
      pending: 0,
      cancelled: 0,
      rejected: 0
    };

    this.orders.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });

    const labels = ['Completed', 'Accepted', 'Pending', 'Cancelled', 'Rejected'];
    const data = [
      counts.completed,
      counts.accepted,
      counts.pending,
      counts.cancelled,
      counts.rejected
    ];

    const ctx = this.statusChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Orders by status',
            data,
            backgroundColor: [
              'rgba(16, 185, 129, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(234, 179, 8, 0.8)',
              'rgba(148, 163, 184, 0.8)',
              'rgba(248, 113, 113, 0.8)'
            ]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 50 } }
        }
      }
    };

    this.statusChart = new Chart(ctx, config);
  }

  private buildTopProductsChart(): void {
    const revenueByProduct = new Map<string, number>();

    this.orders.forEach(order => {
      const key = order.productName;
      revenueByProduct.set(key, (revenueByProduct.get(key) || 0) + order.totalAmount);
    });

    const sorted = Array.from(revenueByProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const labels = sorted.map(([name]) => name);
    const data = sorted.map(([_, value]) => value);

    const ctx = this.topProductsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue share',
            data,
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(234, 179, 8, 0.8)',
              'rgba(244, 114, 182, 0.8)',
              'rgba(96, 165, 250, 0.8)'
            ]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        },
        cutout: '60%'
      }
    };

    this.topProductsChart = new Chart(ctx, config);
  }

  private buildOrdersByDayChart(): void {
    const byDay: number[] = new Array(7).fill(0);

    this.orders.forEach(order => {
      const day = order.date.getDay(); // 0–6
      byDay[day] += 1;
    });

    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const ctx = this.ordersByDayChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Orders by weekday',
            data: byDay,
            backgroundColor: 'rgba(129, 140, 248, 0.9)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true }
        }
      }
    };

    this.ordersByDayChart = new Chart(ctx, config);
  }
}

