import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionStoreService } from '@app/services/stores/collection.store.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { Collection } from '@app/models/base-models/collection';
import { MatDividerModule } from '@angular/material/divider';

const DESCRIPTION_MAX_LENGTH = 2500;

@Component({
  selector: 'app-collection-create-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './collection-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CollectionCreateDialogComponent {
  dialogRef = inject(MatDialogRef<CollectionCreateDialogComponent, Collection | false>);
  private collectionStore = inject(CollectionStoreService);
  private snackbarService = inject(SnackbarService);

  readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

  name = '';
  description = '';
  isPrivate = false;
  creating = signal(false);

  get isValid(): boolean {
    return this.name.trim().length > 0 && this.description.length <= this.descriptionMaxLength;
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  async onCreate() {
    if (!this.isValid || this.creating()) return;

    this.creating.set(true);
    try {
      const collection = await this.collectionStore.create({
        name: this.name.trim(),
        description: this.description.trim() || null,
        isPrivate: this.isPrivate,
      });
      this.snackbarService.success(`Collection "${this.name.trim()}" created`);
      this.dialogRef.close(collection ?? false);
    } catch {
      this.snackbarService.error('Failed to create collection');
    } finally {
      this.creating.set(false);
    }
  }
}
