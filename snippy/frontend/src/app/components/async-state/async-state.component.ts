import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-async-state',
  imports: [MatProgressSpinnerModule, MatIconModule],
  templateUrl: './async-state.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class AsyncStateComponent {
  @Input() loading = false;
  @Input() loadingText = 'Loading…';
  @Input() empty = false;
  @Input() emptyIcon = 'inbox';
  @Input() emptyText = 'Nothing here yet.';
  @Input() error: string | null = null;
  @Input() errorIcon = 'error_outline';
  @Input() spinnerOnly = false;
  @Input() diameter = 40;
}
