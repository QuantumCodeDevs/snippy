import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '@app/services/ui/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button
      mat-icon-button
      type="button"
      class="theme-toggle"
      [attr.aria-label]="label()"
      [matTooltip]="hint()"
      (click)="themes.toggle()"
    >
      <mat-icon>{{ theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themes = inject(ThemeService);
  readonly theme = this.themes.theme;

  label(): string {
    return this.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  hint(): string {
    return this.theme() === 'dark' ? 'Light mode' : 'Dark mode';
  }
}
