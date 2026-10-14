import { Injectable, signal, computed, inject } from '@angular/core';
import {
  SnippyApi,
  type SnippetListPage,
  type SnippetSort,
} from '@app/services/data/snippy-api.service';
import type { CdnResource } from '@app/models/extra-models/cdnLibrary';
import type { Favorite } from '@app/models/base-models/favorite';
import type { Snippet } from '@app/models/base-models/snippet';
import type { SnippetList } from '@app/models/base-models/snippet-list';
import type { CreateSnippetRequest } from '@app/models/base-models/create-snippet-request';

export type { SnippetSort };

/**
 * Global snippet domain store (root singleton).
 *
 * Ownership rules:
 * - Call `loadSnippet(id)` / list loaders to populate.
 * - Editor / fullpage views should call `clearSnippet()` on destroy
 *   so list pages do not see a stale open pen.
 */
@Injectable({ providedIn: 'root' })
export class SnippetStoreService {
  snippet = signal<Snippet | null>(null);
  snippetList = signal<SnippetListPage | null>(null);
  favoritesList = signal<SnippetListPage | null>(null);
  previewUpdateType = signal<string | null>(null);
  loading = signal<boolean>(false);
  favoritesLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private originalSnippet = signal<Snippet | null>(null);
  private listGeneration = 0;
  private favoritesGeneration = 0;
  private detailGeneration = 0;
  private api = inject(SnippyApi);

  //#region API Methods

  /** Load a snippet by shortId into the detail signal (generation-guarded). */
  async loadSnippet(snippetId: string) {
    const gen = ++this.detailGeneration;
    this.loading.set(true);
    this.error.set(null);
    this.snippet.set(null);
    this.originalSnippet.set(null);
    try {
      const snippet = await this.api.getSnippetByShortId(snippetId);
      if (gen !== this.detailGeneration) return;
      if (snippet) {
        this.setSnippet(snippet, true);
      } else {
        this.error.set('Snippet not found');
      }
      this.loading.set(false);
    } catch {
      if (gen !== this.detailGeneration) return;
      this.error.set('Failed to load snippet');
      this.snippet.set(null);
      this.originalSnippet.set(null);
      this.loading.set(false);
    }
  }

  /** Load a private share-token snippet into the detail signal. */
  async loadSharedSnippet(token: string) {
    const gen = ++this.detailGeneration;
    this.loading.set(true);
    this.error.set(null);
    this.snippet.set(null);
    this.originalSnippet.set(null);
    try {
      const snippet = await this.api.getSharedSnippet(token);
      if (gen !== this.detailGeneration) return;
      if (snippet) {
        this.setSnippet(snippet, true);
      } else {
        this.error.set('Snippet not found');
      }
      this.loading.set(false);
    } catch {
      if (gen !== this.detailGeneration) return;
      this.error.set('Failed to load shared snippet');
      this.snippet.set(null);
      this.originalSnippet.set(null);
      this.loading.set(false);
    }
  }

