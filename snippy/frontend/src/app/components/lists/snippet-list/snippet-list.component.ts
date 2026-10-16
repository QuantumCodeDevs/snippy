import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { SnippetList } from '@app/models/base-models/snippet-list';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationService } from '@app/services/ui/navigation.service';
import { SnippetActionsService } from '@app/services/ui/snippet-actions.service';
import { FollowUiService } from '@app/services/ui/follow-ui.service';
import { ListToolbarComponent } from '@app/components/ui/list-toolbar/list-toolbar.component';
import { ListEmptyStateComponent } from '@app/components/ui/list-empty-state/list-empty-state.component';
import { ListPaginatorComponent } from '@app/components/ui/list-paginator/list-paginator.component';
import { ForkAttributionComponent } from '@app/components/ui/fork-attribution/fork-attribution.component';
import { SnippetStatBarComponent } from '@app/components/ui/snippet-stat-bar/snippet-stat-bar.component';

@Component({
  selector: 'app-snippet-list',
  imports: [
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    ListToolbarComponent,
    ListEmptyStateComponent,
    ListPaginatorComponent,
    ForkAttributionComponent,
    SnippetStatBarComponent,
    RouterModule,
    MatTooltipModule,
  ],
  templateUrl: './snippet-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block' },
})
export class SnippetListComponent {
  @Input() snippets: SnippetList[] = [];
  @Input() total: number = 0;
  @Input() pageSize: number = 6;
  @Input() pageIndex: number = 0;
  @Input() showNewButton = true;
  @Input() showRemoveFromCollection = false;
  @Output() searchChange = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() removeFromCollection = new EventEmitter<SnippetList>();

  private navigation = inject(NavigationService);
  private snippetActions = inject(SnippetActionsService);
  private followUi = inject(FollowUiService);
  private readonly brokenSnapshots = signal(new Set<string>());

  snapshotFailed(shortId: string | undefined): boolean {
    return !!shortId && this.brokenSnapshots().has(shortId);
  }

  onSnapshotError(shortId: string | undefined): void {
    if (!shortId) return;
    this.brokenSnapshots.update((prev) => {
      const next = new Set(prev);
      next.add(shortId);
      return next;
    });
  }

  /** Enter on a focused card opens it (cards are links for keyboard users). */
  onCardKey(snippet: SnippetList, event: Event) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.openSnippet(snippet);
  }

  toggleTemplate(snippet: SnippetList) {
    void this.snippetActions.toggleTemplate(snippet);
  }

  openSnippet(snippet: SnippetList) {
    if (!snippet.shortId) return;
    this.navigation.toSnippet(snippet.shortId, snippet.userName);
  }

  snapshotSrc(snippet: SnippetList): string {
    const url = snippet.snapshotUrl ?? '';
    if (!url) return url;
    const version = snippet.updatedAt ? encodeURIComponent(snippet.updatedAt) : '';
    return version ? `${url}${url.includes('?') ? '&' : '?'}v=${version}` : url;
  }

  goToProfile(userName: string | null | undefined, event: Event) {
    event.stopPropagation();
    this.navigation.toProfile(userName);
  }

  createNewSnippet() {
    this.navigation.toNewSnippet();
  }

  favoriteSnippet(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    void this.snippetActions.toggleFavoriteOptimistic(snippet);
  }

  commentOnSnippet(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    this.snippetActions.openComments(snippet);
  }

  openForks(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    this.snippetActions.openForks(snippet);
  }

  addToCollection(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    if (!snippet.snippetId) return;
    this.snippetActions.openAddToCollection(snippet.snippetId);
  }

  forkSnippet(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    if (!snippet.snippetId) return;
    void this.snippetActions.forkAndOpen(snippet.snippetId);
  }

  async toggleFollow(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    if (!snippet.userName || snippet.isOwner) return;
    const nowFollowing = await this.followUi.toggle(snippet.userName, !!snippet.isFollowing);
    if (nowFollowing !== null) {
      snippet.isFollowing = nowFollowing;
    }
  }

  emitRemoveFromCollection(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    this.removeFromCollection.emit(snippet);
  }

  deleteSnippet(snippet: SnippetList, event?: Event) {
    event?.stopPropagation();
    void this.snippetActions.deleteWithConfirm(snippet);
  }
}
