import { SnackbarService } from '@app/services/ui/snackbar.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { NavigationService } from '@app/services/ui/navigation.service';
import { PreviewSnapshotService } from '@app/services/ui/preview-snapshot.service';
import { DraftAutosaveService, DRAFT_TRY_KEY } from '@app/services/ui/draft-autosave.service';
import { User } from '@app/models/base-models/user';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SnippetSaveUIService {
  private navigation = inject(NavigationService);
  private snackbarService = inject(SnackbarService);
  private previewSnapshot = inject(PreviewSnapshotService);
  private drafts = inject(DraftAutosaveService);

  /** True while a save request is in flight (manual or autosave). */
  readonly saving = signal(false);

  //#region Save

  /**
   * Persist the open snippet, clear drafts, then toast.
   * Snapshot capture continues in the background.
   * New pens still navigate to `/:user/snippet/:shortId`.
   * `quiet` (autosave) skips the success toast but still reports failures.
   */
  async saveSnippetWithUI(
    snippetStoreService: SnippetStoreService,
    userGetter: () => User | null,
    opts: { quiet?: boolean } = {}
  ) {
    const isNew = !snippetStoreService.snippet()?.shortId;
    if (!snippetStoreService.isDirty() || this.saving()) return;
    this.saving.set(true);
    try {
      const saved = await snippetStoreService.saveSnippet({ auto: !!opts.quiet });
      const current = snippetStoreService.snippet();
      this.drafts.remove(this.drafts.keyFor({ guest: false, shortId: null }));
      if (current?.shortId) {
        this.drafts.remove(this.drafts.keyFor({ guest: false, shortId: current.shortId }));
      }
      this.drafts.remove(DRAFT_TRY_KEY);
      if (saved.snippetId) {
        void this.previewSnapshot.captureAndUpload(saved.snippetId);
      }
      if (!opts.quiet) this.snackbarService.success('Snippet saved');
      if (isNew && saved.shortId) {
        const owner = userGetter()?.userName || saved.userName;
        if (owner) {
          await this.navigation.toSnippet(saved.shortId, owner);
        }
      }
    } catch (err) {
      this.snackbarService.error(opts.quiet ? 'Autosave failed' : 'Failed to save snippet');
    } finally {
      this.saving.set(false);
    }
  }

  //#endregion Save
}
