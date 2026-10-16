import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthLayoutComponent } from './auth-layout.component';
import { AuthStoreService } from '@app/services/stores/auth.store.service';

@Component({
  selector: 'app-set-password-page',
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
      <h1 class="text-2xl font-semibold text-bright">Set password</h1>
      <form class="mt-6 flex flex-col gap-3" (ngSubmit)="submit()">
        @if (!token) {
          <mat-form-field appearance="outline">
            <mat-label>Current password</mat-label>
            <input
              matInput
              type="password"
              name="oldPassword"
              [(ngModel)]="oldPassword"
              required
              autocomplete="current-password"
            />
          </mat-form-field>
        }
        <mat-form-field appearance="outline">
          <mat-label>New password</mat-label>
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
          [attr.aria-busy]="busy()"
        >
          @if (busy()) {
            <mat-spinner diameter="18" class="button-spinner" aria-hidden="true"></mat-spinner>
          }
          Save password
        </button>
      </form>
      <p class="mt-6 text-sm text-faint">
        <a routerLink="/settings" class="text-sky">Back to settings</a>
      </p>
    </app-auth-layout>
  `,
})
export class SetPasswordPageComponent {
  private auth = inject(AuthStoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  oldPassword = '';
  password = '';
  passwordConfirm = '';
  busy = signal(false);
  error = signal<string | null>(null);
  token = this.route.snapshot.queryParamMap.get('token') || '';

  async submit() {
    if (this.password !== this.passwordConfirm) {
      this.error.set('Passwords do not match');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.token) {
        await this.auth.confirmPasswordReset(this.token, this.password, this.passwordConfirm);
        await this.router.navigateByUrl('/login');
      } else {
        await this.auth.setPassword(this.oldPassword, this.password, this.passwordConfirm);
        await this.router.navigateByUrl('/settings');
      }
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      this.error.set(anyErr?.message || 'Could not set password');
    } finally {
      this.busy.set(false);
    }
  }
}
