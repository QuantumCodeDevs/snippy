import { Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { SnippetSort } from '@app/services/stores/snippet.store.service';
import { SnippetListComponent } from '@app/components/lists/snippet-list/snippet-list.component';
import { SortPageHeaderComponent } from '@app/components/headers/sort-page-header/sort-page-header.component';
import { AsyncStateComponent } from '@app/components/async-state/async-state.component';
import { ListPageState } from '@app/utils/list-page-state';
import { SnackbarService } from '@app/services/ui/snackbar.service';

export type SnippetFeed = 'public' | 'following' | 'tag';

const FEED_TITLES: Record<Exclude<SnippetFeed, 'tag'>, string> = {
  public: 'Explore',
  following: 'Following',
};

/**
 * Backs both /public and /following; the route's `feed` data picks which store
 * loader and title to use.
 */
@Component({
  selector: 'app-snippet-feed-page',
  imports: [SnippetListComponent, SortPageHeaderComponent, AsyncStateComponent],
  templateUrl: './snippet-feed-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SnippetFeedPageComponent implements OnInit {
  private snippetStore = inject(SnippetStoreService);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);
  private destroyRef = inject(DestroyRef);

  feed: SnippetFeed = 'public';
  tag = '';

  state = new ListPageState<SnippetSort>(() => this.load());

  get title() {
    if (this.feed === 'tag') return this.tag ? `Tag: ${this.tag}` : 'Tag';
    return FEED_TITLES[this.feed];
  }

  get snippets() {
    return this.snippetStore.snippetList()?.snippets ?? [];
  }

  get total() {
    return this.snippetStore.snippetList()?.totalCount ?? 0;
  }

  get isLoading() {
    return this.snippetStore.loading();
  }

  get listError() {
    return this.snippetStore.error();
  }

  ngOnInit() {
    this.feed = (this.route.snapshot.data['feed'] as SnippetFeed) ?? 'public';
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.tag = params.get('tag') ?? '';
      void this.load();
    });
  }

  private async load() {
    const { page, pageSize, sort, query } = this.state;
    try {
      if (this.feed === 'following') {
        await this.snippetStore.loadFeedSnippets(page, pageSize, sort, query);
      } else if (this.feed === 'tag') {
        await this.snippetStore.loadPublicSnippets(page, pageSize, sort, query, this.tag);
      } else {
        await this.snippetStore.loadPublicSnippets(page, pageSize, sort, query);
      }
    } catch {
      this.snackbar.error(`Failed to load ${this.feed} snippets`);
    }
  }
}
