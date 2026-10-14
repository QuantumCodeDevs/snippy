import { Injectable, inject } from '@angular/core';
import { CommentDialogComponent } from '@app/components/dialogs/comment-dialog/comment-dialog.component';
import { ForksDialogComponent } from '@app/components/dialogs/forks-dialog/forks-dialog.component';
import { AddToCollectionDialogComponent } from '@app/components/dialogs/add-to-collection-dialog/add-to-collection-dialog.component';
import { SnippetList } from '@app/models/base-models/snippet-list';
import { Snippet } from '@app/models/base-models/snippet';
import { DialogService } from '@app/services/ui/dialog.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { NavigationService } from '@app/services/ui/navigation.service';

/** Fields any snippet-ish object must expose for these shared actions. */
type SnippetLike = Pick<SnippetList, 'snippetId' | 'name'> &
  Partial<Pick<SnippetList, 'description' | 'userName' | 'isOwner' | 'shortId'>>;

/**
 * Snippet actions shared by list cards, the editor header, and the footer:
 * fork, comments, collections, favorites, and delete.
 */
@Injectable({ providedIn: 'root' })
export class SnippetActionsService {
  private snippetStore = inject(SnippetStoreService);
  private dialogService = inject(DialogService);
  private snackbar = inject(SnackbarService);
  private navigation = inject(NavigationService);

  //#region Forks & comments

  /** Fork then navigate to the new pen. */
  async forkAndOpen(snippetId: string) {
    try {
      const forked = await this.snippetStore.forkSnippet(snippetId);
      if (!forked.shortId) throw new Error('Fork returned no snippet');
      this.snackbar.success('Snippet forked');
      await this.navigation.toSnippet(forked.shortId, forked.userName);
    } catch {
      this.snackbar.error('Failed to fork snippet');
    }
  }

  /** Open the forks dialog for a snippet with a shortId. */
  openForks(snippet: SnippetLike | Snippet) {
    if (!snippet.shortId) return;
    this.dialogService.open(ForksDialogComponent, 'md', {
      data: {
        shortId: snippet.shortId,
        snippetName: snippet.name,
      },
    });
  }

  /** Open the comment thread dialog. */
  openComments(snippet: SnippetLike | Snippet) {
    if (!snippet.snippetId) return;
    this.dialogService.open(CommentDialogComponent, 'lg', {
      data: {
        snippetId: snippet.snippetId,
        snippetName: snippet.name,
        snippetDescription: snippet.description,
        ownerUserName: snippet.userName,
        isSnippetOwner: snippet.isOwner,
      },
    });
  }

  /** Open the add-to-collection picker. */
  openAddToCollection(snippetId: string) {
    this.dialogService.open(AddToCollectionDialogComponent, 'md', {
      data: { snippetId },
    });
  }

  //#endregion Forks & comments

  //#region Favorites & delete

  /**
   * Optimistically flips the card's own counters, then reconciles with the API
   * response. Rolls back when the request fails.
   */
  async toggleFavoriteOptimistic(snippet: SnippetList) {
    if (!snippet.snippetId) return;
    const previousFavorited = !!snippet.isFavorited;
    const previousCount = snippet.favoriteCount ?? 0;

    snippet.isFavorited = !previousFavorited;
    snippet.favoriteCount = previousCount + (previousFavorited ? -1 : 1);

    try {
      const response = await this.snippetStore.favoriteSnippet(snippet.snippetId);
      if (response) {
        snippet.isFavorited = response.isFavorited;
        snippet.favoriteCount = response.favoriteCount;
      }
    } catch {
      snippet.isFavorited = previousFavorited;
      snippet.favoriteCount = previousCount;
      this.snackbar.error('Failed to favorite snippet');
    }
  }

  /** Store-driven favorite for views that render from the active snippet signal. */
  async toggleFavorite(snippetId: string) {
    try {
      await this.snippetStore.favoriteSnippet(snippetId);
    } catch {
      this.snackbar.error('Failed to update favorite');
    }
  }

  /** Confirm then delete; snackbar reports success/failure. */
  deleteWithConfirm(snippet: SnippetLike) {
    return this.dialogService.confirmAndRun({
      confirm: {
        title: 'Delete Snippet',
        message: `Delete "${snippet.name}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
      action: () => this.snippetStore.deleteSnippet(snippet.snippetId!),
      success: 'Snippet deleted',
      error: 'Failed to delete snippet',
    });
  }

  //#endregion Favorites & delete
}
