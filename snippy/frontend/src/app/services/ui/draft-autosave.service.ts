import { Injectable } from '@angular/core';
import type { CdnResource } from '@app/models/extra-models/cdnLibrary';
import type { Snippet } from '@app/models/base-models/snippet';
import type { SnippetFile } from '@app/models/base-models/snippet-file';

export const DRAFT_TRY_KEY = 'snippy.draft.try';
export const DRAFT_NEW_KEY = 'snippy.draft.new';
const DRAFT_SAVED_PREFIX = 'snippy.draft.';
const MAX_BYTES = 400_000;

export interface SnippetDraft {
  name?: string;
  description?: string | null;
  isPrivate?: boolean;
  tags?: string[];
  snippetFiles?: SnippetFile[];
  cdnResources?: CdnResource[];
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class DraftAutosaveService {
  //#region Keys

  /** localStorage key for guest `/try`, unsaved new, or a saved shortId. */
  keyFor(opts: { guest: boolean; shortId?: string | null }): string {
    if (opts.guest) return DRAFT_TRY_KEY;
    const shortId = opts.shortId?.trim() || null;
    if (shortId) return `${DRAFT_SAVED_PREFIX}${shortId}`;
    return DRAFT_NEW_KEY;
  }

  //#endregion Keys

  //#region Storage

  /** Parse a draft from localStorage, or null if missing/invalid. */
  read(key: string): SnippetDraft | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SnippetDraft;
      if (!parsed?.updatedAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /** Write a draft; returns false when over quota or over `MAX_BYTES`. */
  write(key: string, draft: SnippetDraft): boolean {
    try {
      const payload = JSON.stringify(draft);
      if (payload.length > MAX_BYTES) return false;
      localStorage.setItem(key, payload);
      return true;
    } catch {
      return false;
    }
  }

  /** Remove a draft key (ignores private-mode storage errors). */
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore quota / private mode */
    }
  }

  //#endregion Storage

  //#region Snippet drafts

  /** Snapshot the current snippet into localStorage. */
  persistFromSnippet(key: string, snippet: Snippet) {
    return this.write(key, {
      name: snippet.name,
      description: snippet.description,
      isPrivate: snippet.isPrivate,
      tags: snippet.tags ?? [],
      snippetFiles: snippet.snippetFiles,
      cdnResources: snippet.cdnResources,
      updatedAt: new Date().toISOString(),
    });
  }

  /** True when the draft is newer than the last server `updatedAt`. */
  shouldRestore(draft: SnippetDraft, snippetUpdatedAt?: string | null): boolean {
    if (!snippetUpdatedAt) return true;
    return Date.parse(draft.updatedAt) > Date.parse(snippetUpdatedAt);
  }

  /** Overlay draft fields onto a snippet without mutating the original. */
  applyToSnippet(snippet: Snippet, draft: SnippetDraft): Snippet {
    return {
      ...snippet,
      name: draft.name ?? snippet.name,
      description: draft.description ?? snippet.description,
      isPrivate: draft.isPrivate ?? snippet.isPrivate,
      tags: draft.tags ?? snippet.tags,
      snippetFiles: draft.snippetFiles ?? snippet.snippetFiles,
      cdnResources: draft.cdnResources ?? snippet.cdnResources,
    };
  }

  /** Carry guest /try work into the authenticated new-pen editor. */
  promoteTryToNew() {
    const draft = this.read(DRAFT_TRY_KEY);
    if (!draft) return;
    this.write(DRAFT_NEW_KEY, draft);
    this.remove(DRAFT_TRY_KEY);
  }

  //#endregion Snippet drafts
}
