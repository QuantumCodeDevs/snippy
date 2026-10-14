import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthLayoutComponent } from './auth-layout.component';
import { PocketBaseService } from '@app/services/data/pocketbase.service';

@Component({
  selector: 'app-oauth-callback-page',
  imports: [AuthLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h1 class="text-2xl font-semibold text-bright">Signing in…</h1>
      <p class="mt-2 text-sm text-faint">Finishing the OAuth redirect.</p>
    </app-auth-layout>
  `,
})
export class OAuthCallbackPageComponent implements OnInit {
  private pb = inject(PocketBaseService).pb;
  private router = inject(Router);

  ngOnInit() {
    if (this.pb.authStore.isValid) {
      void this.router.navigateByUrl('/home');
      return;
    }
    void this.router.navigate(['/login']);
  }
}
