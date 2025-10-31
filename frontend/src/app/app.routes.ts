import { Routes } from '@angular/router';
import { ShellLayoutComponent } from './layout/shell-layout.component';
import { AuthGuard, RoleGuard, AdminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent) },
  {
    path: '', // shell for authenticated areas
    component: ShellLayoutComponent,
    children: [
      { 
        path: 'farmer-dashboard', 
        loadComponent: () => import('./components/dashboard/farmer-dashboard/farmer-dashboard.component').then(m => m.FarmerDashboardComponent),
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
        path: 'consumer-dashboard', 
        loadComponent: () => import('./components/dashboard/consumer-dashboard/consumer-dashboard.component').then(m => m.ConsumerDashboardComponent),
        canActivate: [AuthGuard, RoleGuard],
        data: { roles: ['consumer'] }
      },
      { 
        path: 'admin-dashboard', 
        loadComponent: () => import('./components/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
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
      }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
