import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminService, User } from '../../../services/admin.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-admin-consumers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './admin-consumers.component.html',
  styleUrls: ['./admin-consumers.component.scss']
})
export class AdminConsumersComponent implements OnInit, OnDestroy {
  consumers: User[] = [];
  searchQuery = '';
  selectedStatus: '' | 'active' | 'blocked' = '';
  currentPage = 1;
  totalPages = 1;
  userStats: any = {};
  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadConsumers();
    this.loadUserStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConsumers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getUsersByRole('consumer', this.selectedStatus || undefined, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.consumers = response.users;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to load consumers';
          this.isLoading = false;
        }
      });
  }

  loadUserStats(): void {
    this.adminService.getUserStats('consumer')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => { this.userStats = response.stats; },
        error: () => {}
      });
  }

  searchUsers(): void {
    if (!this.searchQuery.trim()) {
      this.loadConsumers();
      return;
    }
    this.isLoading = true;
    this.adminService.searchUsers(this.searchQuery, 'consumer', this.selectedStatus || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.consumers = response.users;
          this.totalPages = 1;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Search failed';
          this.isLoading = false;
        }
      });
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.loadConsumers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadConsumers();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  blockUser(user: User): void {
    if (confirm(`Block ${user.firstName} ${user.lastName}?`)) {
      this.adminService.blockUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { alert('User blocked'); this.loadConsumers(); this.loadUserStats(); },
          error: (e) => alert(e.error?.message || 'Failed to block')
        });
    }
  }

  suspendUser(userId: number): void {
    const reason = prompt('Reason for suspension:');
    if (!reason?.trim()) return;
    const durationStr = prompt('Duration in days (empty = permanent):');
    const duration = durationStr ? parseInt(durationStr) : undefined;
    if (confirm(`Suspend for ${duration ? duration + ' days' : 'permanently'}?`)) {
      this.adminService.suspendUser(userId, reason, duration)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { alert('User suspended'); this.loadConsumers(); this.loadUserStats(); },
          error: (e) => alert(e.error?.message || 'Failed')
        });
    }
  }

  restoreUser(userId: number): void {
    if (confirm('Restore this user?')) {
      this.adminService.restoreUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { alert('User restored'); this.loadConsumers(); this.loadUserStats(); },
          error: (e) => alert(e.error?.message || 'Failed')
        });
    }
  }

  deleteUserAccount(userId: number, name: string): void {
    if (confirm(`Delete "${name}"? This cannot be undone.`) && confirm('Final confirmation?')) {
      this.adminService.deleteUserAccount(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.loadConsumers(); this.loadUserStats(); },
          error: (e) => alert(e.error?.message || 'Failed')
        });
    }
  }

  isUserSuspended(user: User): boolean {
    return !!user.suspendedUntil && new Date(user.suspendedUntil) > new Date();
  }

  getUserStatusText(user: User): string {
    if (!user.isActive) return 'Blocked';
    if (this.isUserSuspended(user)) return 'Suspended';
    if (user.deletedAt) return 'Deleted';
    return 'Active';
  }

  getUserStatusClass(user: User): string {
    if (!user.isActive || user.deletedAt) return 'status-danger';
    if (this.isUserSuspended(user)) return 'status-warning';
    return 'status-active';
  }
}
