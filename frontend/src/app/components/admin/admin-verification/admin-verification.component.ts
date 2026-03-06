import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-admin-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './admin-verification.component.html',
  styleUrls: ['./admin-verification.component.scss']
})
export class AdminVerificationComponent implements OnInit, OnDestroy {
  farmers: any[] = [];
  statusFilter: 'pending' | 'verified' | 'all' = 'pending';
  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadFarmers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFarmers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getFarmersForVerification(this.statusFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.farmers = res.farmers || [];
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load farmers';
          this.isLoading = false;
        }
      });
  }

  onStatusFilterChange(): void {
    this.loadFarmers();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getUserId(farmer: any): number {
    return farmer.user?.id ?? farmer.id;
  }

  verifyFarmer(farmer: any): void {
    const userId = this.getUserId(farmer);
    this.adminService.verifyFarmer(userId, true, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadFarmers(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  unverifyFarmer(farmer: any): void {
    const name = this.getFarmerName(farmer);
    if (!confirm(`Remove verification from ${name}?`)) return;
    this.adminService.verifyFarmer(this.getUserId(farmer), false, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadFarmers(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  getFarmerName(farmer: any): string {
    return farmer.user ? `${farmer.user.firstName} ${farmer.user.lastName}` : `${farmer.firstName} ${farmer.lastName}`;
  }

  rejectFarmer(farmer: any): void {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;
    this.adminService.rejectFarmer(this.getUserId(farmer), reason || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadFarmers(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  approveFarmer(farmer: any): void {
    this.adminService.approveFarmer(this.getUserId(farmer))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadFarmers(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  suspendUser(farmer: any): void {
    const reason = prompt('Suspension reason:');
    if (!reason?.trim()) return;
    const daysStr = prompt('Duration in days (leave empty for indefinite):');
    const days = daysStr ? parseInt(daysStr) : undefined;
    this.adminService.suspendUser(this.getUserId(farmer), reason, days)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadFarmers(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  restoreUser(farmer: any): void {
    this.adminService.restoreUser(this.getUserId(farmer))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadFarmers(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  deleteUserAccount(farmer: any): void {
    const name = this.getFarmerName(farmer);
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    this.adminService.deleteUser(this.getUserId(farmer))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadFarmers(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  isUserSuspended(farmer: any): boolean {
    const user = farmer.user ?? farmer;
    return !!user?.suspendedUntil && new Date(user.suspendedUntil) > new Date();
  }
}