  /** Run a list fetch with generation-guarded loading/error on `snippetList`. */
  private async runListLoad(
    loader: () => Promise<SnippetListPage | null | undefined>,
    errorMessage: string
  ) {
    const gen = ++this.listGeneration;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await loader();
      if (gen !== this.listGeneration) return res ?? null;
      this.snippetList.set(res ?? null);
      this.loading.set(false);
      return res ?? null;
    } catch (err) {
      if (gen !== this.listGeneration) throw err;
      this.error.set(errorMessage);
      this.snippetList.set(null);
      this.loading.set(false);
      throw err;
    }
  }

  //#region List loaders

  /** Signed-in user's snippets (including private). */
  async loadUserSnippets(page: number, limit: number, q?: string) {
    return this.runListLoad(
      () => this.api.getMySnippets(page, limit, q),
      'Failed to load user snippets'
    );
  }

  /** Public explore feed. */
  async loadPublicSnippets(
    page: number,
    limit: number,
    sort: SnippetSort = 'newest',
    q?: string,
    tag?: string
  ) {
    return this.runListLoad(
      () => this.api.getPublicSnippets(page, limit, sort, q, tag),
      'Failed to load public snippets'
    );
  }

  /** Following feed (snippets from people the signed-in user follows). */
  async loadFeedSnippets(page: number, limit: number, sort: SnippetSort = 'newest', q?: string) {
    return this.runListLoad(
      () => this.api.getFeedSnippets(page, limit, sort, q),
      'Failed to load feed'
    );
  }

  /** Another user's public snippets (profile page). */
  async loadUserPublicSnippets(userName: string, page: number, limit: number, q?: string) {
    return this.runListLoad(
      () => this.api.getUserPublicSnippets(userName, page, limit, q),
      'Failed to load user snippets'
    );
  }

  /** Signed-in user's favorites list (separate generation/loading flags). */
  async loadFavorites(page: number, limit: number, q?: string) {
    const gen = ++this.favoritesGeneration;
    this.favoritesLoading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.getFavorites(page, limit, q);
      if (gen !== this.favoritesGeneration) return res ?? null;
      this.favoritesList.set(res ?? null);
      this.favoritesLoading.set(false);
      return res ?? null;
    } catch (err) {
      if (gen !== this.favoritesGeneration) throw err;
      this.error.set('Failed to load favorites');
      this.favoritesList.set(null);
      this.favoritesLoading.set(false);
      throw err;
    }
  }

  /** Full-text public search. */
  async searchSnippets(query: string, page: number, limit: number, sort: SnippetSort = 'newest') {
    return this.runListLoad(
      () => this.api.searchSnippets(query, page, limit, sort),
      'Failed to search snippets'
    );
  }

  //#endregion List loaders

  /** Create or update the current snippet from the editor signal. */
  async saveSnippet() {
    const s = this.snippet();
    if (!s) throw new Error('No snippet to save');
    this.error.set(null);
    try {
      const body: CreateSnippetRequest = {
        name: s.name,
        description: s.description ?? undefined,
        tags: s.tags ?? [],
        isPrivate: s.isPrivate,
        snippetFiles: s.snippetFiles,
        cdnResources: s.cdnResources ?? [],
      };
      const saved = s.snippetId
        ? await this.api.updateSnippet(s.snippetId, body)
        : await this.api.createSnippet(body);
      if (!saved) throw new Error('Save returned no snippet');
      this.snippet.set(saved);
      this.originalSnippet.set(JSON.parse(JSON.stringify(saved)));
      return saved;
    } catch (err) {
      this.error.set('Failed to save snippet');
      throw err;
    }
  }

  /** Delete a snippet and drop it from the current list. */
  async deleteSnippet(snippetId: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.api.deleteSnippet(snippetId);
      this.snippetList.update((list) => {
        if (!list) return list;
        const snippets = (list.snippets ?? []).filter((s) => s.snippetId !== snippetId);
        return {
          ...list,
          snippets,
          totalCount: Math.max(0, (list.totalCount ?? 0) - 1),
        };
      });
      this.clearSnippet();
      this.loading.set(false);
    } catch (err) {
      this.error.set('Failed to delete snippet');
      this.loading.set(false);
      throw err;
    }
  }

  /** Toggle favorite and keep list/detail/favorites counts in sync. */
  async favoriteSnippet(snippetId: string): Promise<Favorite | undefined> {
    this.error.set(null);
    try {
      const response = await this.api.toggleFavorite(snippetId);
      if (response && typeof response.favoriteCount === 'number') {
        this.patchSnippetCounts(snippetId, {
          favoriteCount: response.favoriteCount,
          isFavorited: response.isFavorited,
        });
        if (!response.isFavorited) {
          this.favoritesList.update((list) => {
            if (!list) return list;
            return {
              ...list,
              snippets: (list.snippets ?? []).filter((item) => item.snippetId !== snippetId),
              totalCount: Math.max(0, (list.totalCount ?? 0) - 1),
            };
          });
        } else {
          const existing = this.favoritesList()?.snippets?.some(
            (item) => item.snippetId === snippetId
          );
          if (existing) {
            this.favoritesList.update((list) => {
              if (!list) return list;
              return {
                ...list,
                snippets: (list.snippets ?? []).map((item) =>
                  item.snippetId === snippetId
                    ? { ...item, favoriteCount: response.favoriteCount, isFavorited: true }
                    : item
                ),
              };
            });
          } else {
            const row = this.resolveSnippetListItem(snippetId, response.favoriteCount);
            if (row) {
              this.favoritesList.update((list) => {
                if (!list) {
                  return {
                    snippets: [row],
                    totalCount: 1,
                  };
                }
                return {
                  ...list,
                  snippets: [row, ...(list.snippets ?? [])],
                  totalCount: (list.totalCount ?? list.snippets?.length ?? 0) + 1,
                };
              });
            } else {
              await this.loadFavorites(1, 6);
            }
          }
        }
      }
      return response;
    } catch (err) {
      this.error.set('Failed to favorite snippet');
      throw err;
    }
  }

  /** Build a favorites-list row from currently loaded list/detail state. */
  private resolveSnippetListItem(snippetId: string, favoriteCount: number): SnippetList | null {
    const fromList = this.snippetList()?.snippets?.find((item) => item.snippetId === snippetId);
    if (fromList) {
      return {
        ...fromList,
        favoriteCount,
        isFavorited: true,
      };
    }

    const detail = this.snippet();
    if (detail?.snippetId === snippetId) {
      return {
        snippetId: detail.snippetId,
        shortId: detail.shortId,
        name: detail.name,
        description: detail.description ?? null,
        tags: detail.tags?.length ? detail.tags : null,
        userName: detail.userName,
        displayName: detail.displayName ?? undefined,
        commentCount: detail.commentCount ?? 0,
        favoriteCount,
        viewCount: detail.viewCount ?? 0,
        isOwner: detail.isOwner,
        isFavorited: true,
      };
    }

    return null;
  }

  /** Fork a snippet and bump the open pen's forkCount. */
  async forkSnippet(snippetId: string): Promise<Snippet> {
    this.error.set(null);
    try {
      const res = await this.api.forkSnippet(snippetId);
      this.snippet.update((s) =>
        s && s.snippetId === snippetId ? { ...s, forkCount: (s.forkCount ?? 0) + 1 } : s
      );
      return res;
    } catch (err) {
      this.error.set('Failed to fork snippet');
      throw err;
    }
  }

  /** Record a view; ignores failures so listing/detail never block. */
  async recordView(snippetId: string): Promise<void> {
    try {
      const res = await this.api.recordSnippetView(snippetId);
      if (res?.counted && typeof res.viewCount === 'number') {
        this.patchSnippetCounts(snippetId, { viewCount: res.viewCount });
      }
    } catch {
      // Non-blocking
    }
  }

  /** Adjust commentCount on the open snippet and both list signals. */
  bumpCommentCount(snippetId: string, delta: number) {
    const apply = (count: number) => Math.max(0, count + delta);
    this.snippet.update((s) =>
      s && s.snippetId === snippetId ? { ...s, commentCount: apply(s.commentCount ?? 0) } : s
    );
    const patchList = (list: SnippetListPage | null) => {
      if (!list) return list;
      return {
        ...list,
        snippets: (list.snippets ?? []).map((item) =>
          item.snippetId === snippetId
            ? { ...item, commentCount: apply(item.commentCount ?? 0) }
            : item
        ),
      };
    };
    this.snippetList.update(patchList);
    this.favoritesList.update(patchList);
  }

  /** Apply a newly uploaded snapshot URL without treating it as unsaved edits. */
  applySnapshotMeta(snippetId: string, snapshotUrl: string | null | undefined, updatedAt?: string) {
    const patch = { snapshotUrl: snapshotUrl ?? null, updatedAt };
    const current = this.snippet();
    if (current?.snippetId === snippetId) {
      this.snippet.set({ ...current, ...patch });
      const original = this.originalSnippet();
      if (original) {
        this.originalSnippet.set({ ...original, ...patch });
      }
    }
    const patchList = (list: SnippetListPage | null) => {
      if (!list) return list;
      return {
        ...list,
        snippets: (list.snippets ?? []).map((item) =>
          item.snippetId === snippetId ? { ...item, ...patch } : item
        ),
      };
    };
    this.snippetList.update(patchList);
    this.favoritesList.update(patchList);
  }

  /** Update the open snippet's share token (and the saved original). */
  patchShareToken(shareToken: string | null) {
    const current = this.snippet();
    if (!current) return;
    const next = { ...current, shareToken };
    this.snippet.set(next);
    const original = this.originalSnippet();
    if (original) {
      this.originalSnippet.set({ ...original, shareToken });
    }
  }
  //#endregion API Methods

  //#region Dirty tracking

  /** True when the editor signal differs from the last saved original. */
  isDirty = computed(() => {
    const s = this.snippet();
    const o = this.originalSnippet();
    if (!s || !o) return false;
    if (s.name !== o.name) return true;
    if (s.description !== o.description) return true;
    if (s.isPrivate !== o.isPrivate) return true;
    const sTags = s.tags ?? [];
    const oTags = o.tags ?? [];
    if (sTags.length !== oTags.length) return true;
    if (s.cdnResources?.length !== o.cdnResources?.length) return true;
    for (let i = 0; i < (s.cdnResources?.length || 0); i++) {
      if (
        s.cdnResources![i].resourceType !== o.cdnResources![i].resourceType ||
        s.cdnResources![i].url !== o.cdnResources![i].url
      ) {
        return true;
      }
    }
    for (let i = 0; i < sTags.length; i++) {
      if (sTags[i] !== oTags[i]) return true;
    }
    const sFiles = s.snippetFiles ?? [];
    const oFiles = o.snippetFiles ?? [];
    if (sFiles.length !== oFiles.length) return true;
    for (let i = 0; i < sFiles.length; i++) {
      if (sFiles[i].content !== oFiles[i].content) return true;
    }
    return false;
  });

  /** Replace the open snippet and snapshot it as the saved original. */
  setSnippet(snippet: Snippet, updatePreview: boolean = false) {
    if (!snippet.tags) {
      snippet.tags = [];
    }
    this.snippet.set(snippet);
    this.originalSnippet.set(JSON.parse(JSON.stringify(snippet)));
    if (updatePreview) {
      this.previewUpdateType.set('full');
    }
  }

  /** Overlay a restored draft without treating it as the saved original. */
  applyDraft(drafted: Snippet) {
    this.snippet.set(drafted);
    this.previewUpdateType.set('full');
  }

  //#endregion Dirty tracking

  //#region Update Methods

  /** Patch one HTML/CSS/JS file and flag a full vs partial preview refresh. */
  updateSnippetFile(fileType: string, content: string) {
    this.previewUpdateType.set(
      fileType.toLowerCase() === 'html' || fileType.toLowerCase() === 'js' ? 'full' : 'partial'
    );
    this.snippet.update((s) => {
      if (!s) return s;
      return {
        ...s,
        snippetFiles: (s.snippetFiles ?? []).map((f) =>
          f.fileType === fileType ? { ...f, content } : f
        ),
      };
    });
  }

  /** Rename the open snippet (marks preview dirty). */
  updateSnippetName(name: string) {
    this.previewUpdateType.set('full');
    this.snippet.update((s) => (s ? { ...s, name } : s));
  }

  /** Apply settings-dialog fields onto the open snippet. */
  updateSnippetSettings(settings: {
    description: string;
    isPrivate: boolean;
    tags: string[];
    cdnResources?: CdnResource[];
  }) {
    this.previewUpdateType.set('full');
    this.snippet.update((s) => {
      if (!s) return s;
      return {
        ...s,
        description: settings.description,
        isPrivate: settings.isPrivate,
        tags: settings.tags,
        cdnResources: settings.cdnResources ?? s.cdnResources,
      };
    });
  }

  /** Patch social counters on the currently open snippet. */
  updateSnippetCounts(counts: {
    forkCount?: number;
    viewCount?: number;
    commentCount?: number;
    favoriteCount?: number;
  }) {
    const id = this.snippet()?.snippetId;
    if (!id) return;
    this.patchSnippetCounts(id, counts);
  }

  /** Patch counters on detail + both list signals for one snippetId. */
  private patchSnippetCounts(
    snippetId: string,
    patch: {
      forkCount?: number;
      viewCount?: number;
      commentCount?: number;
      favoriteCount?: number;
      isFavorited?: boolean;
    }
  ) {
    this.snippet.update((s) => {
      if (!s || s.snippetId !== snippetId) return s;
      return {
        ...s,
        ...(patch.forkCount !== undefined ? { forkCount: patch.forkCount } : {}),
        ...(patch.viewCount !== undefined ? { viewCount: patch.viewCount } : {}),
        ...(patch.commentCount !== undefined ? { commentCount: patch.commentCount } : {}),
        ...(patch.favoriteCount !== undefined ? { favoriteCount: patch.favoriteCount } : {}),
        ...(patch.isFavorited !== undefined ? { isFavorited: patch.isFavorited } : {}),
      };
    });

    this.snippetList.update((list) => {
      if (!list) return list;
      return {
        ...list,
        snippets: (list.snippets ?? []).map((item) =>
          item.snippetId === snippetId ? this.applyListPatch(item, patch) : item
        ),
      };
    });

    this.favoritesList.update((list) => {
      if (!list) return list;
      return {
        ...list,
        snippets: (list.snippets ?? []).map((item) =>
          item.snippetId === snippetId ? this.applyListPatch(item, patch) : item
        ),
      };
    });
  }

  /** Merge a counter patch onto a list-row model. */
  private applyListPatch(
    item: SnippetList,
    patch: {
      viewCount?: number;
      commentCount?: number;
      favoriteCount?: number;
      isFavorited?: boolean;
    }
  ): SnippetList {
    return {
      ...item,
      ...(patch.viewCount !== undefined ? { viewCount: patch.viewCount } : {}),
      ...(patch.commentCount !== undefined ? { commentCount: patch.commentCount } : {}),
      ...(patch.favoriteCount !== undefined ? { favoriteCount: patch.favoriteCount } : {}),
      ...(patch.isFavorited !== undefined ? { isFavorited: patch.isFavorited } : {}),
    };
  }

  /** Drop the open snippet so list pages do not see a stale pen. */
  clearSnippet() {
    this.detailGeneration++;
    this.snippet.set(null);
    this.originalSnippet.set(null);
    this.previewUpdateType.set(null);
    this.loading.set(false);
    this.error.set(null);
  }
  //#endregion Update Methods
}
