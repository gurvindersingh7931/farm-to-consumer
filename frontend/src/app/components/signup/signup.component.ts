import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterRequest, AuthResponse } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  signupForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  selectedRole: 'farmer' | 'consumer' = 'consumer';
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.strongPasswordValidator]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    const errors = { ...(confirmPassword.errors || {}) };

    if (password.value !== confirmPassword.value) {
      errors['passwordMismatch'] = true;
      confirmPassword.setErrors(errors);
      return { passwordMismatch: true };
    }

    // Passwords match – remove mismatch error but keep others (e.g. minlength)
    if ('passwordMismatch' in errors) {
      delete errors['passwordMismatch'];
      const hasOtherErrors = Object.keys(errors).length > 0;
      confirmPassword.setErrors(hasOtherErrors ? errors : null);
    }

    return null;
  }

  private strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) {
      return null;
    }

    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[@$!%*?&]/.test(value);

    return hasLower && hasUpper && hasDigit && hasSpecial ? null : { weakPassword: true };
  }

  selectRole(role: 'farmer' | 'consumer'): void {
    this.selectedRole = role;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const formData = this.signupForm.value;
      const userData: RegisterRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: this.selectedRole
      };
      
      this.authService.register(userData).subscribe({
        next: (response: AuthResponse) => {
          this.isLoading = false;
          // Redirect based on user role
          if (response.user.role === 'farmer') {
            this.router.navigate(['/farmer-dashboard']);
          } else {
            this.router.navigate(['/browse-crops']);
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }

  get firstName() { return this.signupForm.get('firstName'); }
  get lastName() { return this.signupForm.get('lastName'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }
  get confirmPassword() { return this.signupForm.get('confirmPassword'); }
}
