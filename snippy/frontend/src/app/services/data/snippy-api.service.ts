// Snippy API service for interacting with the Snippy API endpoints from pocketbase.

import { Injectable, inject } from '@angular/core';
import type { ListResult, RecordModel } from 'pocketbase';
import { PocketBaseService } from './pocketbase.service';
import {
  RESERVED_USERNAMES,
  mapAsset,
  mapCollection,
  mapComment,
  fileUrl,
  mapSnippet,
  mapSnippetList,
  mapUser,
} from './pb-mappers';
import type {
  Asset,
  Collection,
  Comment,
  CreateSnippetRequest,
  EditorPreferences,
  Favorite,
  Snippet,
  SnippetList,
  User,
} from '@app/models';

/** Sorting options for snippet list pages. */
export type SnippetSort = 'newest' | 'oldest' | 'popular' | 'favorites' | 'views' | 'forks';

/** Paginated snippet cards (no `{ success }` envelope). */
export type SnippetListPage = {
  snippets: SnippetList[];
  totalCount: number;
};

const FILE_TYPES = ['html', 'css', 'js'] as const;

/**
 * PocketBase collection CRUD, custom `/api/snippy` routes, and record → domain mapping.
 * Pages and stores call this instead of the SDK.
 */
@Injectable({ providedIn: 'root' })
export class SnippyApi {
  private pb = inject(PocketBaseService).pb;

  //#region PocketBase Helpers

  /** Signed-in PocketBase user id, or null when anonymous. */
  private get me(): string | null {
    return this.pb.authStore.record?.id ?? null;
  }

  /** Bind `{ :name }` placeholders so user input cannot break filter syntax. */
  private filter(expr: string, params?: Record<string, unknown>): string {
    return this.pb.filter(expr, params);
  }

  /** PocketBase `sort` string for a snippet list (`-created`, `-favoriteCount`, …). */
  private sortExpr(sort: SnippetSort = 'newest'): string {
    switch (sort) {
      case 'oldest':
        return 'created';
      case 'popular':
      case 'views':
        return '-viewCount';
      case 'favorites':
        return '-favoriteCount';
      case 'forks':
        return '-forkCount';
      default:
        return '-created';
    }
  }

  /** Optional `&& (name|description|tags ~ q)` fragment; empty when `q` is blank. */
  private searchClause(q?: string): string {
    const query = q?.trim();
    if (!query) return '';
    return this.filter(' && (name ~ {:q} || description ~ {:q} || tags ~ {:q})', { q: query });
  }

  //#endregion PocketBase Helpers

  //#region User Methods

