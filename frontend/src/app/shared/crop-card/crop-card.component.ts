import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

export type CropCardMode = 'browse' | 'manage';

export interface CropCardData {
  name: string;
  imageUrl: string;
  priceText: string;
  fallbackImageUrl?: string;
  category?: string;
  description?: string | null;
  quantityText?: string;
  isOrganic?: boolean;
  isPremium?: boolean;
  freshnessBadge?: { text: string; class: string } | null;
  premiumBadges?: string[];
  farmerName?: string;
  farmerLocation?: string;
  distanceText?: string;
  ratingValue?: number;
  ratingInfo?: { full: number; half: boolean; empty: number } | null;
  statusLabel?: string;
  statusClass?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  harvestDate?: string | null;
  expiryDate?: string | null;
  detailLink?: any[] | string;
  farmerLink?: any[] | string | null;
}

@Component({
  selector: 'app-crop-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './crop-card.component.html',
  styleUrls: ['./crop-card.component.scss'],
})
export class CropCardComponent {
  @Input() mode: CropCardMode = 'browse';
  @Input() data!: CropCardData;

  @Output() toggleAvailability = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  onImageError(event: Event): void {
    const img = event?.target as HTMLImageElement | null;
    if (img && this.data?.fallbackImageUrl) {
      img.src = this.data.fallbackImageUrl;
    }
  }

  onToggleAvailability(): void {
    this.toggleAvailability.emit();
  }

  onEdit(): void {
    this.edit.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }
}
