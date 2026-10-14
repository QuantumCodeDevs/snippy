import { Routes } from '@angular/router';
import { HomePageComponent } from '@app/pages/home-page/home-page.component';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';
import { authGuard, guestGuard } from '@app/guards/auth.guard';
import type { SnippetFeed } from '@app/pages/snippet-feed-page/snippet-feed-page.component';
import type { HeaderMode } from '@app/models/extra-models/header-mode';

export const routes: Routes = [
  { path: '', component: HomePageComponent, data: { header: 'landing' satisfies HeaderMode } },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login-page.component').then((m) => m.LoginPageComponent),
    canActivate: [guestGuard],
    data: { header: 'landing' satisfies HeaderMode },
  },
  {
    path: 'create-account',
    loadComponent: () =>
      import('./pages/auth/create-account-page.component').then(
        (m) => m.CreateAccountPageComponent
      ),
    canActivate: [guestGuard],
    data: { header: 'landing' satisfies HeaderMode },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPageComponent
      ),
    canActivate: [guestGuard],
    data: { header: 'landing' satisfies HeaderMode },
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password-page.component').then(
        (m) => m.ResetPasswordPageComponent
      ),
    canActivate: [guestGuard],
    data: { header: 'landing' satisfies HeaderMode },
  },
  {
    path: 'set-password',
    loadComponent: () =>
      import('./pages/auth/set-password-page.component').then((m) => m.SetPasswordPageComponent),
    data: { header: 'landing' satisfies HeaderMode },
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth/oauth-callback-page.component').then(
        (m) => m.OAuthCallbackPageComponent
      ),
    data: { header: 'landing' satisfies HeaderMode },
  },

  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/privacy-policy-page/privacy-policy-page.component').then(
        (m) => m.PrivacyPolicyPageComponent
      ),
    data: { header: 'landing' satisfies HeaderMode },
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/terms-page/terms-page.component').then((m) => m.TermsPageComponent),
    data: { header: 'landing' satisfies HeaderMode },
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/user-home-page/user-home-page.component').then(
        (m) => m.UserHomePageComponent
      ),
    canActivate: [authGuard],
    data: { header: 'feed' satisfies HeaderMode },
  },
  {
    path: 'following',
    loadComponent: () =>
      import('./pages/snippet-feed-page/snippet-feed-page.component').then(
        (m) => m.SnippetFeedPageComponent
      ),
    canActivate: [authGuard],
    data: { header: 'feed' satisfies HeaderMode, feed: 'following' satisfies SnippetFeed },
  },
  {
    path: 'public',
    loadComponent: () =>
      import('./pages/snippet-feed-page/snippet-feed-page.component').then(
        (m) => m.SnippetFeedPageComponent
      ),
    data: { header: 'feed' satisfies HeaderMode, feed: 'public' satisfies SnippetFeed },
  },
  {
    path: 'tags/:tag',
    loadComponent: () =>
      import('./pages/snippet-feed-page/snippet-feed-page.component').then(
        (m) => m.SnippetFeedPageComponent
      ),
    data: { header: 'feed' satisfies HeaderMode, feed: 'tag' satisfies SnippetFeed },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings-page/settings-page.component').then((m) => m.SettingsPageComponent),
    canActivate: [authGuard],
    data: { header: 'feed' satisfies HeaderMode },
  },
  {
    path: 'collections/:shortId',
    loadComponent: () =>
      import('./pages/collection-detail-page/collection-detail-page.component').then(
        (m) => m.CollectionDetailPageComponent
      ),
    data: { header: 'feed' satisfies HeaderMode },
  },
  {
    path: 'embed/:shortId',
    loadComponent: () =>
      import('./pages/embed-player-page/embed-player-page.component').then(
        (m) => m.EmbedPlayerPageComponent
      ),
    data: { header: 'embed' satisfies HeaderMode },
  },
  {
    path: 's/:token',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canDeactivate: [unsavedChangesGuard],
    data: { header: 'editor' satisfies HeaderMode, share: true },
  },
  {
    path: 'try',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canDeactivate: [unsavedChangesGuard],
    data: { header: 'editor' satisfies HeaderMode, guest: true },
  },
  {
    path: 'snippet',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { header: 'editor' satisfies HeaderMode },
  },
  {
    path: ':username/snippet/:id',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canDeactivate: [unsavedChangesGuard],
    data: { header: 'editor' satisfies HeaderMode },
  },
  {
    path: ':username/fullpage/:id',
    loadComponent: () =>
      import('./pages/fullpage-view/fullpage-view.component').then((m) => m.FullpageViewComponent),
    data: { header: 'minimal' satisfies HeaderMode },
  },
  {
    path: ':username',
    loadComponent: () =>
      import('./pages/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
    data: { header: 'feed' satisfies HeaderMode },
  },

  { path: '**', redirectTo: '' },
];
