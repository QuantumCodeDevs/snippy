// Auth guards for protecting routes based on authentication status.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PocketBaseService } from '@app/services/data/pocketbase.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const pb = inject(PocketBaseService).pb;
  const router = inject(Router);
  if (pb.authStore.isValid) return true;
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const pb = inject(PocketBaseService).pb;
  const router = inject(Router);
  if (pb.authStore.isValid) return router.createUrlTree(['/home']);
  return true;
};
