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
  selector: 'app-create-account-page',
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
      <h1 class="text-2xl font-semibold text-bright">Create account</h1>
      <p class="mt-1 text-sm text-faint">Email and password. Social sign-in is optional.</p>
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
            minlength="8"
            autocomplete="new-password"
          />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Confirm password</mat-label>
          <input
            matInput
            type="password"
            name="passwordConfirm"
            [(ngModel)]="passwordConfirm"
            required
            autocomplete="new-password"
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
            Creating account…
          } @else {
            Create account
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
        Already have an account?
        <a routerLink="/login" [queryParams]="redirectParams" class="text-sky">Log in</a>
      </p>
    </app-auth-layout>
  `,
})
export class CreateAccountPageComponent {
  auth = inject(AuthStoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  passwordConfirm = '';
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
    if (this.password !== this.passwordConfirm) {
      this.error.set('Passwords do not match');
      return;
    }
    this.pending.set('password');
    this.error.set(null);
    try {
      await this.auth.register(this.email.trim(), this.password, this.passwordConfirm);
      await this.router.navigateByUrl(this.destination());
    } catch (err: unknown) {
      this.error.set(authErrorMessage(err, 'Could not create account'));
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
      this.error.set(authErrorMessage(err, 'Could not sign in'));
    } finally {
      this.pending.set(null);
    }
  }

  cancelOauth() {
    this.auth.cancelProviderLogin();
  }
}
