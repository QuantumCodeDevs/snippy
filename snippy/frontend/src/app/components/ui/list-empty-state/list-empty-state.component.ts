import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Placeholder shown inside a list grid when there are no results. */
@Component({
  selector: 'app-list-empty-state',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="col-span-full flex flex-col items-center gap-2 p-12 text-muted">
      <mat-icon>{{ icon }}</mat-icon>
      <p>{{ message }}</p>
    </div>
  `,
})
export class ListEmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() message = 'Nothing here yet';
}
