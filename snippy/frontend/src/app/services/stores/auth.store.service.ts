import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { RecordModel } from 'pocketbase';
import type { User } from '@app/models';
import { PocketBaseService } from '@app/services/data/pocketbase.service';
import { mapUser } from '@app/services/data/pb-mappers';
import { RESERVED_USERNAMES } from '@app/services/data/pb-mappers';
import { isPlaceholderUsername, slugUsername } from '@app/utils/user-initials';

export interface OauthProviderMeta {
  name: string;
  displayName: string;
}

interface SnippyMeta {
  smtpEnabled?: boolean;
  oauth?: OauthProviderMeta[];
}

const OAUTH_REQUEST_KEY = 'snippy-oauth2-login';
const OAUTH_CLOSE_GRACE_MS = 1500;

/** Open a blank centered popup (same size as the PocketBase SDK's), or null if blocked. */
function openOAuthPopup(): Window | null {
  if (typeof window === 'undefined' || !window.open) return null;
  const width = Math.min(1024, window.innerWidth);
  const height = Math.min(768, window.innerHeight);
  const left = window.innerWidth / 2 - width / 2;
  const top = window.innerHeight / 2 - height / 2;
  return window.open(
    '',
    'popup_window',
    `width=${width},height=${height},top=${top},left=${left},resizable,menubar=no`
  );
}

