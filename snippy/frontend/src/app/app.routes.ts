import { Routes } from '@angular/router';
import { HomePageComponent } from '@app/pages/home-page/home-page.component';
import { unsavedChangesGuard } from '@app/guards/unsaved-changes.guard';
import { authGuard, guestGuard } from '@app/guards/auth.guard';
import type { SnippetFeed } from '@app/pages/snippet-feed-page/snippet-feed-page.component';
import type { HeaderMode } from '@app/models/extra-models/header-mode';
import { DEFAULT_DESCRIPTION, type SeoData } from '@app/services/ui/seo.service';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    data: {
      seo: { description: DEFAULT_DESCRIPTION } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login-page.component').then((m) => m.LoginPageComponent),
    canActivate: [guestGuard],
    data: {
      seo: {
        title: 'Log in',
        description: 'Log in to Snippy to save, share, and organize your snippets.',
      } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },
  {
    path: 'create-account',
    loadComponent: () =>
      import('./pages/auth/create-account-page.component').then(
        (m) => m.CreateAccountPageComponent
      ),
    canActivate: [guestGuard],
    data: {
      seo: {
        title: 'Create account',
        description:
          'Create a free Snippy account to save and share HTML, CSS, and JavaScript snippets.',
      } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPageComponent
      ),
    canActivate: [guestGuard],
    data: {
      seo: { title: 'Forgot password', noindex: true } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password-page.component').then(
        (m) => m.ResetPasswordPageComponent
      ),
    canActivate: [guestGuard],
    data: {
      seo: { title: 'Reset password', noindex: true } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },
  {
    path: 'set-password',
    loadComponent: () =>
      import('./pages/auth/set-password-page.component').then((m) => m.SetPasswordPageComponent),
    data: {
      seo: { title: 'Set password', noindex: true } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth/oauth-callback-page.component').then(
        (m) => m.OAuthCallbackPageComponent
      ),
    data: {
      seo: { title: 'Signing in', noindex: true } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },

  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/privacy-policy-page/privacy-policy-page.component').then(
        (m) => m.PrivacyPolicyPageComponent
      ),
    data: {
      seo: {
        title: 'Privacy policy',
        description: 'How Snippy collects, uses, and protects your data.',
      } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/terms-page/terms-page.component').then((m) => m.TermsPageComponent),
    data: {
      seo: {
        title: 'Terms of service',
        description: 'The terms for using Snippy.',
      } satisfies SeoData,
      header: 'landing' satisfies HeaderMode,
    },
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/user-home-page/user-home-page.component').then(
        (m) => m.UserHomePageComponent
      ),
    canActivate: [authGuard],
    data: {
      seo: { title: 'Your snippets', noindex: true } satisfies SeoData,
      header: 'feed' satisfies HeaderMode,
    },
  },
  {
    path: 'following',
    loadComponent: () =>
      import('./pages/snippet-feed-page/snippet-feed-page.component').then(
        (m) => m.SnippetFeedPageComponent
      ),
    canActivate: [authGuard],
    data: {
      seo: { title: 'Following', noindex: true } satisfies SeoData,
      header: 'feed' satisfies HeaderMode,
      feed: 'following' satisfies SnippetFeed,
    },
  },
  {
    path: 'public',
    loadComponent: () =>
      import('./pages/snippet-feed-page/snippet-feed-page.component').then(
        (m) => m.SnippetFeedPageComponent
      ),
    data: {
      seo: {
        title: 'Public snippets',
        description: 'Browse public HTML, CSS, and JavaScript snippets from the Snippy community.',
      } satisfies SeoData,
      header: 'feed' satisfies HeaderMode,
      feed: 'public' satisfies SnippetFeed,
    },
  },
  {
    path: 'tags/:tag',
    loadComponent: () =>
      import('./pages/snippet-feed-page/snippet-feed-page.component').then(
        (m) => m.SnippetFeedPageComponent
      ),
    data: {
      seo: { title: 'Tagged snippets' } satisfies SeoData,
      header: 'feed' satisfies HeaderMode,
      feed: 'tag' satisfies SnippetFeed,
    },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings-page/settings-page.component').then((m) => m.SettingsPageComponent),
    canActivate: [authGuard],
    data: {
      seo: { title: 'Settings', noindex: true } satisfies SeoData,
      header: 'feed' satisfies HeaderMode,
    },
  },
  {
    path: 'collections/:shortId',
    loadComponent: () =>
      import('./pages/collection-detail-page/collection-detail-page.component').then(
        (m) => m.CollectionDetailPageComponent
      ),
    data: { seo: { title: 'Collection' } satisfies SeoData, header: 'feed' satisfies HeaderMode },
  },
  {
    path: 'embed/:shortId',
    loadComponent: () =>
      import('./pages/embed-player-page/embed-player-page.component').then(
        (m) => m.EmbedPlayerPageComponent
      ),
    data: {
      seo: { title: 'Embedded snippet', noindex: true } satisfies SeoData,
      header: 'embed' satisfies HeaderMode,
    },
  },
  {
    path: 's/:token',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canDeactivate: [unsavedChangesGuard],
    data: {
      seo: { title: 'Shared snippet', noindex: true } satisfies SeoData,
      header: 'editor' satisfies HeaderMode,
      share: true,
    },
  },
  {
    path: 'try',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canDeactivate: [unsavedChangesGuard],
    data: {
      seo: {
        title: 'Try Snippy',
        description:
          'Try the Snippy playground without an account: edit HTML, CSS, and JavaScript with a live preview.',
      } satisfies SeoData,
      header: 'editor' satisfies HeaderMode,
      guest: true,
    },
  },
  {
    path: 'snippet',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      seo: { title: 'New snippet', noindex: true } satisfies SeoData,
      header: 'editor' satisfies HeaderMode,
    },
  },
  {
    path: ':username/snippet/:id',
    loadComponent: () =>
      import('./pages/snippet-web-view/snippet-web-view.component').then(
        (m) => m.SnippetWebViewComponent
      ),
    canDeactivate: [unsavedChangesGuard],
    data: {
      seo: { title: 'Snippet', type: 'article' } satisfies SeoData,
      header: 'editor' satisfies HeaderMode,
    },
  },
  {
    path: ':username/fullpage/:id',
    loadComponent: () =>
      import('./pages/fullpage-view/fullpage-view.component').then((m) => m.FullpageViewComponent),
    data: {
      seo: { title: 'Full page preview', noindex: true } satisfies SeoData,
      header: 'minimal' satisfies HeaderMode,
    },
  },
  {
    path: ':username',
    loadComponent: () =>
      import('./pages/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
    data: {
      seo: { title: 'Profile', type: 'profile' } satisfies SeoData,
      header: 'feed' satisfies HeaderMode,
    },
  },

  { path: '**', redirectTo: '' },
];
