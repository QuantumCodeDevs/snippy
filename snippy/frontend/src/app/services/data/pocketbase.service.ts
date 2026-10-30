// PocketBase service for interacting with the PocketBase API.

import { Injectable, inject } from '@angular/core';
import PocketBase from 'pocketbase';
import { ActivityService } from '@app/services/ui/activity.service';

@Injectable({ providedIn: 'root' })
export class PocketBaseService {
  readonly pb: PocketBase;

  constructor() {
    // Shared SDK client; auto-cancel off so overlapping list/detail requests are not aborted.
    // PocketBase is always same-origin: nginx (prod) and ng serve (dev) proxy /api/.
    this.pb = new PocketBase(typeof window !== 'undefined' ? window.location.origin : '');
    this.pb.autoCancellation(false);
    this.trackRequests(inject(ActivityService));
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
