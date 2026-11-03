import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideDialogDefaults } from '@app/services/ui/dialog.service';
import { AuthStoreService } from '@app/services/stores/auth.store.service';

/**
 * The session cookie is HttpOnly, so the SPA asks PocketBase who is signed in
 * before the first route (and its guards) run. Third-party embeds never carry
 * the SameSite=Strict cookie, so they skip the round trip.
 */
function restoreSession() {
  const auth = inject(AuthStoreService);
  if (location.pathname.startsWith('/embed/')) return;
  return auth.refreshSession();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    provideDialogDefaults(),
    provideAppInitializer(restoreSession),
  ],
};
