import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { CollectionStoreService } from '@app/services/stores/collection.store.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { SnippetList } from '@app/models/base-models/snippet-list';
import { SnippetListComponent } from '@app/components/lists/snippet-list/snippet-list.component';
import { DialogService } from '@app/services/ui/dialog.service';
import { AsyncStateComponent } from '@app/components/async-state/async-state.component';
import { ListPageState } from '@app/utils/list-page-state';

@Component({
  selector: 'app-collection-detail-page',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    SnippetListComponent,
    AsyncStateComponent,
  ],
  templateUrl: './collection-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CollectionDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private destroyRef = inject(DestroyRef);
  private collectionStoreService = inject(CollectionStoreService);
  private snackbarService = inject(SnackbarService);
  private dialogService = inject(DialogService);

  loading = signal(true);
  notFound = signal(false);

  private shortId = '';

  /** Search hits the API; paging slices the already-filtered result client-side. */
  state: ListPageState = new ListPageState((state) => this.load(this.shortId, state.query));

  get collection() {
    return this.collectionStoreService.activeCollection();
  }

  private allSnippets = computed<SnippetList[]>(() => this.collection?.snippets ?? []);

  get total() {
    return this.allSnippets().length;
  }

  get snippets(): SnippetList[] {
    const start = this.state.pageIndex * this.state.pageSize;
    return this.allSnippets().slice(start, start + this.state.pageSize);
  }

  get penCount(): number {
    return this.collection?.snippetCount ?? this.collection?.snippets?.length ?? 0;
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const shortId = params.get('shortId');
      if (!shortId) return;
      this.shortId = shortId;
      this.state.reset();
      this.load(shortId);
    });
  }

  async load(shortId: string, q?: string) {
    this.loading.set(true);
    this.notFound.set(false);
    try {
      await this.collectionStoreService.loadOne(shortId, q);
    } catch {
      this.notFound.set(true);
      this.snackbarService.error('Failed to load collection');
    } finally {
      this.loading.set(false);
    }
  }

  removeSnippet(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    const collection = this.collection;
    const collectionId = collection?.collectionId;
    const snippetId = snippet.snippetId;
    if (!collection?.isOwner || !collectionId || !snippetId) return;

    return this.dialogService.confirmAndRun({
      confirm: {
        title: 'Remove from collection',
        message: `Remove "${snippet.name}" from this collection? The snippet itself is not deleted.`,
        confirmText: 'Remove',
        cancelText: 'Cancel',
      },
      action: () => this.collectionStoreService.removeSnippet(collectionId, snippetId),
      success: 'Removed from collection',
      error: 'Failed to remove snippet',
    });
  }

  goBack() {
    this.location.back();
  }
}