@Injectable({ providedIn: 'root' })
export class AuthStoreService {
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.user());
  readonly syncing = signal(false);
  readonly oauthProviders = signal<OauthProviderMeta[]>([]);
  readonly smtpEnabled = signal<boolean | null>(null);

  private pb = inject(PocketBaseService).pb;
  private router = inject(Router);

  constructor() {
    this.pb.authStore.onChange(() => {
      this.syncFromStore();
    }, true);
    void this.loadMeta();
  }

  //#region Meta

  /** Load `/api/snippy/meta` (SMTP + enabled OAuth providers). */
  async loadMeta() {
    try {
      const meta = await this.pb.send<SnippyMeta>('/api/snippy/meta', { method: 'GET' });
      this.smtpEnabled.set(!!meta.smtpEnabled);
      this.oauthProviders.set(Array.isArray(meta.oauth) ? meta.oauth : []);
    } catch {
      this.smtpEnabled.set(false);
      this.oauthProviders.set([]);
    }
  }

  //#endregion Meta

  //#region Session

  /** Map `pb.authStore.record` into the domain `User` signal. */
  private syncFromStore() {
    const record = this.pb.authStore.record;
    if (!this.pb.authStore.isValid || !record) {
      this.user.set(null);
      return;
    }
    this.user.set(mapUser(this.pb, record));
  }

  /** Password login; identity may be email or username. */
  async login(identity: string, password: string) {
    await this.pb.collection('users').authWithPassword(identity, password);
    this.syncFromStore();
  }

  /** Create a user then immediately sign them in. */
  async register(email: string, password: string, passwordConfirm: string) {
    await this.pb.collection('users').create({ email, password, passwordConfirm });
    await this.pb.collection('users').authWithPassword(email, password);
    this.syncFromStore();
  }

  /** Clear JWT and send the browser home. */
  logout() {
    this.pb.authStore.clear();
    this.user.set(null);
    void this.router.navigateByUrl('/');
  }

  /** Refresh the JWT and replace `user` from the latest record. */
  async refreshUserFromBackend() {
    try {
      if (!this.pb.authStore.isValid) return;
      const rec = await this.pb.collection('users').authRefresh();
      this.user.set(mapUser(this.pb, rec.record));
    } catch {
      this.pb.authStore.clear();
      this.user.set(null);
    }
  }

  /** Login route (redirect query is unused; kept for call-site compatibility). */
  loginUrl(redirect?: string): string[] {
    return ['/login'];
  }

  /** Default landing after a successful login. */
  redirectAfterLogin(): string {
    return '/home';
  }

  //#endregion Session

  //#region Password

  /** Ask PocketBase to email a reset token (no-op when SMTP is off). */
  async requestPasswordReset(email: string) {
    await this.pb.collection('users').requestPasswordReset(email);
  }

  /** Confirm a reset-password token and sync the session. */
  async confirmPasswordReset(token: string, password: string, passwordConfirm: string) {
    await this.pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
    this.syncFromStore();
  }

  /** Change password while signed in (`oldPassword` required by PocketBase). */
  async setPassword(oldPassword: string, password: string, passwordConfirm: string) {
    const id = this.pb.authStore.record?.id;
    if (!id) throw new Error('Not authenticated');
    await this.pb.collection('users').update(id, { oldPassword, password, passwordConfirm });
  }

  //#endregion Password

  //#region OAuth

  /** Run the PocketBase OAuth popup for `provider`, then copy display name / username. */
  /**
   * OAuth2 popup login. Snippy opens the popup itself (synchronously, so popup
   * blockers allow it) and watches it: the SDK never notices a popup closed by
   * the user, which would leave the login button spinning forever.
   */
  async loginWithProvider(provider: string) {
    const popup = openOAuthPopup();
    let watch: ReturnType<typeof setInterval> | undefined;
    let grace: ReturnType<typeof setTimeout> | undefined;
    try {
      const auth = this.pb.collection('users').authWithOAuth2({
        provider,
        requestKey: OAUTH_REQUEST_KEY,
        ...(popup
          ? {
              urlCallback: (url: string) => {
                if (popup.closed) throw new Error('The sign-in window was closed.');
                popup.location.href = url;
              },
            }
          : {}),
      });
      if (popup) {
        watch = setInterval(() => {
          if (!popup.closed) return;
          clearInterval(watch);
          // The realtime auth message can land just after a successful popup
          // closes itself, so give it a moment before cancelling.
          grace = setTimeout(() => this.cancelProviderLogin(), OAUTH_CLOSE_GRACE_MS);
        }, 400);
      }
      const authData = await auth;
      await this.applyOAuthMeta(
        authData as { meta?: Record<string, unknown>; record?: RecordModel }
      );
      this.syncFromStore();
    } finally {
      clearInterval(watch);
      clearTimeout(grace);
      if (popup && !popup.closed) popup.close();
    }
  }

  /** Abort a pending provider login (rejects `loginWithProvider` with `isAbort`). */
  cancelProviderLogin() {
    this.pb.cancelRequest(OAUTH_REQUEST_KEY);
  }

  /** Fill name/username from OAuth meta when the user still has placeholders. */
  private async applyOAuthMeta(authData: { meta?: Record<string, unknown>; record?: RecordModel }) {
    const meta = authData?.meta;
    const record = this.pb.authStore.record;
    if (!meta || !record?.id) return;

    const patch: Record<string, string> = {};
    const displayName = String(meta['name'] || '').trim();
    const currentName = String(record['name'] || '');
    if (displayName && (!currentName || currentName === String(record['username'] || ''))) {
      patch['name'] = displayName.slice(0, 150);
    }

    const candidate = slugUsername(String(meta['username'] || meta['name'] || ''));
    const current = String(record['username'] || '');
    if (
      candidate &&
      !RESERVED_USERNAMES.has(candidate.toLowerCase()) &&
      (!current || isPlaceholderUsername(current))
    ) {
      patch['username'] = candidate;
    }

    if (Object.keys(patch).length === 0) return;
    try {
      const rec = await this.pb.collection('users').update(record.id, patch);
      this.pb.authStore.save(this.pb.authStore.token, rec);
    } catch {
      /* keep generated username / name */
    }
  }

  //#endregion OAuth

  //#region User cache

  /** Merge fields into the in-memory user without hitting PocketBase. */
  patchUser(partial: Partial<User>) {
    this.user.update((u) => (u ? { ...u, ...partial } : u));
  }

  /** Replace the user signal after an API update. */
  setUserFromApi(user: User) {
    this.user.set(user);
  }

  //#endregion User cache
}
