import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CollectionStoreService } from '@app/services/stores/collection.store.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { Collection } from '@app/models/base-models/collection';
import { CollectionCreateDialogComponent } from '@app/components/dialogs/collection-create-dialog/collection-create-dialog.component';
import { MatDividerModule } from '@angular/material/divider';

export interface AddToCollectionDialogData {
  snippetId: string;
}

@Component({
  selector: 'app-add-to-collection-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './add-to-collection-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AddToCollectionDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<AddToCollectionDialogComponent>);
  data = inject<AddToCollectionDialogData>(MAT_DIALOG_DATA);

  private collectionStore = inject(CollectionStoreService);
  private snackbarService = inject(SnackbarService);
  private dialogService = inject(DialogService);

  addingId = signal<string | null>(null);

  get collections(): Collection[] {
    return this.collectionStore.collections();
  }

  get loading(): boolean {
    return this.collectionStore.loading();
  }

  ngOnInit(): void {
    void this.collectionStore.loadMine(1, 50, this.data.snippetId);
  }

  isInCollection(collection: Collection): boolean {
    return !!collection.containsSnippet;
  }

  async addTo(collection: Collection) {
    if (this.isInCollection(collection) || this.addingId()) return;

    if (!collection.collectionId) return;
    this.addingId.set(collection.collectionId);
    try {
      await this.collectionStore.addSnippet(collection.collectionId, this.data.snippetId);
      this.snackbarService.success(`Added to "${collection.name}"`);
      this.dialogRef.close(true);
    } catch {
      this.snackbarService.error(`Failed to add to "${collection.name}"`);
    } finally {
      this.addingId.set(null);
    }
  }

  createNewCollection() {
    const createRef = this.dialogService.open<
      CollectionCreateDialogComponent,
      unknown,
      Collection | false
    >(CollectionCreateDialogComponent, 'md');
    createRef.afterClosed().subscribe((collection) => {
      if (collection) {
        void this.addTo(collection);
      }
    });
  }

  close() {
    this.dialogRef.close();
  }
}
