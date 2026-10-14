import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,  
  Output,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CdnResource } from '@app/models/extra-models/cdnLibrary';
import { CdnLibraryHit } from '@app/models/extra-models/cdnLibrary';
import { MatButtonModule } from '@angular/material/button';
import { CdnApiService } from '@app/services/api/cdn.api.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-external-resources-list',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatListModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    DragDropModule,
  ],
  templateUrl: './external-resources-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './external-resources-list.component.scss',
})
export class ExternalResourcesListComponent implements OnInit {
  @Input() resources: CdnResource[] = [];
  @Input() resourceType: 'css' | 'js' = 'css';
  @Output() resourcesChange = new EventEmitter<CdnResource[]>();

  private cdnApi = inject(CdnApiService);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);

  searchControl = new FormControl<string | CdnLibraryHit>('', { nonNullable: true });
  searchResults: CdnLibraryHit[] = [];
  searching = false;
  private resolving = false;

  ngOnInit() {
    if (!this.resources || this.resources.length === 0) {
      this.addResource();
    }

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((value) => {
          const query = typeof value === 'string' ? value.trim() : '';
          if (!query) {
            this.searchResults = [];
            this.searching = false;
          } else {
            this.searching = true;
          }
        }),
        switchMap((value) => {
          const query = typeof value === 'string' ? value.trim() : '';
          if (!query) {
            return of([] as CdnLibraryHit[]);
          }
          return this.cdnApi.searchLibraries(query, this.resourceType).pipe(
            catchError(() => {
              this.snackbar.error('Failed to search CDN libraries');
              return of([] as CdnLibraryHit[]);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        this.searchResults = results;
        this.searching = false;
      });
  }

  get searchQuery(): string {
    const value = this.searchControl.value;
    return typeof value === 'string' ? value.trim() : '';
  }

  displayLibrary = (hit: CdnLibraryHit | string | null): string => {
    if (!hit || typeof hit === 'string') return '';
    return hit.name;
  };

  onLibrarySelected(event: MatAutocompleteSelectedEvent) {
    const hit = event.option.value as CdnLibraryHit;
    if (!hit?.name || this.resolving) return;

    this.resolving = true;
    this.cdnApi.resolveLibraryUrl(hit, this.resourceType).subscribe({
      next: (url) => {
        this.resolving = false;
        this.searchControl.setValue('', { emitEvent: false });
        this.searchResults = [];

        if (!url) {
          this.snackbar.warning(`No ${this.resourceType.toUpperCase()} file found for ${hit.name}`);
          return;
        }

        this.applyUrl(url);
      },
      error: () => {
        this.resolving = false;
        this.searchControl.setValue('', { emitEvent: false });
        this.searchResults = [];
        this.snackbar.error('Failed to resolve CDN URL');
      },
    });
  }

  private applyUrl(url: string) {
    const emptyIndex = this.resources.findIndex((r) => !r.url || !r.url.trim());
    if (emptyIndex >= 0) {
      this.resources[emptyIndex] = { ...this.resources[emptyIndex], url };
    } else {
      this.resources.push({ resourceType: this.resourceType, url });
    }
    this.resourcesChange.emit(this.resources);
  }

  addResource() {
    if (!this.resources.some((r) => !r.url || !r.url.trim())) {
      this.resources.push({ resourceType: this.resourceType, url: '' });
      this.resourcesChange.emit(this.resources);
    }
  }

  removeResource(index: number) {
    this.resources.splice(index, 1);
    this.resourcesChange.emit(this.resources);
    if (this.resources.length === 0) {
      this.addResource();
    }
  }

  drop(event: CdkDragDrop<CdnResource[]>) {
    moveItemInArray(this.resources, event.previousIndex, event.currentIndex);
    this.resourcesChange.emit(this.resources);
  }
}
