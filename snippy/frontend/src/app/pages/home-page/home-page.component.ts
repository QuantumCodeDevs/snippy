import { Component, DOCUMENT, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { Router, RouterLink } from '@angular/router';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home-page',
  imports: [MatButton, MatAnchor, MatIconModule, RouterLink],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class HomePageComponent {
  private router = inject(Router);

  get user() {
    return this.authStoreService.user;
  }

  document = inject(DOCUMENT);
  private authStoreService = inject(AuthStoreService);

  constructor() {
    effect(() => {
      if (this.authStoreService.isAuthenticated()) {
        void this.router.navigateByUrl('/home');
      }
    });
  }

  login() {
    void this.router.navigate(['/login'], { queryParams: { redirect: '/home' } });
  }
}
