// PocketBase service for interacting with the PocketBase API.

import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';
import { pocketBaseBaseUrl } from '@app/config/runtime-env';

@Injectable({ providedIn: 'root' })
export class PocketBaseService {
  readonly pb: PocketBase;

  constructor() {
    // Shared SDK client; auto-cancel off so overlapping list/detail requests are not aborted.
    this.pb = new PocketBase(pocketBaseBaseUrl());
    this.pb.autoCancellation(false);
  }
}
