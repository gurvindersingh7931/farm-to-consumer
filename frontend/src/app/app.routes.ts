import { Routes } from '@angular/router';
import { ShellLayoutComponent } from './layout/shell-layout.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard, AdminGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent) },
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      { 
        path: 'farmer-dashboard', 
        loadComponent: () => import('./components/dashboard/farmer-analytics/farmer-analytics.component').then(m => m.FarmerAnalyticsComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['farmer'] }
      },
      {
        path: 'farmer-profile',
        loadComponent: () => import('./components/farmer-profile/farmer-profile.component').then(m => m.FarmerProfileComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['farmer'] }
      },
      {
        path: 'crop-management',
        loadComponent: () => import('./components/crop-management/crop-management.component').then(m => m.CropManagementComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['farmer'] }
      },
      {
        path: 'order-management',
        loadComponent: () => import('./components/order-management/order-management.component').then(m => m.OrderManagementComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['farmer'] }
      },
      {
        path: 'subscription',
        loadComponent: () => import('./components/subscription/subscription.component').then(m => m.SubscriptionComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['farmer'] }
      },
      { 
        path: 'consumer-dashboard', 
        loadComponent: () => import('./components/dashboard/consumer-dashboard/consumer-dashboard.component').then(m => m.ConsumerDashboardComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['consumer'] }
      },
      {
        path: 'consumer-profile',
        loadComponent: () => import('./components/consumer-profile/consumer-profile.component').then(m => m.ConsumerProfileComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['consumer'] }
      },
      { 
        path: 'admin-dashboard', 
        loadComponent: () => import('./components/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'admin/farmers',
        loadComponent: () => import('./components/admin/admin-farmers/admin-farmers.component').then(m => m.AdminFarmersComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'admin/consumers',
        loadComponent: () => import('./components/admin/admin-consumers/admin-consumers.component').then(m => m.AdminConsumersComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'admin/listings',
        loadComponent: () => import('./components/admin/admin-listings/admin-listings.component').then(m => m.AdminListingsComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'admin/verification',
        loadComponent: () => import('./components/admin/admin-verification/admin-verification.component').then(m => m.AdminVerificationComponent),
        canActivate: [AdminGuard]
      }
    ]
  },
  {
    path: '', // shell for public sections where sidebar is desired
    component: ShellLayoutComponent,
    children: [
      {
        path: 'farmers',
        loadComponent: () => import('./components/farmers-list/farmers-list.component').then(m => m.FarmersListComponent)
      },
      {
        path: 'browse-crops',
        loadComponent: () => import('./components/crop-browse/crop-browse.component').then(m => m.CropBrowseComponent)
      },
      {
        path: 'crop-detail/:id',
        loadComponent: () => import('./components/crop-detail/crop-detail.component').then(m => m.CropDetailComponent)
      },
      {
        path: 'farmer-detail/:id',
        loadComponent: () => import('./components/farmer-detail/farmer-detail.component').then(m => m.FarmerDetailComponent)
      }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
