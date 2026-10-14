import { Injectable, inject } from '@angular/core';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';

@Injectable({ providedIn: 'root' })
export class PreviewSnapshotService {
  private api = inject(SnippyApi);
  private snippetStore = inject(SnippetStoreService);

  private captureFn: (() => Promise<Blob | null>) | null = null;

  //#region Capture registry

  /** Register the iframe capture callback (preview player mounts this). */
  register(captureFn: () => Promise<Blob | null>): void {
    this.captureFn = captureFn;
  }

  /** Clear the capture callback when the preview unmounts. */
  unregister(): void {
    this.captureFn = null;
  }

  //#endregion Capture registry

  //#region Upload

  /** Capture the live preview and upload it as the snippet snapshot. */
  async captureAndUpload(snippetId: string | null | undefined): Promise<void> {
    if (!snippetId || !this.captureFn) return;
    try {
      const blob = await this.captureFn();
      if (!blob) return;
      const uploaded = await this.api.uploadSnippetSnapshot(snippetId, blob);
      if (uploaded) {
        this.snippetStore.applySnapshotMeta(snippetId, uploaded.snapshotUrl, uploaded.updatedAt);
      }
    } catch (err) {
      console.warn('Snippet snapshot skipped', err);
    }
  }

  //#endregion Upload
}
