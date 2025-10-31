import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AdminService, DashboardStats, User, ChartData, Activity } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
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
  
  // User Management
  selectedTab: 'overview' | 'farmers' | 'consumers' | 'verification' | 'listings' = 'overview';
  farmers: User[] = [];
  consumers: User[] = [];
  farmersForVerification: any[] = [];
  searchQuery = '';
  selectedRole = '';
  selectedStatus = '';
  currentPage = 1;
  totalPages = 1;
  userStats: any = {};
  
  // Listings Management
  listings: any[] = [];
  listingsPage = 1;
  listingsTotalPages = 1;
  listingSearch = '';
  listingStatus: '' | 'approved' | 'pending' = '';
  listingSponsored: '' | 'true' | 'false' = '';
  listingFlagged: '' | 'true' | 'false' = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private adminService: AdminService
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
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load dashboard data';
        this.isLoading = false;
        console.error('Dashboard data error:', error);
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

  getGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'user_registration': return '👤';
      case 'order': return '🛒';
      case 'subscription': return '💳';
      case 'crop': return '🌾';
      default: return '📊';
    }
  }

  // User Management Methods
  switchTab(tab: 'overview' | 'farmers' | 'consumers' | 'verification' | 'listings'): void {
    this.selectedTab = tab;
    this.currentPage = 1;
    
    switch (tab) {
      case 'farmers':
        this.loadFarmers();
        this.loadUserStats('farmer');
        break;
      case 'consumers':
        this.loadConsumers();
        this.loadUserStats('consumer');
        break;
      case 'verification':
        this.loadFarmersForVerification();
        break;
      case 'listings':
        this.loadListings();
        break;
    }
  }

  loadFarmers(): void {
    this.isLoading = true;
    this.adminService.getUsersByRole('farmer', this.selectedStatus as any, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.farmers = response.users;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to load farmers';
          this.isLoading = false;
        }
      });
  }

  loadConsumers(): void {
    this.isLoading = true;
    this.adminService.getUsersByRole('consumer', this.selectedStatus as any, this.currentPage)
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

  loadFarmersForVerification(): void {
    this.isLoading = true;
    this.adminService.getFarmersForVerification('pending')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.farmersForVerification = response.farmers;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to load farmers for verification';
          this.isLoading = false;
        }
      });
  }

  loadUserStats(role?: 'farmer' | 'consumer'): void {
    if (!role) {
      // Load both roles if no role provided
      this.adminService.getUserStats('farmer')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => { this.userStats['farmer'] = response.stats; },
          error: (error) => { console.error('Failed to load farmer stats:', error); }
        });
      this.adminService.getUserStats('consumer')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => { this.userStats['consumer'] = response.stats; },
          error: (error) => { console.error('Failed to load consumer stats:', error); }
        });
      return;
    }
    this.adminService.getUserStats(role)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.userStats[role] = response.stats;
        },
        error: (error) => {
          console.error(`Failed to load ${role} stats:`, error);
        }
      });
  }

  blockUser(user: User): void {
    if (confirm(`Are you sure you want to block ${user.firstName} ${user.lastName}?`)) {
      this.adminService.blockUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Update user in the current list
            this.updateUserInList(response.user);
            alert('User blocked successfully');
          },
          error: (error) => {
            alert(error.error?.message || 'Failed to block user');
          }
        });
    }
  }

  unblockUser(user: User): void {
    if (confirm(`Are you sure you want to unblock ${user.firstName} ${user.lastName}?`)) {
      this.adminService.unblockUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Update user in the current list
            this.updateUserInList(response.user);
            alert('User unblocked successfully');
          },
          error: (error) => {
            alert(error.error?.message || 'Failed to unblock user');
          }
        });
    }
  }

  verifyFarmer(farmer: any, verified: boolean): void {
    const action = verified ? 'verify' : 'unverify';
    if (confirm(`Are you sure you want to ${action} ${farmer.user.firstName} ${farmer.user.lastName}?`)) {
      this.adminService.verifyFarmer(farmer.user.id, verified, verified)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Update farmer in the list
            const index = this.farmersForVerification.findIndex(f => f.user.id === farmer.user.id);
            if (index !== -1) {
              this.farmersForVerification[index] = { ...farmer, ...response.farmer };
            }
            alert(`Farmer ${action}ed successfully`);
            
            // Reload the list if we're showing pending farmers and this farmer was verified
            if (verified) {
              this.loadFarmersForVerification();
            }
          },
          error: (error) => {
            alert(error.error?.message || `Failed to ${action} farmer`);
          }
        });
    }
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      this.adminService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Remove user from the current list
            this.removeUserFromList(user.id);
            alert('User deleted successfully');
          },
          error: (error) => {
            alert(error.error?.message || 'Failed to delete user');
          }
        });
    }
  }

  searchUsers(): void {
    if (!this.searchQuery.trim()) {
      // Reload current tab data
      this.switchTab(this.selectedTab);
      return;
    }

    this.isLoading = true;
    this.adminService.searchUsers(this.searchQuery, this.selectedRole, this.selectedStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Update the appropriate list based on current tab
          if (this.selectedTab === 'farmers') {
            this.farmers = response.users.filter(u => u.role === 'farmer');
          } else if (this.selectedTab === 'consumers') {
            this.consumers = response.users.filter(u => u.role === 'consumer');
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Search failed';
          this.isLoading = false;
        }
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.switchTab(this.selectedTab);
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.switchTab(this.selectedTab);
  }

  // Listings Management
  loadListings(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.adminService.getListings({
      page: this.listingsPage,
      status: this.listingStatus || undefined,
      sponsored: this.listingSponsored ? this.listingSponsored === 'true' : undefined,
      flagged: this.listingFlagged ? this.listingFlagged === 'true' : undefined,
      search: this.listingSearch || undefined
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.listings = res.listings;
        this.listingsTotalPages = res.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load listings';
        this.isLoading = false;
      }
    });
  }

  onListingPageChange(page: number): void {
    this.listingsPage = page;
    this.loadListings();
  }

  onListingFilterChange(): void {
    this.listingsPage = 1;
    this.loadListings();
  }

  searchListings(): void {
    this.listingsPage = 1;
    this.loadListings();
  }

  approveListing(crop: any): void {
    if (!confirm(`Approve listing "${crop.name}"?`)) return;
    this.adminService.approveListing(crop.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          alert(res.message);
          this.loadListings();
        },
        error: (err) => alert(err.error?.message || 'Failed to approve listing')
      });
  }

  flagListing(crop: any): void {
    const reason = prompt('Enter reason to flag this listing (e.g., inappropriate content):');
    if (reason === null) return;
    this.adminService.flagListing(crop.id, reason || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          alert(res.message);
          this.loadListings();
        },
        error: (err) => alert(err.error?.message || 'Failed to flag listing')
      });
  }

  sponsorListing(crop: any): void {
    const daysStr = prompt('Enter sponsorship duration in days (default 30):', '30');
    const days = daysStr ? parseInt(daysStr) : 30;
    if (!Number.isFinite(days) || days <= 0) {
      alert('Invalid duration');
      return;
    }
    this.adminService.sponsorListing(crop.id, days)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          alert(res.message);
          this.loadListings();
        },
        error: (err) => alert(err.error?.message || 'Failed to sponsor listing')
      });
  }

  unsponsorListing(crop: any): void {
    if (!confirm(`Remove sponsorship from "${crop.name}"?`)) return;
    this.adminService.unsponsorListing(crop.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          alert(res.message);
          this.loadListings();
        },
        error: (err) => alert(err.error?.message || 'Failed to remove sponsorship')
      });
  }

  private updateUserInList(updatedUser: User): void {
    // Update in farmers list
    const farmerIndex = this.farmers.findIndex(u => u.id === updatedUser.id);
    if (farmerIndex !== -1) {
      this.farmers[farmerIndex] = updatedUser;
    }

    // Update in consumers list
    const consumerIndex = this.consumers.findIndex(u => u.id === updatedUser.id);
    if (consumerIndex !== -1) {
      this.consumers[consumerIndex] = updatedUser;
    }

    // Update in users list (overview)
    const userIndex = this.users.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
      this.users[userIndex] = updatedUser;
    }
  }

  private removeUserFromList(userId: number): void {
    this.farmers = this.farmers.filter(u => u.id !== userId);
    this.consumers = this.consumers.filter(u => u.id !== userId);
    this.users = this.users.filter(u => u.id !== userId);
    this.farmersForVerification = this.farmersForVerification.filter(f => f.user.id !== userId);
  }

  // Enhanced User Management Methods
  
  /**
   * Approve and verify a farmer
   */
  approveFarmer(userId: number): void {
    if (confirm('Are you sure you want to approve and verify this farmer?')) {
      this.adminService.approveFarmer(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            alert(response.message);
            // Reload verification data
            this.loadFarmersForVerification();
            // Reload farmers list to show updated verification status
            this.loadFarmers();
            // Reload user stats
            this.loadUserStats();
          },
          error: (error) => {
            alert(error.error?.message || 'Failed to approve farmer');
          }
        });
    }
  }

  /**
   * Reject farmer verification
   */
  rejectFarmer(userId: number): void {
    const reason = prompt('Enter reason for rejection (optional):');
    if (reason !== null) { // User didn't cancel
      this.adminService.rejectFarmer(userId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            alert(response.message);
            this.loadFarmersForVerification();
            this.loadFarmers();
            this.loadUserStats();
          },
          error: (error) => {
            alert(error.error?.message || 'Failed to reject farmer');
          }
        });
    }
  }

  /**
   * Suspend/Block a user
   */
  suspendUser(userId: number): void {
    const reason = prompt('Enter reason for suspension:');
    if (!reason?.trim()) {
      alert('Suspension reason is required');
      return;
    }

    const durationStr = prompt('Enter suspension duration in days (leave empty for permanent):');
    const duration = durationStr ? parseInt(durationStr) : undefined;

    if (confirm(`Suspend user for ${duration ? duration + ' days' : 'permanently'}?\nReason: ${reason}`)) {
      this.adminService.suspendUser(userId, reason, duration)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            alert(response.message);
            // Reload current tab data
            this.switchTab(this.selectedTab);
            this.loadUserStats();
          },
          error: (error) => {
            alert(error.error?.message || 'Failed to suspend user');
          }
        });
    }
  }

  /**
   * Restore/Unblock a user
   */
  restoreUser(userId: number): void {
    if (confirm('Are you sure you want to restore this user?')) {
      this.adminService.restoreUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            alert(response.message);
            this.switchTab(this.selectedTab);
            this.loadUserStats();
          },
          error: (error) => {
            alert(error.error?.message || 'Failed to restore user');
          }
        });
    }
  }

  /**
   * Delete user account permanently
   */
  deleteUserAccount(userId: number, userName: string): void {
    const confirmationMessage = `Are you sure you want to delete the user account for "${userName}"?\n\nThis action will:\n- Deactivate the account\n- Anonymize the email\n- Remove personal information\n\nThis action cannot be undone.`;
     
    if (confirm(confirmationMessage)) {
      const doubleConfirm = confirm('This is your final warning. Confirm deletion:');
      if (doubleConfirm) {
        this.adminService.deleteUserAccount(userId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              alert(response.message);
              // Remove user from current list
              this.removeUserFromList(userId);
              this.loadUserStats();
            },
            error: (error) => {
              alert(error.error?.message || 'Failed to delete user account');
            }
          });
      }
    }
  }

  /**
   * Check if user is currently suspended
   */
  isUserSuspended(user: User): boolean {
    if (!user.suspendedUntil) return false;
    return new Date(user.suspendedUntil) > new Date();
  }

  /**
   * Get suspension info for display
   */
  getSuspensionInfo(user: User): string {
    if (!user.suspendedUntil) return '';
    
    const suspendedDate = new Date(user.suspendedUntil);
    const now = new Date();
    
    if (suspendedDate > now) {
      const daysLeft = Math.ceil((suspendedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `Suspended (${daysLeft} days left)`;
    }
    
    return 'Suspension expired';
  }

  /**
   * Get user status display text
   */
  getUserStatusText(user: User): string {
    if (user.isActive === false) {
      return 'Blocked';
    }
    
    if (this.isUserSuspended(user)) {
      return this.getSuspensionInfo(user);
    }
    
    if (user.deletedAt) {
      return 'Deleted';
    }
    
    return 'Active';
  }

  /**
   * Get user status class for styling
   */
  getUserStatusClass(user: User): string {
    if (user.isActive === false || user.deletedAt) {
      return 'status-danger';
    }
    
    if (this.isUserSuspended(user)) {
      return 'status-warning';
    }
    
    return 'status-active';
  }
}
