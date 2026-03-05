import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-modal-dialog',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './modal-dialog.component.html',
  styleUrls: ['./modal-dialog.component.scss']
})
export class ModalDialogComponent {
  /** Controls whether the dialog is visible */
  @Input() open = false;

  /** Title text shown in the header */
  @Input() title = '';

  /** Optional subtitle text */
  @Input() subtitle?: string;

  /** Optional Material icon name shown to the left of the title */
  @Input() icon?: string;

  /** Whether to render a close icon button in the header */
  @Input() showClose = true;

  /** If true, clicking on the backdrop will not close/cancel the dialog */
  @Input() disableBackdropClose = false;

  /** Emitted when the user clicks the close icon or the Cancel button */
  @Output() cancel = new EventEmitter<void>();

  /** Emitted when the user clicks the primary action button (if used) */
  @Output() confirm = new EventEmitter<void>();

  /** Emitted on any close intent; can be used for generic close handling */
  @Output() closed = new EventEmitter<void>();

  onBackdropClick(): void {
    if (this.disableBackdropClose) {
      return;
    }
    this.emitCancel();
  }

  onCloseClick(): void {
    this.emitCancel();
  }

  onConfirmClick(): void {
    this.confirm.emit();
    this.closed.emit();
  }

  private emitCancel(): void {
    this.cancel.emit();
    this.closed.emit();
  }
}

