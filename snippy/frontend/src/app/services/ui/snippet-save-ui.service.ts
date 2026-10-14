import { SnackbarService } from '@app/services/ui/snackbar.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { NavigationService } from '@app/services/ui/navigation.service';
import { PreviewSnapshotService } from '@app/services/ui/preview-snapshot.service';
import { DraftAutosaveService, DRAFT_TRY_KEY } from '@app/services/ui/draft-autosave.service';
import { User } from '@app/models/base-models/user';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SnippetSaveUIService {
  private navigation = inject(NavigationService);
  private snackbarService = inject(SnackbarService);
  private previewSnapshot = inject(PreviewSnapshotService);
  private drafts = inject(DraftAutosaveService);

  //#region Save

  /**
   * Persist the open snippet, clear drafts, optionally snapshot, then toast.
   * New pens navigate to `/:user/snippet/:shortId` after save.
   */
  async saveSnippetWithUI(snippetStoreService: SnippetStoreService, userGetter: () => User | null) {
    const isNew = !snippetStoreService.snippet()?.shortId;
    if (!snippetStoreService.isDirty()) return;
    try {
      const saved = await snippetStoreService.saveSnippet();
      const current = snippetStoreService.snippet();
      this.drafts.remove(this.drafts.keyFor({ guest: false, shortId: null }));
      if (current?.shortId) {
        this.drafts.remove(this.drafts.keyFor({ guest: false, shortId: current.shortId }));
      }
      this.drafts.remove(DRAFT_TRY_KEY);
      if (saved.snippetId) {
        await this.previewSnapshot.captureAndUpload(saved.snippetId);
      }
      this.snackbarService.success('Snippet saved');
      if (isNew && saved.shortId) {
        const currentUser = userGetter();
        if (currentUser?.userName) {
          this.navigation.toSnippet(saved.shortId, currentUser.userName);
        }
      }
    } catch (err) {
      this.snackbarService.error('Failed to save snippet');
    }
  }

  //#endregion Save
}
