import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { DraftAutosaveService, DRAFT_NEW_KEY } from '@app/services/ui/draft-autosave.service';

/**
 * Single place that knows Snippy's URL shapes, so components never hand-build
 * route arrays for profiles, snippets, or collections.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private router = inject(Router);
  private authStore = inject(AuthStoreService);
  private drafts = inject(DraftAutosaveService);

  //#region App pages

  /** Navigate to the signed-in home feed. */
  toHome() {
    return this.router.navigate(['/home']);
  }

  /** Navigate to account settings. */
  toSettings() {
    return this.router.navigate(['/settings']);
  }

  /** Start a new pen: drop the unsaved-new draft and bump `?new=` so the editor remounts. */
  toNewSnippet() {
    this.drafts.remove(DRAFT_NEW_KEY);
    return this.router.navigate(['/snippet'], { queryParams: { new: Date.now() } });
  }

  //#endregion App pages

  //#region Profiles & snippets

  /** Open `/:userName` (profile). */
  toProfile(userName: string | null | undefined) {
    if (!userName) return Promise.resolve(false);
    return this.router.navigate(['/', userName]);
  }

  /** Open the signed-in user's profile. */
  toCurrentUserProfile() {
    return this.toProfile(this.authStore.user()?.userName);
  }

  /** Owner falls back to the signed-in user so freshly created snippets still route. */
  toSnippet(shortId: string, userName?: string | null) {
    const owner = userName || this.authStore.user()?.userName || 'me';
    return this.router.navigate(['/', owner, 'snippet', shortId]);
  }

  /** Open a fork's parent snippet, or no-op if attribution is missing. */
  toParentSnippet(
    parentShortId: string | null | undefined,
    parentUserName: string | null | undefined
  ) {
    if (!parentShortId || !parentUserName) return Promise.resolve(false);
    return this.router.navigate(['/', parentUserName, 'snippet', parentShortId]);
  }

  /** Open a collection by shortId. */
  toCollection(shortId: string) {
    return this.router.navigate(['/collections', shortId]);
  }

  /** Path (not navigation) for the full-page preview route. */
  fullPageUrl(shortId: string, userName?: string | null) {
    const owner = userName || this.authStore.user()?.userName || 'me';
    return `/${owner}/fullpage/${shortId}`;
  }

  //#endregion Profiles & snippets
}
