import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthLayoutComponent } from './auth-layout.component';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { authErrorMessage } from './auth-errors';

@Component({
  selector: 'app-login-page',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    AuthLayoutComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h1 class="text-2xl font-semibold text-bright">Log in</h1>
      <p class="mt-1 text-sm text-faint">Email and password, or a connected provider.</p>
      <form class="mt-6 flex flex-col gap-3" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input
            matInput
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            autocomplete="email"
          />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input
            matInput
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
          />
        </mat-form-field>
        @if (error()) {
          <p class="auth-error" role="alert">{{ error() }}</p>
        }
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="busy()"
          [attr.aria-busy]="pending() === 'password'"
        >
          @if (pending() === 'password') {
            <mat-spinner diameter="18" class="button-spinner" aria-hidden="true"></mat-spinner>
            Logging in…
          } @else {
            Log in
          }
        </button>
      </form>
      @if (auth.oauthProviders().length) {
        <div class="mt-4 flex flex-col gap-2">
          @for (p of auth.oauthProviders(); track p.name) {
            <button
              mat-stroked-button
              type="button"
              [disabled]="busy()"
              [attr.aria-busy]="pending() === p.name"
              (click)="oauth(p.name)"
            >
              @if (pending() === p.name) {
                <mat-spinner diameter="18" class="button-spinner" aria-hidden="true"></mat-spinner>
                Waiting for {{ p.displayName }}…
              } @else {
                Continue with {{ p.displayName }}
              }
            </button>
          }
          @if (pending() && pending() !== 'password') {
            <p class="auth-pending" role="status">
              Finish signing in in the popup window.
              <button type="button" class="auth-cancel" (click)="cancelOauth()">Cancel</button>
            </p>
          }
        </div>
      }
      <p class="mt-6 text-sm text-faint">
        <a routerLink="/forgot-password" class="text-sky">Forgot password?</a>
      </p>
      <p class="mt-2 text-sm text-faint">
        No account?
        <a routerLink="/create-account" [queryParams]="redirectParams" class="text-sky"
          >Create one</a
        >
      </p>
    </app-auth-layout>
  `,
})
export class LoginPageComponent {
  auth = inject(AuthStoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  /** `'password'`, a provider name, or null. Drives the button spinners. */
  pending = signal<string | null>(null);
  busy = computed(() => this.pending() !== null);
  error = signal<string | null>(null);

  get redirectParams() {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    return redirect ? { redirect } : {};
  }

  private destination() {
    return this.route.snapshot.queryParamMap.get('redirect') || '/home';
  }

  async submit() {
    this.pending.set('password');
    this.error.set(null);
    try {
      await this.auth.login(this.email.trim(), this.password);
      await this.router.navigateByUrl(this.destination());
    } catch (err: unknown) {
      this.error.set(authErrorMessage(err, 'Could not log in'));
    } finally {
      this.pending.set(null);
    }
  }

  async oauth(provider: string) {
    this.pending.set(provider);
    this.error.set(null);
    try {
      await this.auth.loginWithProvider(provider);
      await this.router.navigateByUrl(this.destination());
    } catch (err: unknown) {
      this.error.set(authErrorMessage(err, 'Could not sign in with that provider'));
    } finally {
      this.pending.set(null);
    }
  }

  cancelOauth() {
    this.auth.cancelProviderLogin();
  }
}
