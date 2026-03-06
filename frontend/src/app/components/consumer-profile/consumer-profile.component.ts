import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-consumer-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './consumer-profile.component.html',
  styleUrls: ['./consumer-profile.component.scss']
})
export class ConsumerProfileComponent implements OnInit {
  user: User | null = null;
  profileForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  location = 'Patiala';

  constructor(
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      location: ['Patiala', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    const storedLocation = localStorage.getItem('consumerLocation');
    this.location = storedLocation || 'Patiala';

    if (this.user) {
      this.profileForm.patchValue({
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        location: this.location
      });
    }
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    this.errorMessage = '';
    this.successMessage = '';
    
    if (this.isEditMode && this.user) {
      this.profileForm.patchValue({
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        location: this.location
      });
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.profileForm.value;
    const nextLocation = formValue.location || 'Patiala';

    this.authService.updateProfile({
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email
    }).subscribe({
      next: (response) => {
        this.user = response.user;
        this.location = nextLocation;
        localStorage.setItem('consumerLocation', this.location);
        this.isLoading = false;
        this.successMessage = 'Profile updated successfully!';
        this.isEditMode = false;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to update profile';
      }
    });
  }

  cancel(): void {
    this.toggleEditMode();
  }
}

