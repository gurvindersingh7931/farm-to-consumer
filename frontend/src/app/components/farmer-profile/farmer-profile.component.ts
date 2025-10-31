import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FarmerService, FarmerProfile, CreateFarmerProfileRequest, UpdateFarmerProfileRequest } from '../../services/farmer.service';
import { AuthService } from '../../services/auth.service';

declare var google: any;

@Component({
  selector: 'app-farmer-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './farmer-profile.component.html',
  styleUrl: './farmer-profile.component.scss'
})
export class FarmerProfileComponent implements OnInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  profileForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  farmerProfile: FarmerProfile | null = null;
  selectedFile: File | null = null;
  profilePhotoPreview: string | null = null;
  map: any;
  marker: any;
  isMapLoaded = false;


  constructor(
    private fb: FormBuilder,
    public farmerService: FarmerService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      phone: ['', [Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      farmName: ['', [Validators.required, Validators.minLength(2)]],
      farmDescription: [''],
      farmLocation: [''],
      address: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      country: [''],
      website: ['', [this.websiteValidator.bind(this)]]
    });

  }

  ngOnInit(): void {
    this.loadFarmerProfile();
    this.loadGoogleMaps();
  }

  loadGoogleMaps(): void {
    if (typeof google !== 'undefined') {
      this.initializeMap();
    } else {
      // Load Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
      script.onload = () => {
        this.initializeMap();
      };
      document.head.appendChild(script);
    }
  }

  initializeMap(): void {
    if (!this.mapContainer) return;

    // Default location (you can change this to a default location)
    const defaultLocation = { lat: 40.7128, lng: -74.0060 }; // New York City

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      zoom: 10,
      center: defaultLocation,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    this.marker = new google.maps.Marker({
      position: defaultLocation,
      map: this.map,
      draggable: true,
      title: 'Farm Location'
    });

    // Add click listener to map
    this.map.addListener('click', (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.updateLocation(lat, lng);
    });

    // Add drag listener to marker
    this.marker.addListener('dragend', () => {
      const position = this.marker.getPosition();
      const lat = position.lat();
      const lng = position.lng();
      this.updateLocation(lat, lng);
    });

    // Add search box
    const searchBox = new google.maps.places.SearchBox(
      document.getElementById('search-box') as HTMLInputElement
    );

    this.map.addListener('bounds_changed', () => {
      searchBox.setBounds(this.map.getBounds()!);
    });

    searchBox.addListener('places_changed', () => {
      const places = searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          this.updateLocation(lat, lng);
          this.map.setCenter(place.geometry.location);
          this.map.setZoom(15);
        }
      }
    });

    this.isMapLoaded = true;
  }

  updateLocation(lat: number, lng: number): void {
    this.profileForm.patchValue({
      latitude: lat,
      longitude: lng
    });

    // Update marker position
    if (this.marker) {
      this.marker.setPosition({ lat, lng });
    }

    // Reverse geocoding to get address
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const addressComponents = results[0].address_components;
        let address = '';
        let city = '';
        let state = '';
        let zipCode = '';
        let country = '';

        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number') || types.includes('route')) {
            address += component.long_name + ' ';
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.short_name;
          } else if (types.includes('postal_code')) {
            zipCode = component.long_name;
          } else if (types.includes('country')) {
            country = component.long_name;
          }
        });

        this.profileForm.patchValue({
          address: address.trim(),
          city,
          state,
          zipCode,
          country,
          farmLocation: results[0].formatted_address
        });
      }
    });
  }

  loadFarmerProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.farmerService.getProfile().subscribe({
      next: (response) => {
        this.farmerProfile = response.farmer;
        this.populateForm();
        this.isEditMode = false;
        this.isLoading = false;
      },
      error: (error) => {
        if (error.status === 404) {
          // Profile doesn't exist, show create form
          this.isEditMode = true;
        } else {
          this.errorMessage = error.error?.message || 'Failed to load farmer profile';
        }
        this.isLoading = false;
      }
    });
  }

  populateForm(): void {
    if (this.farmerProfile) {
      this.profileForm.patchValue({
        phone: this.farmerProfile.phone || '',
        farmName: this.farmerProfile.farmName || '',
        farmDescription: this.farmerProfile.farmDescription || '',
        farmLocation: this.farmerProfile.farmLocation || '',
        address: this.farmerProfile.address || '',
        city: this.farmerProfile.city || '',
        state: this.farmerProfile.state || '',
        zipCode: this.farmerProfile.zipCode || '',
        country: this.farmerProfile.country || '',
        website: this.farmerProfile.website || ''
      });

      // Update map location if coordinates exist
      if (this.farmerProfile.latitude && this.farmerProfile.longitude) {
        setTimeout(() => {
          if (this.map && this.marker) {
            const location = {
              lat: this.farmerProfile!.latitude!,
              lng: this.farmerProfile!.longitude!
            };
            this.map.setCenter(location);
            this.marker.setPosition(location);
          }
        }, 1000);
      }

      // Set profile photo preview
      if (this.farmerProfile.profilePhoto) {
        this.profilePhotoPreview = this.farmerService.getProfilePhotoUrl(this.farmerProfile.profilePhoto);
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profilePhotoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = this.profileForm.value;
      const profileData: CreateFarmerProfileRequest | UpdateFarmerProfileRequest = {
        phone: formData.phone,
        farmName: formData.farmName,
        farmDescription: formData.farmDescription,
        farmLocation: formData.farmLocation,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        website: formData.website
      };

      const operation = this.farmerProfile 
        ? this.farmerService.updateProfile(profileData, this.selectedFile || undefined)
        : this.farmerService.createProfile(profileData, this.selectedFile || undefined);

      operation.subscribe({
        next: (response) => {
          this.farmerProfile = response.farmer;
          this.successMessage = response.message;
          this.isEditMode = false;
          this.selectedFile = null;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to save farmer profile';
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (this.isEditMode) {
      this.populateForm();
    }
  }

  deleteProfile(): void {
    if (confirm('Are you sure you want to delete your farmer profile? This action cannot be undone.')) {
      this.isLoading = true;
      this.farmerService.deleteProfile().subscribe({
        next: () => {
          this.router.navigate(['/farmer-dashboard']);
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to delete farmer profile';
          this.isLoading = false;
        }
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }


  websiteValidator(control: any): { [key: string]: any } | null {
    if (!control.value) return null;
    return this.farmerService.validateWebsite(control.value) ? null : { invalidWebsite: true };
  }

  get phone() { return this.profileForm.get('phone'); }
  get farmName() { return this.profileForm.get('farmName'); }
  get website() { return this.profileForm.get('website'); }
}
