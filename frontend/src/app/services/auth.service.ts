import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { setUser, clearUser } from '../store/auth/auth.actions';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'consumer' | 'admin';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'farmer' | 'consumer';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private store: Store
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      const parsed = JSON.parse(user) as User;
      this.store.dispatch(setUser({ user: parsed }));
    } else {
      this.store.dispatch(clearUser());
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.store.dispatch(setUser({ user: response.user }));
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, userData)
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.store.dispatch(setUser({ user: response.user }));
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.store.dispatch(clearUser());
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? (JSON.parse(user) as User) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (payload && typeof payload.exp === 'number') {
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (payload.exp < nowSeconds) {
          // Token expired: proactively clear session
          this.logout();
          return false;
        }
      }
    } catch {
      // Malformed token: clear and treat as unauthenticated
      this.logout();
      return false;
    }

    return true;
  }

  updateProfile(profileData: { firstName?: string; lastName?: string; email?: string }): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.API_URL}/auth/profile`, profileData, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    }).pipe(
      tap(response => {
        localStorage.setItem('user', JSON.stringify(response.user));
        this.store.dispatch(setUser({ user: response.user }));
      })
    );
  }

  isFarmer(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'farmer';
  }

  isConsumer(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'consumer';
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getProfile(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API_URL}/auth/profile`, {
      headers: this.getAuthHeaders()
    });
  }
}
