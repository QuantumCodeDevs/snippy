// PocketBase record mappers for converting PocketBase records to our models.

import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import type {
  Asset,
  CdnResource,
  Collection,
  Comment,
  Snippet,
  SnippetFile,
  SnippetList,
  User,
} from '@app/models';

//#region Files

/** Public file URL for a single-file field, or null when empty. */
export function fileUrl(pb: PocketBase, record: RecordModel, field: string): string | null {
  const name = record[field];
  const filename = Array.isArray(name) ? name[0] : name;
  if (!filename) return null;
  return pb.files.getURL(record, filename);
}

//#endregion Files

//#region Users

/** Map a `users` record to the domain `User`. */
export function mapUser(pb: PocketBase, record: RecordModel, extras?: Partial<User>): User {
  return {
    userName: record['username'],
    displayName: record['name'] || record['username'],
    bio: record['bio'] ?? null,
    pictureUrl: fileUrl(pb, record, 'avatar'),
    isPrivate: !!record['isPrivate'],
    editorPreferences: record['editorPreferences'] ?? undefined,
    ...extras,
  };
}

//#endregion Users

//#region Snippets

/** Normalize a tags JSON field to `string[] | null`. */
function asTags(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.filter((t) => typeof t === 'string');
  return null;
}

/** Normalize stored CDN JSON to `CdnResource[]`. */
function asCdn(value: unknown): CdnResource[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r) => r && typeof r === 'object') as CdnResource[];
}

/** Expanded `user` relation → username / display name. */
function ownerName(record: RecordModel): { userName?: string; displayName?: string } {
  const user = (record.expand?.['user'] as RecordModel | undefined) ?? null;
  return {
    userName: user?.['username'],
    displayName: user?.['name'] || user?.['username'],
  };
}

/** Map a snippet record to a list-card model (no files). */
export function mapSnippetList(
  pb: PocketBase,
  record: RecordModel,
  currentUserId: string | null,
  extras?: Partial<SnippetList>
): SnippetList {
  const owner = ownerName(record);
  return {
    snippetId: record.id,
    shortId: record['shortId'],
    name: record['name'],
    description: record['description'] ?? null,
    tags: asTags(record['tags']),
    userName: owner.userName,
    displayName: owner.displayName,
    commentCount: record['commentCount'] ?? 0,
    favoriteCount: record['favoriteCount'] ?? 0,
    viewCount: record['viewCount'] ?? 0,
    forkCount: record['forkCount'] ?? 0,
    embedCount: record['embedCount'] ?? 0,
    isOwner: !!currentUserId && record['user'] === currentUserId,
    isPrivate: !!record['isPrivate'],
    isTemplate: !!record['isTemplate'],
    snapshotUrl: fileUrl(pb, record, 'snapshot'),
    updatedAt: record['updated'],
    parentShortId: record['parentShortId'] ?? null,
    parentName: record['parentName'] ?? null,
    parentUserName: record['parentUserName'] ?? null,
    parentDeleted: !!record['parentDeleted'],
    ...extras,
  };
}

/** Map `snippet_files` rows to editor panes. */
export function mapSnippetFiles(records: RecordModel[]): SnippetFile[] {
  return records.map((r) => ({
    snippetFileID: r.id,
    fileType: r['fileType'],
    content: r['content'] ?? '',
  }));
}

/** Map a snippet + its files to the full editor model. */
export function mapSnippet(
  pb: PocketBase,
  record: RecordModel,
  files: RecordModel[],
  currentUserId: string | null,
  extras?: Partial<Snippet>
): Snippet {
  const list = mapSnippetList(pb, record, currentUserId);
  return {
    ...list,
    isPrivate: !!record['isPrivate'],
    cdnResources: asCdn(record['cdnResources']),
    snippetFiles: mapSnippetFiles(files),
    shareToken: record['shareToken'] ?? null,
    ...extras,
  };
}

//#endregion Snippets

//#region Comments

/** Map a comment (blank content when soft-deleted). */
export function mapComment(record: RecordModel, currentUserId: string | null): Comment {
  const user = (record.expand?.['user'] as RecordModel | undefined) ?? null;
  const content = record['isDeleted'] ? '' : (record['content'] ?? '');
  const mentions = Array.from(String(content).matchAll(/@([A-Za-z0-9_-]{2,32})/g)).map((m) => m[1]);
  return {
    commentId: record.id,
    content,
    createdAt: record['created'],
    updatedAt: record['updated'],
    displayName: user?.['name'] || user?.['username'],
    userName: user?.['username'],
    isDeleted: !!record['isDeleted'],
    isOwner: !!currentUserId && record['user'] === currentUserId,
    parentId: record['parentComment'] || null,
    mentions,
  };
}

//#endregion Comments

//#region Collections

/** Map a collection record; pass `extras.snippetCount` / `snippets` from the caller. */
export function mapCollection(
  record: RecordModel,
  currentUserId: string | null,
  extras?: Partial<Collection>
): Collection {
  const user = (record.expand?.['user'] as RecordModel | undefined) ?? null;
  return {
    collectionId: record.id,
    shortId: record['shortId'],
    name: record['name'],
    description: record['description'] ?? null,
    isPrivate: !!record['isPrivate'],
    userName: user?.['username'],
    displayName: user?.['name'] || user?.['username'],
    isOwner: !!currentUserId && record['user'] === currentUserId,
    snippetCount: extras?.snippetCount ?? 0,
    ...extras,
  };
}

//#endregion Collections

//#region Assets

/** Map an `assets` record; `usedInCount` is filled by the API when known. */
export function mapAsset(pb: PocketBase, record: RecordModel, usedInCount = 0): Asset {
  const url = fileUrl(pb, record, 'file');
  return {
    assetId: record.id,
    fileName: record['originalName'] || String(record['file'] || ''),
    fileType: record['mimeType'] || '',
    objectKey: record['file'] || '',
    url: url ?? undefined,
    usedInCount,
  };
}

//#endregion Assets

/** Usernames that collide with app routes; hooks skip these on signup. */
export const RESERVED_USERNAMES = new Set([
  'login',
  'create-account',
  'forgot-password',
  'reset-password',
  'set-password',
  'auth',
  'callback',
  'home',
  'following',
  'public',
  'tags',
  'settings',
  'collections',
  'embed',
  'try',
  'snippet',
  'privacy',
  'terms',
  'api',
  'admin',
  's',
  'me',
  'fullpage',
]);