  /** Load the signed-in `users` record. */
  async getCurrentUser(): Promise<{ user: User }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const rec = await this.pb.collection('users').getOne(this.me);
    return { user: mapUser(this.pb, rec) };
  }

  /** Public profile by username, including follower counts and whether we follow them. */
  async getUserProfile(userName: string): Promise<{ user: User }> {
    const rec = await this.pb
      .collection('users')
      .getFirstListItem(this.filter('username = {:name}', { name: userName }));
    const [followers, following, mine] = await Promise.all([
      this.pb.collection('follows').getList(1, 1, {
        filter: this.filter('following = {:id}', { id: rec.id }),
      }),
      this.pb.collection('follows').getList(1, 1, {
        filter: this.filter('follower = {:id}', { id: rec.id }),
      }),
      this.me
        ? this.pb.collection('follows').getList(1, 1, {
            filter: this.filter('follower = {:me} && following = {:id}', {
              me: this.me,
              id: rec.id,
            }),
          })
        : Promise.resolve({ totalItems: 0 }),
    ]);
    return {
      user: mapUser(this.pb, rec, {
        followerCount: followers.totalItems,
        followingCount: following.totalItems,
        isFollowing: mine.totalItems > 0,
      }),
    };
  }

  /** Patch display name, bio, username, privacy, editor prefs, or clear avatar. */
  async updateUser(body: {
    displayName?: string | null;
    bio?: string | null;
    userName?: string;
    isPrivate?: boolean;
    editorPreferences?: EditorPreferences;
    pictureUrl?: string | null;
  }): Promise<{ user: User }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const patch: Record<string, unknown> = {};
    if (body.displayName !== undefined) patch['name'] = body.displayName ?? '';
    if (body.bio !== undefined) patch['bio'] = body.bio ?? '';
    if (body.userName !== undefined) patch['username'] = body.userName;
    if (body.isPrivate !== undefined) patch['isPrivate'] = body.isPrivate;
    if (body.editorPreferences !== undefined) patch['editorPreferences'] = body.editorPreferences;
    if (body.pictureUrl === null) patch['avatar'] = null;
    const rec = await this.pb.collection('users').update(this.me, patch);
    return { user: mapUser(this.pb, rec) };
  }

  /** Replace `users.avatar` with an uploaded file. */
  async uploadProfilePicture(file: File): Promise<{ user: User }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const form = new FormData();
    form.append('avatar', file);
    const rec = await this.pb.collection('users').update(this.me, form);
    return { user: mapUser(this.pb, rec) };
  }

  /** Delete the signed-in account and clear the JWT. */
  async deleteUser(): Promise<void> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    await this.pb.collection('users').delete(this.me);
    this.pb.authStore.clear();
  }

  /** True when `userName` is free (or already ours) and not reserved. */
  async checkUsername(userName: string): Promise<{ available: boolean }> {
    const name = userName.trim();
    if (name.length < 2 || RESERVED_USERNAMES.has(name.toLowerCase())) {
      return { available: false };
    }
    try {
      const rec = await this.pb
        .collection('users')
        .getFirstListItem(this.filter('username = {:name}', { name }));
      return { available: rec.id === this.me };
    } catch {
      return { available: true };
    }
  }

  //#endregion User Methods

  //#region Snippet Helpers

  /** HTML/CSS/JS `snippet_files` rows for a snippet, ordered by `fileType`. */
  private async filesFor(snippetId: string): Promise<RecordModel[]> {
    return this.pb.collection('snippet_files').getFullList({
      filter: this.filter('snippet = {:id}', { id: snippetId }),
      sort: 'fileType',
    });
  }

  /** Whether the signed-in user has favorited `snippetId`. */
  private async isSnippetFavorited(snippetId: string): Promise<boolean> {
    if (!this.me) return false;
    const fav = await this.pb.collection('favorites').getList(1, 1, {
      filter: this.filter('snippet = {:sid} && user = {:uid}', {
        sid: snippetId,
        uid: this.me,
      }),
    });
    return fav.totalItems > 0;
  }

  /** Map a PocketBase list result to `{ snippets, totalCount }`. */
  private listPage(
    result: ListResult<RecordModel>,
    extras?: (r: RecordModel) => Partial<ReturnType<typeof mapSnippetList>>
  ): SnippetListPage {
    return {
      totalCount: result.totalItems,
      snippets: result.items.map((item) => mapSnippetList(this.pb, item, this.me, extras?.(item))),
    };
  }

  /** Public snippets with an extra filter fragment already appended. */
  private async publicList(
    page: number,
    limit: number,
    sort: SnippetSort,
    extraFilter: string
  ): Promise<SnippetListPage> {
    const result = await this.pb.collection('snippets').getList(page, limit, {
      filter: `isPrivate = false${extraFilter}`,
      sort: this.sortExpr(sort),
      expand: 'user',
    });
    return this.withFavoriteFlags(result);
  }

  /** Attach `isFavorited` / `isFollowing` for the current user onto list cards. */
  private async withFavoriteFlags(result: ListResult<RecordModel>): Promise<SnippetListPage> {
    const favorited = await this.favoritedSet(result.items.map((i) => i.id));
    const following = await this.followingSet(
      result.items.map((i) => String(i['user'] || '')).filter(Boolean)
    );
    return this.listPage(result, (r) => ({
      isFavorited: favorited.has(r.id),
      isFollowing: this.me !== r['user'] && following.has(String(r['user'])),
    }));
  }

  /** Snippet ids the current user has favorited (from a page of records). */
  private async favoritedSet(ids: string[]): Promise<Set<string>> {
    if (!this.me || ids.length === 0) return new Set();
    const or = ids.map((id, i) => `snippet = {:id${i}}`).join(' || ');
    const params: Record<string, string> = { me: this.me };
    ids.forEach((id, i) => {
      params[`id${i}`] = id;
    });
    const result = await this.pb.collection('favorites').getFullList({
      filter: this.filter(`user = {:me} && (${or})`, params),
      fields: 'snippet',
    });
    return new Set(result.map((r) => String(r['snippet'])));
  }

  /** User ids the current user follows (from a page of snippet owners). */
  private async followingSet(userIds: string[]): Promise<Set<string>> {
    if (!this.me || userIds.length === 0) return new Set();
    const unique = [...new Set(userIds)];
    const or = unique.map((_, i) => `following = {:id${i}}`).join(' || ');
    const params: Record<string, string> = { me: this.me };
    unique.forEach((id, i) => {
      params[`id${i}`] = id;
    });
    const result = await this.pb.collection('follows').getFullList({
      filter: this.filter(`follower = {:me} && (${or})`, params),
      fields: 'following',
    });
    return new Set(result.map((r) => String(r['following'])));
  }

  /** Create or update the three `snippet_files` rows in parallel. */
  private async syncFiles(
    snippetId: string,
    files?: CreateSnippetRequest['snippetFiles'],
    options?: { create?: boolean }
  ): Promise<RecordModel[]> {
    const byType = new Map<string, string>();
    const missingId = FILE_TYPES.some((type) => !this.fileId(files, type));
    if (!options?.create && missingId) {
      const existing = await this.filesFor(snippetId);
      for (const rec of existing) byType.set(String(rec['fileType']), rec.id);
    }
    return Promise.all(
      FILE_TYPES.map((type) => {
        const content = files?.find((f) => f.fileType === type)?.content ?? '';
        const id = this.fileId(files, type) || byType.get(type);
        if (id) {
          return this.pb.collection('snippet_files').update(id, { content });
        }
        return this.pb.collection('snippet_files').create({
          snippet: snippetId,
          fileType: type,
          content,
        });
      })
    );
  }

  private fileId(
    files: CreateSnippetRequest['snippetFiles'] | undefined,
    type: string
  ): string | undefined {
    const id = files?.find((f) => f.fileType === type)?.snippetFileID;
    return id ? String(id) : undefined;
  }

  //#endregion Snippet Helpers

  //#region Snippets — detail

  /** Load one snippet by public `shortId`, including files and favorite state. */
  async getSnippetByShortId(shortId: string): Promise<Snippet> {
    const rec = await this.pb
      .collection('snippets')
      .getFirstListItem(this.filter('shortId = {:id}', { id: shortId }), { expand: 'user' });
    const [isFavorited, files] = await Promise.all([
      this.isSnippetFavorited(rec.id),
      this.filesFor(rec.id),
    ]);
    return mapSnippet(this.pb, rec, files, this.me, { isFavorited });
  }

  /** Load a snippet via hidden share token (`GET /api/snippy/shared/{token}`). */
  async getSharedSnippet(token: string): Promise<Snippet> {
    const data = await this.pb.send<{ snippet: RecordModel; files: RecordModel[] }>(
      `/api/snippy/shared/${encodeURIComponent(token)}`,
      { method: 'GET' }
    );
    return mapSnippet(this.pb, data.snippet, data.files ?? [], this.me);
  }

  /** Create a snippet owned by the signed-in user and sync HTML/CSS/JS files. */
  async createSnippet(body: CreateSnippetRequest): Promise<Snippet> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const rec = await this.pb.collection('snippets').create(
      {
        user: this.me,
        name: body.name || 'Untitled',
        description: body.description || '',
        isPrivate: !!body.isPrivate,
        tags: body.tags ?? [],
        cdnResources: body.cdnResources ?? [],
      },
      { expand: 'user' }
    );
    const fileRecords = await this.syncFiles(rec.id, body.snippetFiles, { create: true });
    return mapSnippet(this.pb, rec, fileRecords, this.me);
  }

  /** Update snippet metadata and replace pane contents. */
  async updateSnippet(snippetId: string, body: CreateSnippetRequest): Promise<Snippet> {
    const rec = await this.pb.collection('snippets').update(
      snippetId,
      {
        name: body.name,
        description: body.description ?? '',
        isPrivate: !!body.isPrivate,
        tags: body.tags ?? [],
        cdnResources: body.cdnResources ?? [],
      },
      { expand: 'user' }
    );
    const fileRecords = await this.syncFiles(snippetId, body.snippetFiles);
    return mapSnippet(this.pb, rec, fileRecords, this.me);
  }

  /** Delete a snippet (API rules require owner). Cascades files via PocketBase. */
  async deleteSnippet(snippetId: string): Promise<void> {
    await this.pb.collection('snippets').delete(snippetId);
  }

  /** Upload a thumbnail to `snippets.snapshot`. Returns only the fields the editor patches. */
  async uploadSnippetSnapshot(
    snippetId: string,
    file: Blob
  ): Promise<{ snapshotUrl: string | null; updatedAt?: string }> {
    const form = new FormData();
    form.append('snapshot', file, 'snapshot.png');
    const rec = await this.pb.collection('snippets').update(snippetId, form);
    return {
      snapshotUrl: fileUrl(this.pb, rec, 'snapshot'),
      updatedAt: rec['updated'],
    };
  }

  //#endregion Snippets — detail

  //#region Snippets — lists

  /** Signed-in user's snippets (public and private). */
  async getMySnippets(page: number, limit: number, q?: string): Promise<SnippetListPage> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const result = await this.pb.collection('snippets').getList(page, limit, {
      filter: this.filter('user = {:me}', { me: this.me }) + this.searchClause(q),
      sort: '-created',
      expand: 'user',
    });
    return this.withFavoriteFlags(result);
  }

  /** Explore: public snippets, optional search and tag. */
  async getPublicSnippets(
    page: number,
    limit: number,
    sort: SnippetSort = 'newest',
    q?: string,
    tag?: string
  ): Promise<SnippetListPage> {
    let extra = this.searchClause(q);
    if (tag) extra += this.filter(' && tags ~ {:tag}', { tag });
    return this.publicList(page, limit, sort, extra);
  }

  /** Home following feed: public snippets from accounts we follow. */
  async getFeedSnippets(
    page: number,
    limit: number,
    sort: SnippetSort = 'newest',
    q?: string
  ): Promise<SnippetListPage> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const follows = await this.pb.collection('follows').getFullList({
      filter: this.filter('follower = {:me}', { me: this.me }),
      fields: 'following',
    });
    const ids = follows.map((f) => String(f['following']));
    if (ids.length === 0) {
      return { snippets: [], totalCount: 0 };
    }
    const or = ids.map((_, i) => `user = {:id${i}}`).join(' || ');
    const params: Record<string, string> = {};
    ids.forEach((id, i) => {
      params[`id${i}`] = id;
    });
    const result = await this.pb.collection('snippets').getList(page, limit, {
      filter: this.filter(`isPrivate = false && (${or})`, params) + this.searchClause(q),
      sort: this.sortExpr(sort),
      expand: 'user',
    });
    return this.withFavoriteFlags(result);
  }

  /** Another user's public snippets for their profile. */
  async getUserPublicSnippets(
    userName: string,
    page: number,
    limit: number,
    q?: string
  ): Promise<SnippetListPage> {
    const user = await this.pb
      .collection('users')
      .getFirstListItem(this.filter('username = {:name}', { name: userName }));
    const result = await this.pb.collection('snippets').getList(page, limit, {
      filter:
        this.filter('user = {:id} && isPrivate = false', { id: user.id }) + this.searchClause(q),
      sort: '-created',
      expand: 'user',
    });
    return this.withFavoriteFlags(result);
  }

  /** Public search; same as `getPublicSnippets` with a query. */
  async searchSnippets(
    query: string,
    page: number,
    limit: number,
    sort: SnippetSort = 'newest'
  ): Promise<SnippetListPage> {
    return this.getPublicSnippets(page, limit, sort, query);
  }

  /** Signed-in user's favorited snippets (`favorites` expand `snippet`). */
  async getFavorites(page: number, limit: number, q?: string): Promise<SnippetListPage> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    let filter = this.filter('user = {:me}', { me: this.me });
    const query = q?.trim();
    if (query) {
      filter += this.filter(' && (snippet.name ~ {:q} || snippet.description ~ {:q})', {
        q: query,
      });
    }
    const result = await this.pb.collection('favorites').getList(page, limit, {
      filter,
      sort: '-created',
      expand: 'snippet,snippet.user',
    });
    const snippets = result.items
      .map((fav) => fav.expand?.['snippet'] as RecordModel | undefined)
      .filter((s): s is RecordModel => !!s)
      .map((s) => mapSnippetList(this.pb, s, this.me, { isFavorited: true }));
    return { snippets, totalCount: result.totalItems };
  }

  //#endregion Snippets — lists

  //#region Snippets — favorite, fork, view, share

  /** Create or delete a `favorites` row; returns new heart state and `favoriteCount`. */
  async toggleFavorite(snippetId: string): Promise<Favorite> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const existing = await this.pb.collection('favorites').getList(1, 1, {
      filter: this.filter('snippet = {:sid} && user = {:uid}', { sid: snippetId, uid: this.me }),
    });
    if (existing.totalItems > 0 && existing.items[0]) {
      await this.pb.collection('favorites').delete(existing.items[0].id);
    } else {
      await this.pb.collection('favorites').create({ snippet: snippetId, user: this.me });
    }
    const snippet = await this.pb.collection('snippets').getOne(snippetId);
    const isFavorited = existing.totalItems === 0;
    return {
      success: true,
      isFavorited,
      favoriteCount: snippet['favoriteCount'] ?? 0,
    };
  }

  /** Copy a snippet to the signed-in user (`POST /api/snippy/snippets/{id}/fork`). */
  async forkSnippet(snippetId: string): Promise<Snippet> {
    const data = await this.pb.send<{ snippet: RecordModel; files: RecordModel[] }>(
      `/api/snippy/snippets/${encodeURIComponent(snippetId)}/fork`,
      { method: 'POST' }
    );
    return mapSnippet(this.pb, data.snippet, data.files ?? [], this.me);
  }

  /** Record a unique view (24h cooldown) and maybe bump `viewCount`. */
  async recordSnippetView(snippetId: string): Promise<{ counted?: boolean; viewCount?: number }> {
    return this.pb.send(`/api/snippy/snippets/${encodeURIComponent(snippetId)}/view`, {
      method: 'POST',
    });
  }

  /** Public forks of a snippet, listed by parent `shortId`. */
  async getSnippetForks(shortId: string, limit = 50): Promise<SnippetListPage> {
    const parent = await this.pb
      .collection('snippets')
      .getFirstListItem(this.filter('shortId = {:id}', { id: shortId }));
    const result = await this.pb.collection('snippets').getList(1, limit, {
      filter: this.filter('parentSnippet = {:id} && isPrivate = false', { id: parent.id }),
      sort: '-created',
      expand: 'user',
    });
    return this.withFavoriteFlags(result);
  }

  /** Generate a hidden share token (`POST /api/snippy/snippets/{id}/share`). */
  async createSnippetShareLink(snippetId: string): Promise<{ shareToken: string | null }> {
    return this.pb.send(`/api/snippy/snippets/${encodeURIComponent(snippetId)}/share`, {
      method: 'POST',
    });
  }

  /** Clear the share token. */
  async revokeSnippetShareLink(snippetId: string): Promise<void> {
    await this.pb.send(`/api/snippy/snippets/${encodeURIComponent(snippetId)}/share`, {
      method: 'DELETE',
    });
  }

  //#endregion Snippets — favorite, fork, view, share

  //#region Collections

  /** Membership counts for a page of collection ids. */
  private async collectionCounts(ids: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (ids.length === 0) return counts;
    await Promise.all(
      ids.map(async (id) => {
        const res = await this.pb.collection('collection_snippets').getList(1, 1, {
          filter: this.filter('collection = {:id}', { id }),
        });
        counts.set(id, res.totalItems);
      })
    );
    return counts;
  }

  /** Which of `ids` already contain `snippetId` (add-to-collection dialog). */
  private async containsSet(ids: string[], snippetId?: string): Promise<Set<string>> {
    if (!snippetId || ids.length === 0) return new Set();
    const or = ids.map((_, i) => `collection = {:id${i}}`).join(' || ');
    const params: Record<string, string> = { snippet: snippetId };
    ids.forEach((id, i) => {
      params[`id${i}`] = id;
    });
    const result = await this.pb.collection('collection_snippets').getFullList({
      filter: this.filter(`snippet = {:snippet} && (${or})`, params),
      fields: 'collection',
    });
    return new Set(result.map((r) => String(r['collection'])));
  }

  /** Signed-in user's collections; `snippetId` marks which already contain that pen. */
  async getMyCollections(
    page: number,
    limit: number,
    snippetId?: string,
    q?: string
  ): Promise<{ collections: Collection[]; totalCount: number }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const result = await this.pb.collection('collections').getList(page, limit, {
      filter: this.filter('user = {:me}', { me: this.me }) + this.searchClause(q),
      sort: '-created',
      expand: 'user',
    });
    const counts = await this.collectionCounts(result.items.map((i) => i.id));
    const contains = await this.containsSet(
      result.items.map((i) => i.id),
      snippetId
    );
    return {
      totalCount: result.totalItems,
      collections: result.items.map((c) =>
        mapCollection(c, this.me, {
          snippetCount: counts.get(c.id) ?? 0,
          containsSnippet: contains.has(c.id),
        })
      ),
    };
  }

  /** Another user's public collections. */
  async getUserCollections(
    userName: string,
    page: number,
    limit: number,
    q?: string
  ): Promise<{ collections: Collection[]; totalCount: number }> {
    const user = await this.pb
      .collection('users')
      .getFirstListItem(this.filter('username = {:name}', { name: userName }));
    const result = await this.pb.collection('collections').getList(page, limit, {
      filter:
        this.filter('user = {:id} && isPrivate = false', { id: user.id }) + this.searchClause(q),
      sort: '-created',
      expand: 'user',
    });
    const counts = await this.collectionCounts(result.items.map((i) => i.id));
    return {
      totalCount: result.totalItems,
      collections: result.items.map((c) =>
        mapCollection(c, this.me, { snippetCount: counts.get(c.id) ?? 0 })
      ),
    };
  }

  /** One collection by `shortId`, with member snippets (optional client-side search). */
  async getCollection(shortId: string, q?: string): Promise<{ collection: Collection | null }> {
    const rec = await this.pb
      .collection('collections')
      .getFirstListItem(this.filter('shortId = {:id}', { id: shortId }), { expand: 'user' });
    const links = await this.pb.collection('collection_snippets').getFullList({
      filter: this.filter('collection = {:id}', { id: rec.id }),
      expand: 'snippet,snippet.user',
    });
    let snippets = links
      .map((l) => l.expand?.['snippet'] as RecordModel | undefined)
      .filter((s): s is RecordModel => !!s)
      .map((s) => mapSnippetList(this.pb, s, this.me));
    const query = q?.trim().toLowerCase();
    if (query) {
      snippets = snippets.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(query) ||
          (s.description || '').toLowerCase().includes(query)
      );
    }
    return {
      collection: mapCollection(rec, this.me, {
        snippetCount: snippets.length,
        snippets,
      }),
    };
  }

  /** Create a playlist owned by the signed-in user. */
  async createCollection(body: {
    name: string;
    description?: string | null;
    isPrivate?: boolean;
  }): Promise<{ collection: Collection }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const rec = await this.pb.collection('collections').create({
      user: this.me,
      name: body.name,
      description: body.description ?? '',
      isPrivate: !!body.isPrivate,
    });
    const saved = await this.pb.collection('collections').getOne(rec.id, { expand: 'user' });
    return { collection: mapCollection(saved, this.me, { snippetCount: 0 }) };
  }

  /** Delete a collection (API rules require owner). */
  async deleteCollection(collectionId: string): Promise<void> {
    await this.pb.collection('collections').delete(collectionId);
  }

  /** Add a snippet to a collection; no-op if the pair already exists. */
  async addSnippetToCollection(
    collectionId: string,
    snippetId: string
  ): Promise<{ collection: Collection }> {
    try {
      await this.pb.collection('collection_snippets').create({
        collection: collectionId,
        snippet: snippetId,
      });
    } catch {
      /* unique pair — already in collection */
    }
    const rec = await this.pb.collection('collections').getOne(collectionId, { expand: 'user' });
    const count = await this.pb.collection('collection_snippets').getList(1, 1, {
      filter: this.filter('collection = {:id}', { id: collectionId }),
    });
    return {
      collection: mapCollection(rec, this.me, {
        snippetCount: count.totalItems,
        containsSnippet: true,
      }),
    };
  }

  /** Remove a snippet from a collection if the join row exists. */
  async removeSnippetFromCollection(collectionId: string, snippetId: string): Promise<void> {
    const existing = await this.pb.collection('collection_snippets').getList(1, 1, {
      filter: this.filter('collection = {:cid} && snippet = {:sid}', {
        cid: collectionId,
        sid: snippetId,
      }),
    });
    if (existing.items[0]) {
      await this.pb.collection('collection_snippets').delete(existing.items[0].id);
    }
  }

  //#endregion Collections

  //#region Comments

  /** Thread for a snippet, oldest first. */
  async getComments(
    snippetId: string,
    limit = 200
  ): Promise<{ comments: Comment[]; totalCount: number }> {
    const result = await this.pb.collection('comments').getList(1, limit, {
      filter: this.filter('snippet = {:id}', { id: snippetId }),
      sort: 'created',
      expand: 'user',
    });
    return {
      totalCount: result.totalItems,
      comments: result.items.map((c) => mapComment(c, this.me)),
    };
  }

  /** Post a comment or reply (`parentId` = parent comment record id). */
  async createComment(
    snippetId: string,
    body: { content: string; parentId?: string }
  ): Promise<{ comment: Comment }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const rec = await this.pb.collection('comments').create({
      snippet: snippetId,
      user: this.me,
      content: body.content,
      parentComment: body.parentId || '',
    });
    const saved = await this.pb.collection('comments').getOne(rec.id, { expand: 'user' });
    return { comment: mapComment(saved, this.me) };
  }

  /** Edit comment body. */
  async updateComment(commentId: string, body: { content: string }): Promise<{ comment: Comment }> {
    await this.pb.collection('comments').update(commentId, { content: body.content });
    const saved = await this.pb.collection('comments').getOne(commentId, { expand: 'user' });
    return { comment: mapComment(saved, this.me) };
  }

  /** Soft-delete when the comment has replies; otherwise hard-delete. */
  async deleteComment(commentId: string): Promise<void> {
    const replies = await this.pb.collection('comments').getList(1, 1, {
      filter: this.filter('parentComment = {:id}', { id: commentId }),
    });
    if (replies.totalItems > 0) {
      await this.pb.collection('comments').update(commentId, { isDeleted: true });
    } else {
      await this.pb.collection('comments').delete(commentId);
    }
  }

  //#endregion Comments

  //#region Follows

  /** Follow `userName` if not already following (no-op for self). */
  async followUser(userName: string): Promise<{ isFollowing: boolean }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const user = await this.pb
      .collection('users')
      .getFirstListItem(this.filter('username = {:name}', { name: userName }));
    if (user.id === this.me) return { isFollowing: false };
    const existing = await this.pb.collection('follows').getList(1, 1, {
      filter: this.filter('follower = {:me} && following = {:id}', { me: this.me, id: user.id }),
    });
    if (existing.totalItems === 0) {
      await this.pb.collection('follows').create({ follower: this.me, following: user.id });
    }
    return { isFollowing: true };
  }

  /** Remove the follow row if present. */
  async unfollowUser(userName: string): Promise<{ isFollowing: boolean }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const user = await this.pb
      .collection('users')
      .getFirstListItem(this.filter('username = {:name}', { name: userName }));
    const existing = await this.pb.collection('follows').getList(1, 1, {
      filter: this.filter('follower = {:me} && following = {:id}', { me: this.me, id: user.id }),
    });
    if (existing.items[0]) {
      await this.pb.collection('follows').delete(existing.items[0].id);
    }
    return { isFollowing: false };
  }

  //#endregion Follows

  //#region Assets

  /** Signed-in user's uploaded files (`assets` collection). */
  async listAssets(): Promise<{ assets: Asset[] }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const result = await this.pb.collection('assets').getFullList({
      filter: this.filter('user = {:me}', { me: this.me }),
      sort: '-created',
    });
    return { assets: result.map((r) => mapAsset(this.pb, r, 0)) };
  }

  /** Upload a library file owned by the signed-in user. */
  async uploadAsset(file: File): Promise<{ asset: Asset }> {
    if (!this.me) throw Object.assign(new Error('Unauthenticated'), { status: 401 });
    const form = new FormData();
    form.append('user', this.me);
    form.append('file', file);
    form.append('originalName', file.name);
    form.append('mimeType', file.type);
    form.append('size', String(file.size));
    const rec = await this.pb.collection('assets').create(form);
    return { asset: mapAsset(this.pb, rec, 0) };
  }

  /** Delete an asset (API rules require owner). */
  async deleteAsset(assetId: string): Promise<void> {
    await this.pb.collection('assets').delete(assetId);
  }

  //#endregion Assets
}
