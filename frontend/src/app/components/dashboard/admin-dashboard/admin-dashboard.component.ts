import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AdminService, DashboardStats, User, ChartData, Activity, TopFarmer } from '../../../services/admin.service';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgxChartsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    RouterModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  user: any = null;
  stats: DashboardStats | null = null;
  chartData: ChartData | null = null;
  activities: Activity[] = [];
  users: User[] = [];
  isLoading = false;
  errorMessage = '';
  selectedPeriod: '7d' | '30d' | '90d' = '7d';
  cropsChartData: { name: string; series: { name: string; value: number }[] }[] = [];
  consumersChartData: { name: string; series: { name: string; value: number }[] }[] = [];
  farmersChartData: { name: string; series: { name: string; value: number }[] }[] = [];
  topFarmersChartData: { name: string; value: number }[] = [];
  topFarmers: TopFarmer[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load all dashboard data in parallel
    forkJoin({
      stats: this.adminService.getDashboardStats(),
      chartData: this.adminService.getChartData(this.selectedPeriod),
      activities: this.adminService.getRecentActivities(10),
      users: this.adminService.getAllUsers()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.stats = response.stats.stats;
        this.chartData = response.chartData.data;
        this.activities = response.activities.activities;
        this.users = response.users.users.slice(0, 5); // Show only first 5 users
        this.buildChartSeries();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load dashboard data';
        this.isLoading = false;
        console.error('Dashboard data error:', error);
        this.cdr.markForCheck();
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getRoleDisplayName(role: string): string {
    return this.adminService.getRoleDisplayName(role);
  }

  getStatusDisplayName(isActive: boolean): string {
    return this.adminService.getStatusDisplayName(isActive);
  }

  getStatusClass(isActive: boolean): string {
    return this.adminService.getStatusClass(isActive);
  }

  getRoleClass(role: string): string {
    return this.adminService.getRoleClass(role);
  }

  onPeriodChange(period: '7d' | '30d' | '90d'): void {
    this.selectedPeriod = period;
    this.loadChartData();
  }

  loadChartData(): void {
    this.adminService.getChartData(this.selectedPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.chartData = response.data;
          this.buildChartSeries();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Chart data error:', error);
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Map activity type from backend to Material icon name */
  getActivityIcon(activity: Activity): string {
    const iconMap: Record<string, string> = {
      user_registration: 'person_add',
      order: 'shopping_cart',
      subscription: 'card_membership',
      crop: 'grass'
    };
    return iconMap[activity.type] ?? 'info';
  }

  /** Chart color scheme from styles.scss design system (faded-copper, camel, dusty-taupe, etc.) */
  readonly chartColors: { domain: string[] } = { domain: ['#a0835c', '#a78f6e', '#9b876f', '#987749', '#c5b89d'] };

  private buildChartSeries(): void {
    if (!this.chartData?.timeline?.labels?.length) {
      this.cropsChartData = [];
      this.consumersChartData = [];
      this.farmersChartData = [];
    } else {
      const labels = this.chartData.timeline.labels;

      this.cropsChartData = this.chartData.timeline.cropsListed
        ? [{
            name: 'Crops Listed',
            series: labels.map((label, i) => ({
              name: label,
              value: this.chartData!.timeline.cropsListed![i] ?? 0
            }))
          }]
        : [];

      this.consumersChartData = this.chartData.timeline.newConsumers
        ? [{
            name: 'New Consumers',
            series: labels.map((label, i) => ({
              name: label,
              value: this.chartData!.timeline.newConsumers![i] ?? 0
            }))
          }]
        : [];

      this.farmersChartData = this.chartData.timeline.newFarmers
        ? [{
            name: 'New Farmers',
            series: labels.map((label, i) => ({
              name: label,
              value: this.chartData!.timeline.newFarmers![i] ?? 0
            }))
          }]
        : [];
    }

    const top = this.chartData?.topFarmers ?? [];
    this.topFarmers = top;
    this.topFarmersChartData = top.map(f => ({
      name: f.name || f.email || 'Unknown',
      value: f.cropCount
    }));
  }
}
