import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CropService, Crop, CreateCropRequest, UpdateCropRequest } from '../../services/crop.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-crop-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './crop-management.component.html',
  styleUrls: ['./crop-management.component.scss']
})
export class CropManagementComponent implements OnInit, OnDestroy {
  crops: Crop[] = [];
  isLoading = false;
  isSaving = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  showAddForm = false;
  showEditForm = false;
  showModal = false;
  isCropModalOpen = false;
  editingCrop: Crop | null = null;
  selectedFile: File | null = null;
  imageFile: File | null = null;
  imagePreview: string | null = null;
  currentPage = 1;
  totalPages = 1;
  totalCrops = 0;
  pageSize = 10;
  selectedCategory = '';
  selectedStatus = '';
  showFilters = false;

  cropForm: FormGroup;
  categoryOptions: string[] = [];
  unitOptions: string[] = [];
  Math = Math;
  private authSubscription: Subscription | undefined;

  constructor(
    private fb: FormBuilder,
    public cropService: CropService,
    private authService: AuthService,
    private router: Router
  ) {
    this.cropForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(1000)]],
      pricePerKg: ['', [Validators.required, Validators.min(0.01), Validators.max(10000)]],
      quantity: ['', [Validators.required, Validators.min(0.01), Validators.max(100000)]],
      unit: ['kg', [Validators.required]],
      category: ['', [Validators.required]],
      harvestDate: [''],
      expiryDate: [''],
      location: ['', [Validators.maxLength(255)]],
      imageUrl: [''],
      organic: [false],
      isActive: [true]
    });

    this.categoryOptions = this.cropService.categoryOptions;
    this.unitOptions = this.cropService.unitOptions;
  }

  ngOnInit(): void {
    this.loadCrops();
    this.loadCategories();

    this.authSubscription = this.authService.currentUser$.subscribe((user: any) => {
      if (!user || user.role !== 'farmer') {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  loadCrops(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cropService.getFarmerCrops(
      this.currentPage,
      10,
      this.selectedCategory || undefined,
      this.selectedStatus === 'active' ? true : this.selectedStatus === 'inactive' ? false : undefined
    ).subscribe({
      next: (response) => {
        this.crops = response.crops;
        this.totalPages = response.pagination.totalPages;
        this.totalCrops = response.pagination.total;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to load crops';
        this.isLoading = false;
      }
    });
  }

  loadCategories(): void {
    this.cropService.getCropCategories().subscribe({
      next: (response) => {
        // Merge with predefined categories and remove duplicates
        const allCategories = [...new Set([...this.categoryOptions, ...response.categories])];
        this.categoryOptions = allCategories.sort();
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadCrops();
  }

  onCategoryFilter(category: string): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.loadCrops();
  }

  onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.loadCrops();
  }

  showAddCropForm(): void {
    this.showAddForm = true;
    this.showEditForm = false;
    this.editingCrop = null;
    this.resetForm();
  }

  showEditCropForm(crop: Crop): void {
    this.showEditForm = true;
    this.showAddForm = false;
    this.editingCrop = crop;
    this.populateForm(crop);
  }

  hideForms(): void {
    this.showAddForm = false;
    this.showEditForm = false;
    this.editingCrop = null;
    this.resetForm();
    this.selectedFile = null;
    this.imagePreview = null;
  }

  resetForm(): void {
    this.cropForm.reset({
      unit: 'kg',
      organic: false,
      isActive: true
    });
    this.selectedFile = null;
    this.imagePreview = null;
  }

  populateForm(crop: Crop): void {
    this.cropForm.patchValue({
      name: crop.name,
      description: crop.description || '',
      pricePerKg: crop.pricePerKg,
      quantity: crop.quantity,
      unit: crop.unit,
      category: crop.category,
      harvestDate: crop.harvestDate ? crop.harvestDate.split('T')[0] : '',
      expiryDate: crop.expiryDate ? crop.expiryDate.split('T')[0] : '',
      location: crop.location || '',
      organic: crop.organic,
      isActive: crop.isActive
    });

    if (crop.imageUrl) {
      this.imagePreview = this.cropService.getCropImageUrl(crop.imageUrl);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.imageFile = input.files[0]; // Sync with template property
      const reader = new FileReader();
      reader.onload = (e) => (this.imagePreview = reader.result as string);
      reader.readAsDataURL(this.selectedFile);
    } else {
      this.selectedFile = null;
      this.imageFile = null; // Sync with template property
      this.imagePreview = this.editingCrop?.imageUrl ? this.cropService.getCropImageUrl(this.editingCrop.imageUrl) : null;
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imageFile = null;
    this.imagePreview = null;
  }

  onSubmit(): void {
    if (this.cropForm.invalid) {
      this.markFormGroupTouched(this.cropForm);
      this.errorMessage = 'Please correct the errors in the form';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.cropForm.value;

    if (this.showEditForm && this.editingCrop) {
      // Update existing crop
        const updateData: UpdateCropRequest = {
          name: formValue.name,
          description: formValue.description,
          pricePerKg: parseFloat(formValue.pricePerKg),
          quantity: parseFloat(formValue.quantity),
          unit: formValue.unit,
          category: formValue.category,
          harvestDate: formValue.harvestDate || undefined,
          expiryDate: formValue.expiryDate || undefined,
          location: formValue.location,
          organic: formValue.organic,
          isActive: formValue.isActive,
          isAvailable: this.editingCrop.isAvailable, // Keep current availability status
          removeImage: !this.imagePreview && this.editingCrop.imageUrl ? true : undefined
        };

      this.cropService.updateCrop(this.editingCrop.id!, updateData, this.selectedFile || undefined).subscribe({
        next: (response) => {
          this.isSaving = false;
          this.successMessage = response.message;
          this.hideForms();
          this.loadCrops();
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = error.error?.message || 'Failed to update crop';
        }
      });
    } else {
      // Create new crop
      const createData: CreateCropRequest = {
        name: formValue.name,
        description: formValue.description,
        pricePerKg: parseFloat(formValue.pricePerKg),
        quantity: parseFloat(formValue.quantity),
        unit: formValue.unit,
        category: formValue.category,
        harvestDate: formValue.harvestDate || undefined,
        expiryDate: formValue.expiryDate || undefined,
        location: formValue.location,
        organic: formValue.organic
      };

      this.cropService.createCrop(createData, this.selectedFile || undefined).subscribe({
        next: (response) => {
          this.isSaving = false;
          this.successMessage = response.message;
          this.hideForms();
          this.loadCrops();
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = error.error?.message || 'Failed to create crop';
        }
      });
    }
  }

  deleteCrop(crop: Crop): void {
    if (confirm(`Are you sure you want to delete "${crop.name}"? This action cannot be undone.`)) {
      this.cropService.deleteCrop(crop.id!).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          this.loadCrops();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to delete crop';
        }
      });
    }
  }

  toggleCropStatus(crop: Crop): void {
    const updateData: UpdateCropRequest = {
      name: crop.name,
      description: crop.description,
      pricePerKg: crop.pricePerKg,
      quantity: crop.quantity,
      unit: crop.unit,
      category: crop.category,
      harvestDate: crop.harvestDate,
      expiryDate: crop.expiryDate,
      location: crop.location,
      organic: crop.organic,
      isActive: !crop.isActive
    };

    this.cropService.updateCrop(crop.id!, updateData).subscribe({
      next: (response) => {
        this.successMessage = `Crop ${!crop.isActive ? 'activated' : 'deactivated'} successfully`;
        this.loadCrops();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to update crop status';
      }
    });
  }

  toggleCropAvailability(crop: Crop): void {
    this.cropService.toggleAvailability(crop.id!).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadCrops();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to update crop availability';
      }
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getCropStatus(crop: Crop): string {
    return this.cropService.getCropStatus(crop);
  }

  getStatusColorClass(status: string): string {
    return this.cropService.getStatusColorClass(status);
  }

  getStatusDisplayText(status: string): string {
    return this.cropService.getStatusDisplayText(status);
  }

  getCropImageUrl(crop: Crop): string {
    return this.cropService.getCropImageUrl(crop.imageUrl, crop.category);
  }

  formatPrice(price: number | string): string {
    return this.cropService.formatPrice(price);
  }

  formatQuantity(quantity: number | string, unit: string): string {
    return this.cropService.formatQuantity(quantity, unit);
  }

  // Modal methods
  openCropModal(crop?: Crop): void {
    if (crop) {
      this.editingCrop = crop;
      this.editCrop(crop);
    } else {
      this.editingCrop = null;
      this.resetForm();
    }
    this.showModal = true;
    this.isCropModalOpen = true;
  }

  closeCropModal(): void {
    this.showModal = false;
    this.isCropModalOpen = false;
    this.editingCrop = null;
    this.selectedFile = null;
    this.imageFile = null;
    this.imagePreview = null;
    this.resetForm();
  }

  closeModal(): void {
    this.closeCropModal();
  }

  // Backward-compat for template function names used in HTML
  openModal(): void {
    this.openCropModal();
  }

  getActiveCropsCount(): number {
    return this.crops.filter(c => c.isActive).length;
  }

  getAvailableCropsCount(): number {
    return this.crops.filter(c => c.isAvailable).length;
  }

  getSoldOutCropsCount(): number {
    return this.crops.filter(c => !c.isAvailable).length;
  }

  onImageError(event: Event, fallbackSrc: string): void {
    const img = event?.target as HTMLImageElement | null;
    if (img) img.src = fallbackSrc;
  }

  // Edit crop method
  editCrop(crop: Crop): void {
    this.editingCrop = crop;
    this.cropForm.patchValue({
      name: crop.name,
      description: crop.description,
      pricePerKg: crop.pricePerKg,
      quantity: crop.quantity,
      unit: crop.unit,
      category: crop.category,
      harvestDate: crop.harvestDate || '',
      expiryDate: crop.expiryDate || '',
      location: crop.location || '',
      organic: crop.organic || false,
      isActive: crop.isActive
    });
    this.imagePreview = crop.imageUrl ? this.getCropImageUrl(crop) : null;
  }

  // Save crop method (wrap onSubmit)
  saveCrop(): void {
    this.onSubmit();
  }

  toggleAvailability(crop: Crop): void {
    this.toggleCropAvailability(crop);
  }

  // Form getters for validation
  get name() { return this.cropForm.get('name'); }
  get description() { return this.cropForm.get('description'); }
  get pricePerKg() { return this.cropForm.get('pricePerKg'); }
  get quantity() { return this.cropForm.get('quantity'); }
  get unit() { return this.cropForm.get('unit'); }
  get category() { return this.cropForm.get('category'); }
  get harvestDate() { return this.cropForm.get('harvestDate'); }
  get expiryDate() { return this.cropForm.get('expiryDate'); }
  get location() { return this.cropForm.get('location'); }
  get organic() { return this.cropForm.get('organic'); }
  get isActive() { return this.cropForm.get('isActive'); }
}
