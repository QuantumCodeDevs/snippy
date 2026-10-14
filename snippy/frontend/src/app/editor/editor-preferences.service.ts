import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import {
  DEFAULT_EDITOR_PREFERENCES,
  EditorPreferences,
  mergeEditorPreferences,
} from './editor-preferences';

@Injectable({ providedIn: 'root' })
export class EditorPreferencesService {
  private authStore = inject(AuthStoreService);

  /** Live override used by the settings preview before save. */
  private localOverride = signal<EditorPreferences | null>(null);

  /** Effective preferences: local override → auth user → defaults. */
  readonly preferences = computed(() => {
    const local = this.localOverride();
    if (local) return local;
    return mergeEditorPreferences(this.authStore.user()?.editorPreferences);
  });

  readonly defaults = DEFAULT_EDITOR_PREFERENCES;

  //#region Preview override

  /** Apply unsaved prefs for live preview (settings page). */
  applyLocal(prefs: EditorPreferences) {
    this.localOverride.set({ ...prefs });
  }

  /** Discard local preview and return to saved/default prefs. */
  clearLocal() {
    this.localOverride.set(null);
  }

  /** Snapshot of current effective prefs (copy). */
  snapshot(): EditorPreferences {
    return { ...this.preferences() };
  }

  //#endregion Preview override
}
