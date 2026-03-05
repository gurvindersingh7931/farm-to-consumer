import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CropService, Crop, CreateCropRequest, UpdateCropRequest } from '../../services/crop.service';
import { CropCardComponent, CropCardData } from '../../shared/crop-card/crop-card.component';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ModalDialogComponent } from '../../shared/modal-dialog/modal-dialog.component';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-crop-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    PaginationComponent,
    CropCardComponent,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ModalDialogComponent,
  ],
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

  cropForm: FormGroup;
  categoryOptions: string[] = [];
  unitOptions: string[] = [];
  statusOptions: string[] = [];
  Math = Math;
  private authSubscription: Subscription | undefined;

  constructor(
    private fb: FormBuilder,
    public cropService: CropService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
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
      location: ['', [Validators.required, Validators.maxLength(255)]],
      imageUrl: [''],
      organic: [false],
      isActive: [true],
      isAvailable: [true],
      isPremium: [false],
    });

    this.categoryOptions = this.cropService.categoryOptions;
    this.unitOptions = this.cropService.unitOptions;
    this.statusOptions = this.cropService.statusFilterOptions;
  }

  ngOnInit(): void {
    this.loadCrops();
    this.loadCategories();

    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'farmer') {
      this.router.navigate(['/login']);
    }
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
        // Normalize API categories to plain strings (backend may return objects)
        const apiCategories = (response.categories || []).map((c: any) => {
          if (typeof c === 'string') {
            return c;
          }
          // Try common field names first
          const candidate =
            (c && (c.name || c.label || c.title || c.category)) ??
            Object.values(c).find((v) => typeof v === 'string');
          return candidate || '';
        }).filter((c: string) => !!c && c.trim().length > 0);

        // Merge with predefined categories and remove duplicates
        const allCategories = [...new Set([...this.categoryOptions, ...apiCategories])];
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

    // If editingCrop is set, we are in edit mode (modal or inline)
    if (this.editingCrop) {
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
        isAvailable: formValue.isAvailable,
        isPremium: formValue.isPremium,
        removeImage: !this.imagePreview && this.editingCrop.imageUrl ? true : undefined
      };

      this.cropService.updateCrop(this.editingCrop.id!, updateData, this.selectedFile || undefined).subscribe({
        next: (response) => {
          this.isSaving = false;
          this.closeCropModal();
          this.loadCrops();
          this.toastr.success('Crop updated successfully');
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
          this.closeCropModal();
          this.loadCrops();
          this.toastr.success('Crop saved successfully');
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
    const imageUrl = (crop as any).image_url ?? crop.imageUrl;
    return this.cropService.getCropImageUrl(imageUrl, crop.category);
  }

  formatPrice(price: number | string): string {
    return this.cropService.formatPrice(price);
  }

  formatQuantity(quantity: number | string, unit: string): string {
    return this.cropService.formatQuantity(quantity, unit);
  }

  getCropCardData(crop: Crop): CropCardData {
    // Support both imageUrl and image_url (snake_case) from API
    const imageUrl = (crop as any).image_url ?? crop.imageUrl;
    return {
      name: crop.name,
      imageUrl: this.cropService.getCropImageUrl(imageUrl, crop.category),
      priceText: this.formatPrice(crop.pricePerKg),
      fallbackImageUrl: this.cropService.getFallbackImage(crop.category),
      category: crop.category,
      quantityText: this.formatQuantity(crop.quantity, crop.unit),
      isOrganic: crop.organic || crop.isOrganic,
      isPremium: crop.isPremium,
      statusLabel: this.getStatusDisplayText(this.getCropStatus(crop)),
      statusClass: this.getStatusColorClass(this.getCropStatus(crop)),
      harvestDate: crop.harvestDate ?? null,
      expiryDate: crop.expiryDate ?? null,
      isActive: crop.isActive,
      isAvailable: crop.isAvailable,
    };
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
      harvestDate: crop.harvestDate ? crop.harvestDate.split('T')[0] : '',
      expiryDate: crop.expiryDate ? crop.expiryDate.split('T')[0] : '',
      location: crop.location || '',
      organic: crop.organic || false,
      isActive: crop.isActive,
      isAvailable: crop.isAvailable,
      isPremium: crop.isPremium
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
