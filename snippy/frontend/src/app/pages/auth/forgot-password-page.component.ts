import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthLayoutComponent } from './auth-layout.component';
import { AuthStoreService } from '@app/services/stores/auth.store.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    AuthLayoutComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h1 class="text-2xl font-semibold text-bright">Forgot password</h1>
      @if (auth.smtpEnabled() === false) {
        <p class="mt-3 text-sm text-muted">
          This instance does not send email. Ask the operator to set a new password in the
          <a class="text-sky" href="/_/" target="_blank" rel="noopener">Admin UI</a>
          (Users → set password) or with
          <code class="text-ink">scripts/reset-user-password.sh</code>.
        </p>
      } @else if (sent()) {
        <p class="mt-6 text-sm text-muted">
          If an account exists for that address, a reset email is on its way.
        </p>
      } @else if (auth.smtpEnabled() === true) {
        <p class="mt-1 text-sm text-faint">We'll email a reset link to your account.</p>
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
          @if (error()) {
            <p class="auth-error" role="alert">{{ error() }}</p>
          }
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="busy()"
            [attr.aria-busy]="busy()"
          >
            @if (busy()) {
              <mat-spinner diameter="18" class="button-spinner" aria-hidden="true"></mat-spinner>
            }
            Send reset link
          </button>
        </form>
      } @else {
        <p class="mt-3 text-sm text-faint">Checking mail settings…</p>
      }
      <p class="mt-6 text-sm text-faint">
        <a routerLink="/login" class="text-sky">Back to login</a>
      </p>
    </app-auth-layout>
  `,
})
export class ForgotPasswordPageComponent {
  auth = inject(AuthStoreService);
  email = '';
  busy = signal(false);
  sent = signal(false);
  error = signal<string | null>(null);

  async submit() {
    if (this.auth.smtpEnabled() !== true) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.requestPasswordReset(this.email.trim());
      this.sent.set(true);
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      this.error.set(anyErr?.message || 'Could not send reset email');
    } finally {
      this.busy.set(false);
    }
  }
}
