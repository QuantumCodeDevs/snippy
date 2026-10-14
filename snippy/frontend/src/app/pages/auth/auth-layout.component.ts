import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-shell flex min-h-[70vh] items-center justify-center py-10">
      <div class="panel w-full max-w-md p-8">
        <a routerLink="/" class="brand-mark mb-6 inline-flex">
          <span class="brand-star" aria-hidden="true">✦</span>
          Snippy
        </a>
        <ng-content />
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
