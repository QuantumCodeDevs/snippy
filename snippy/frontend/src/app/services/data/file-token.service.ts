// File token for protected PocketBase files (private snippet snapshots).

import { Injectable, inject, signal } from '@angular/core';
import { isTokenExpired } from 'pocketbase';
import { PocketBaseService } from '@app/services/data/pocketbase.service';

@Injectable({ providedIn: 'root' })
export class FileTokenService {
  private pb = inject(PocketBaseService).pb;
  private pending: Promise<void> | null = null;

  /** Current file token for the signed-in user, or null. */
  readonly token = signal<string | null>(null);

  constructor() {
    // A token belongs to one user; drop it on sign-out or account switch.
    this.pb.authStore.onChange(() => this.token.set(null));
  }

  //#region Token

  /** Fetch a token when signed in and the cached one is missing or about to expire. */
  ensure(force = false): Promise<void> {
    if (!this.pb.authStore.isValid) {
      this.token.set(null);
      return Promise.resolve();
    }
    const current = this.token();
    if (!force && current && !isTokenExpired(current, 60)) return Promise.resolve();
    this.pending ??= this.pb.files
      .getToken()
      .then((token) => this.token.set(token))
      .catch(() => this.token.set(null))
      .finally(() => (this.pending = null));
    return this.pending;
  }

  //#endregion Token

  //#region URLs

  /**
   * URL for a snapshot. Private snapshots need the owner's token, so return ''
   * until one is loaded (callers show their placeholder meanwhile).
   */
  snapshotSrc(url: string | null | undefined, isPrivate: boolean | undefined): string {
    if (!url) return '';
    if (!isPrivate) return url;
    const token = this.token();
    if (!token) return '';
    return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  }

  //#endregion URLs
}
