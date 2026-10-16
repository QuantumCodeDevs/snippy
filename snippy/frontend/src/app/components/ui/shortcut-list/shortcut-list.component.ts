import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  CODE_PANE_SHORTCUTS,
  KeyCombo,
  SHORTCUTS,
  ShortcutGroup,
  formatCombo,
  isApplePlatform,
} from '@app/shortcuts/keyboard-shortcuts';

interface ShortcutRow {
  label: string;
  combos: string[];
  note?: string;
}

interface ShortcutSection {
  title: ShortcutGroup;
  rows: ShortcutRow[];
}

/** Grouped, readable table of every shortcut. Shared by the dialog and settings. */
@Component({
  selector: 'app-shortcut-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shortcut-list">
      @for (section of sections; track section.title) {
        <section class="shortcut-list__section" [attr.aria-labelledby]="'sc-' + $index">
          <h3 class="shortcut-list__title" [id]="'sc-' + $index">{{ section.title }}</h3>
          <dl class="shortcut-list__rows">
            @for (row of section.rows; track row.label) {
              <div class="shortcut-list__row">
                <dt>
                  {{ row.label }}
                  @if (row.note) {
                    <span class="shortcut-list__note">{{ row.note }}</span>
                  }
                </dt>
                <dd>
                  @for (combo of row.combos; track combo; let last = $last) {
                    <kbd class="kbd">{{ combo }}</kbd>
                    @if (!last) {
                      <span class="shortcut-list__or">or</span>
                    }
                  }
                </dd>
              </div>
            }
          </dl>
        </section>
      }
    </div>
  `,
  styles: `
    .shortcut-list {
      display: grid;
      gap: var(--space-lg, 1.25rem);
    }
    .shortcut-list__title {
      margin: 0 0 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-faint);
    }
    .shortcut-list__rows {
      margin: 0;
      display: grid;
    }
    .shortcut-list__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--hairline);
    }
    .shortcut-list__row:last-child {
      border-bottom: none;
    }
    dt {
      color: var(--text-primary);
      font-size: 0.875rem;
    }
    dd {
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
      gap: 0.25rem;
    }
    .shortcut-list__note {
      display: block;
      font-size: 0.75rem;
      color: var(--text-faint);
    }
    .shortcut-list__or {
      font-size: 0.75rem;
      color: var(--text-faint);
    }
  `,
})
export class ShortcutListComponent {
  private readonly apple = isApplePlatform();

  readonly sections: ShortcutSection[] = this.buildSections();

  private format(combos: KeyCombo[]): string[] {
    return combos.map((c) => formatCombo(c, this.apple));
  }

  private buildSections(): ShortcutSection[] {
    const groups: ShortcutGroup[] = ['General', 'Snippet editor'];
    const sections: ShortcutSection[] = groups.map((title) => ({
      title,
      rows: SHORTCUTS.filter((s) => s.group === title).map((s) => ({
        label: s.label,
        combos: this.format(s.combos),
        note: s.note,
      })),
    }));
    sections.push({
      title: 'Code panes',
      rows: CODE_PANE_SHORTCUTS.map((s) => ({ label: s.label, combos: this.format(s.combos) })),
    });
    return sections;
  }
}
