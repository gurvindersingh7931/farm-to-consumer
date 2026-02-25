import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() totalItems?: number;
  @Input() pageSize?: number;

  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  get rangeText(): string | null {
    if (!this.totalItems || !this.pageSize) {
      return null;
    }
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
    return `Showing ${start} to ${end} of ${this.totalItems} items`;
  }

  goToFirst(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(1);
    }
  }

  goToPrevious(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  goToNext(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  goToLast(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.totalPages);
    }
  }

  goToPage(page: number): void {
    if (page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
}

