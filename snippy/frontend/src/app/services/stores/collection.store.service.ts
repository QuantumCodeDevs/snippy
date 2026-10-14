import { Injectable, signal, inject } from '@angular/core';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import type { Collection } from '@app/models/base-models/collection';

@Injectable({ providedIn: 'root' })
export class CollectionStoreService {
  collections = signal<Collection[]>([]);
  totalCount = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);
  activeCollection = signal<Collection | null>(null);

  private api = inject(SnippyApi);
  private listGeneration = 0;
  private detailGeneration = 0;

  //#region List loaders

  /** Load the signed-in user's collections (optional snippet membership + search). */
  async loadMine(page = 1, limit = 50, snippetId?: string, q?: string) {
    const gen = ++this.listGeneration;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.getMyCollections(page, limit, snippetId, q);
      if (gen !== this.listGeneration) return;
      this.collections.set(res.collections ?? []);
      this.totalCount.set(res.totalCount ?? 0);
    } catch {
      if (gen !== this.listGeneration) return;
      this.error.set('Failed to load collections');
      this.collections.set([]);
      this.totalCount.set(0);
    } finally {
      if (gen === this.listGeneration) this.loading.set(false);
    }
  }

  /** Load another user's public collections. */
  async loadUser(userName: string, page = 1, limit = 50, q?: string) {
    const gen = ++this.listGeneration;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.getUserCollections(userName, page, limit, q);
      if (gen !== this.listGeneration) return;
      this.collections.set(res.collections ?? []);
      this.totalCount.set(res.totalCount ?? 0);
    } catch {
      if (gen !== this.listGeneration) return;
      this.error.set('Failed to load collections');
      this.collections.set([]);
      this.totalCount.set(0);
    } finally {
      if (gen === this.listGeneration) this.loading.set(false);
    }
  }

  /** Load one collection by shortId into `activeCollection`. */
  async loadOne(shortId: string, q?: string) {
    const gen = ++this.detailGeneration;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.getCollection(shortId, q);
      if (gen !== this.detailGeneration) return undefined;
      this.activeCollection.set(res.collection ?? null);
      return res.collection;
    } catch {
      if (gen !== this.detailGeneration) return undefined;
      this.error.set('Failed to load collection');
      this.activeCollection.set(null);
      throw new Error('Failed to load collection');
    } finally {
      if (gen === this.detailGeneration) this.loading.set(false);
    }
  }

  //#endregion List loaders

  //#region Mutations

  /** Create a collection and prepend it to the current list. */
  async create(body: { name: string; description?: string | null; isPrivate?: boolean }) {
    const res = await this.api.createCollection(body);
    if (res.collection) {
      const created = {
        ...res.collection,
        snippetCount: res.collection.snippetCount ?? 0,
      };
      this.collections.update((list) => [created, ...list]);
      this.totalCount.update((n) => n + 1);
      return created;
    }
    return res.collection;
  }

  /** Delete a collection and drop it from list + active signals. */
  async delete(collectionId: string) {
    await this.api.deleteCollection(collectionId);
    this.collections.update((list) => list.filter((c) => c.collectionId !== collectionId));
    this.totalCount.update((n) => Math.max(0, n - 1));
    if (this.activeCollection()?.collectionId === collectionId) {
      this.activeCollection.set(null);
    }
  }

  /** Add a snippet and bump `snippetCount` / `containsSnippet` locally. */
  async addSnippet(collectionId: string, snippetId: string) {
    const res = await this.api.addSnippetToCollection(collectionId, snippetId);
    const updated = res.collection;

    this.collections.update((list) =>
      list.map((c) => {
        if (c.collectionId !== collectionId) return c;
        return {
          ...c,
          snippetCount: updated?.snippetCount ?? (c.snippetCount ?? 0) + 1,
          containsSnippet: true,
        };
      })
    );

    this.activeCollection.update((active) => {
      if (!active || active.collectionId !== collectionId) return active;
      if (updated) {
        return {
          ...updated,
          snippets: updated.snippets ?? active.snippets,
          snippetCount: updated.snippetCount ?? (active.snippetCount ?? 0) + 1,
        };
      }
      return {
        ...active,
        snippetCount: (active.snippetCount ?? 0) + 1,
      };
    });

    return res;
  }

  /** Remove a snippet and drop it from the active collection's list. */
  async removeSnippet(collectionId: string, snippetId: string) {
    await this.api.removeSnippetFromCollection(collectionId, snippetId);

    this.collections.update((list) =>
      list.map((c) => {
        if (c.collectionId !== collectionId) return c;
        return {
          ...c,
          snippetCount: Math.max(0, (c.snippetCount ?? 0) - 1),
          containsSnippet: c.containsSnippet ? false : c.containsSnippet,
        };
      })
    );

    this.activeCollection.update((active) => {
      if (!active || active.collectionId !== collectionId) return active;
      const snippets = (active.snippets ?? []).filter((s) => s.snippetId !== snippetId);
      return {
        ...active,
        snippets,
        snippetCount: snippets.length,
      };
    });
  }

  //#endregion Mutations
}
