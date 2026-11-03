// PocketBase service for interacting with the PocketBase API.

import { Injectable, inject } from '@angular/core';
import PocketBase, { BaseAuthStore, type AuthRecord } from 'pocketbase';
import { ActivityService } from '@app/services/ui/activity.service';

/**
 * In-memory auth store that only holds the user record. The JWT lives in an
 * HttpOnly cookie that PocketBase sets and reads (pb_hooks/5_auth_cookie.pb.js),
 * so no script on the page can read it. A record means a live session.
 */
export class CookieAuthStore extends BaseAuthStore {
  override get isValid(): boolean {
    return !!this.record;
  }

  override save(_token: string, record?: AuthRecord) {
    super.save('', record);
  }
}

@Injectable({ providedIn: 'root' })
export class PocketBaseService {
  readonly pb: PocketBase;

  constructor() {
    // Shared SDK client; auto-cancel off so overlapping list/detail requests are not aborted.
    // PocketBase is always same-origin: nginx (prod) and ng serve (dev) proxy /api/.
    this.pb = new PocketBase(
      typeof window !== 'undefined' ? window.location.origin : '',
      new CookieAuthStore()
    );
    this.pb.autoCancellation(false);
    this.trackRequests(inject(ActivityService));
    this.dropLegacyToken();
  }

  /** Older builds kept the JWT in localStorage; remove any copy left behind. */
  private dropLegacyToken() {
    try {
      localStorage.removeItem('pocketbase_auth');
    } catch {
      /* storage unavailable */
    }
  }

  /** Count every SDK request so the shell's activity bar shows slow API calls. */
  private trackRequests(activity: ActivityService) {
    const send = this.pb.send.bind(this.pb);
    this.pb.send = (async (path: string, options: Parameters<PocketBase['send']>[1]) => {
      const done = activity.start();
      try {
        return await send(path, options);
      } finally {
        done();
      }
    }) as PocketBase['send'];
  }
}
