import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth header for public endpoints
    const url = req.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
    const token = localStorage.getItem('token');

    let authReq = req;
    if (!isAuthEndpoint && token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          // Optionally, redirect to login or clear storage
          // localStorage.removeItem('token');
          // window.location.href = '/login';
        }
        return throwError(() => error);
      })
    );
  }
}


