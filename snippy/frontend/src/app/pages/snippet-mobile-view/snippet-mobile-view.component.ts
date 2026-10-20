import {
  ChangeDetectionStrategy,
  Component,
  afterRenderEffect,
  inject,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { EditorInsertService } from '@app/services/ui/editor-insert.service';
import {
  MOBILE_PANES,
  MobilePane,
  FocusablePane,
  EditorUiService,
} from '@app/services/ui/editor-ui.service';

const PANE_LABELS: Record<MobilePane, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JS',
  result: 'Result',
};

/**
 * Phone editor. The parent projects the three code panes and the preview so
 * preview updates and CodeMirror stay on the route component.
 */
@Component({
  selector: 'app-snippet-mobile-view',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './snippet-mobile-view.component.html',
  styleUrl: './snippet-mobile-view.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SnippetMobileViewComponent {
  readonly editorUi = inject(EditorUiService);
  private editors = inject(EditorInsertService);

  readonly panes = MOBILE_PANES;
  readonly labels = PANE_LABELS;

  constructor() {
    afterRenderEffect(() => {
      const pane = this.editorUi.activePane();
      const pending = this.editorUi.pendingFocus();
      this.editors.view(pane)?.requestMeasure();
      if (pending && pending === pane && this.editors.focus(pending)) {
        untracked(() => this.editorUi.clearPendingFocus());
      }
    });
  }

  select(pane: FocusablePane) {
    this.editorUi.showPane(pane);
  }

  /** Keep the menu open so more than one pane can be toggled. */
  toggle(pane: MobilePane, event: Event) {
    event.stopPropagation();
    this.editorUi.togglePane(pane);
  }

  onlyEnabled(pane: MobilePane): boolean {
    if (pane === 'result') return false;
    return this.editorUi.visiblePanes().length === 1 && this.editorUi.panes()[pane];
  }

  onTabKeydown(event: KeyboardEvent, pane: FocusablePane) {
    const visible = this.editorUi.visiblePanes();
    const index = visible.indexOf(pane);
    if (index < 0 || visible.length === 0) return;

    let next = index;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % visible.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + visible.length) % visible.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = visible.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.select(visible[next]);
    const tab = document.getElementById(`mobile-tab-${visible[next]}`);
    tab?.focus();
  }
}
