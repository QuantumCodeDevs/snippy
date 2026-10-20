import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PaneLang = 'html' | 'css' | 'js';

@Component({
  selector: 'app-pane-lang-label',
  templateUrl: './pane-lang-label.component.html',
  styleUrl: './pane-lang-label.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaneLangLabelComponent {
  readonly type = input.required<PaneLang>();
  /** Narrow gutter tab: drop the toolbar padding and inherit the gutter ink. */
  readonly gutter = input(false);
  /** Side-by-side editors: the name reads downward in the vertical gutter. */
  readonly vertical = input(false);

  readonly shortName = computed(() => (this.type() === 'js' ? 'JS' : this.type().toUpperCase()));
}
