// PocketBase service for interacting with the PocketBase API.

import { Injectable, inject } from '@angular/core';
import PocketBase from 'pocketbase';
import { pocketBaseBaseUrl } from '@app/config/runtime-env';
import { ActivityService } from '@app/services/ui/activity.service';

@Injectable({ providedIn: 'root' })
export class PocketBaseService {
  readonly pb: PocketBase;

  constructor() {
    // Shared SDK client; auto-cancel off so overlapping list/detail requests are not aborted.
    this.pb = new PocketBase(pocketBaseBaseUrl());
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
