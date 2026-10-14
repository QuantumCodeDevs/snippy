import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * "forked from: <parent> by @<owner>" line shown on snippet cards and in the
 * editor header. Renders nothing when the snippet is not a fork.
 */
@Component({
  selector: 'app-fork-attribution',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (parentShortId) {
      <span class="text-sm text-muted flex flex-col">
        @if (parentDeleted) {
          <div class="flex items-center gap-1">
            <span>Forked From:</span>
            <span>{{ parentName || parentShortId }}</span>
            <span class="text-xs text-faint">(parent deleted)</span>
          </div>
          @if (parentUserName) {
            <div class="flex items-center gap-1">
              <span>By:</span>
              <a
                class="text-link-accent no-underline hover:underline"
                [routerLink]="['/', parentUserName]"
                (click)="$event.stopPropagation()"
                >&#64;{{ parentUserName }}</a
              >
            </div>
          }
        } @else if (parentUserName) {
          <div class="flex items-center gap-1">
            <span>Forked From:</span>
            <a
              class="text-link-accent no-underline hover:underline"
              [routerLink]="['/', parentUserName, 'snippet', parentShortId]"
              (click)="$event.stopPropagation()"
              >{{ parentName || parentShortId }}</a
            >
          </div>
          <div class="flex items-center gap-1">
            <span>By:</span>
            <a
              class="text-link-accent no-underline hover:underline"
              [routerLink]="['/', parentUserName]"
              (click)="$event.stopPropagation()"
              >&#64;{{ parentUserName }}</a
            >
          </div>
        } @else {
          {{ parentName || parentShortId }}
        }
      </span>
    }
  `,
})
export class ForkAttributionComponent {
  @Input() parentShortId: string | null | undefined;
  @Input() parentName: string | null | undefined;
  @Input() parentUserName: string | null | undefined;
  @Input() parentDeleted = false;
}
