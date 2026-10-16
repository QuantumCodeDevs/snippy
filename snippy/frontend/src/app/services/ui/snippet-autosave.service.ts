import { DestroyRef, Injectable, computed, effect, inject } from '@angular/core';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';

export const AUTOSAVE_DELAY_MS = 5 * 60_000;

/** One-shot countdown that ignores re-arming while it is already running. */
export class AutosaveTimer {
  private handle: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly run: () => void,
    private readonly delayMs = AUTOSAVE_DELAY_MS
  ) {}

  get pending(): boolean {
    return this.handle !== null;
  }

  /** Start the countdown unless one is already running. */
  arm() {
    if (this.handle) return;
    this.handle = setTimeout(() => {
      this.handle = null;
      this.run();
    }, this.delayMs);
  }

  cancel() {
    if (!this.handle) return;
    clearTimeout(this.handle);
    this.handle = null;
  }
}

/**
 * Saves the open snippet to the server five minutes after the first unsaved
 * change. Only runs once the snippet has been saved at least once (it has a
 * server id) and the signed-in user owns it. Any save resets the countdown.
 * Local drafts (DraftAutosaveService) still cover unsaved new pens.
 */
@Injectable({ providedIn: 'root' })
export class SnippetAutosaveService {
  private store = inject(SnippetStoreService);
  private saveUi = inject(SnippetSaveUIService);
  private editorUi = inject(EditorUiService);
  private auth = inject(AuthStoreService);

  /** True when the open snippet qualifies for server autosave. */
  readonly enabled = computed(() => {
    const s = this.store.snippet();
    return !!s?.snippetId && !!s.isOwner && !this.editorUi.guestMode();
  });

  private timer = new AutosaveTimer(() => this.autosave());

  /** Arm/cancel the countdown as dirty state changes. Call from an editor page constructor. */
  watch() {
    const ref = effect(() => {
      if (this.enabled() && this.store.isDirty()) {
        this.timer.arm();
      } else {
        this.timer.cancel();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      ref.destroy();
      this.timer.cancel();
    });
  }

  private autosave() {
    if (!this.enabled() || !this.store.isDirty()) return;
    void this.saveUi.saveSnippetWithUI(this.store, this.auth.user, { quiet: true }).finally(() => {
      // Retry later if the save failed or new edits landed mid-save.
      if (this.enabled() && this.store.isDirty()) this.timer.arm();
    });
  }
}
