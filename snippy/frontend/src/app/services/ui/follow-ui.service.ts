import { Injectable, inject } from '@angular/core';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { SnackbarService } from '@app/services/ui/snackbar.service';

/**
 * Follow/unfollow with the shared snackbar feedback. Returns the resulting
 * state so callers can patch their own view models.
 */
@Injectable({ providedIn: 'root' })
export class FollowUiService {
  private api = inject(SnippyApi);
  private snackbar = inject(SnackbarService);

  //#region Follow

  /** Follow or unfollow `userName`; returns the new `isFollowing`, or null on error. */
  async toggle(userName: string, isFollowing: boolean): Promise<boolean | null> {
    try {
      const res = isFollowing
        ? await this.api.unfollowUser(userName)
        : await this.api.followUser(userName);
      const nowFollowing = res.isFollowing ?? !isFollowing;
      this.snackbar.success(nowFollowing ? `Following @${userName}` : `Unfollowed @${userName}`);
      return nowFollowing;
    } catch {
      this.snackbar.error('Failed to update follow status');
      return null;
    }
  }

  //#endregion Follow
}
