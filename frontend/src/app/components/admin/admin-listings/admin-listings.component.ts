import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-admin-listings',
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
  templateUrl: './admin-listings.component.html',
  styleUrls: ['./admin-listings.component.scss']
})
export class AdminListingsComponent implements OnInit, OnDestroy {
  listings: any[] = [];
  page = 1;
  totalPages = 1;
  search = '';
  status: '' | 'approved' | 'pending' = '';
  sponsored: '' | 'true' | 'false' = '';
  flagged: '' | 'true' | 'false' = '';
  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadListings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadListings(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getListings({
      page: this.page,
      status: this.status || undefined,
      sponsored: this.sponsored ? this.sponsored === 'true' : undefined,
      flagged: this.flagged ? this.flagged === 'true' : undefined,
      search: this.search || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.listings = res.listings;
          this.totalPages = res.totalPages;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load listings';
          this.isLoading = false;
        }
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadListings();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.loadListings();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  approveListing(crop: any): void {
    if (!confirm(`Approve "${crop.name}"?`)) return;
    this.adminService.approveListing(crop.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadListings(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  flagListing(crop: any): void {
    const reason = prompt('Reason to flag:');
    if (reason === null) return;
    this.adminService.flagListing(crop.id, reason || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadListings(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  sponsorListing(crop: any): void {
    const daysStr = prompt('Sponsorship days (default 30):', '30');
    const days = daysStr ? parseInt(daysStr) : 30;
    if (!Number.isFinite(days) || days <= 0) {
      alert('Invalid duration');
      return;
    }
    this.adminService.sponsorListing(crop.id, days)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadListings(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }

  unsponsorListing(crop: any): void {
    if (!confirm(`Remove sponsorship from "${crop.name}"?`)) return;
    this.adminService.unsponsorListing(crop.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { alert(r.message); this.loadListings(); },
        error: (e) => alert(e.error?.message || 'Failed')
      });
  }
}
