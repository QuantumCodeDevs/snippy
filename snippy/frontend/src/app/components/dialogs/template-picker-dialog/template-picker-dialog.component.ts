import { Component, inject, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  SNIPPET_TEMPLATES,
  SnippetTemplate,
  templateById,
  templateFromSnippet,
  templateLanguages,
} from '@app/editor/snippet-templates';
import type { SnippetList } from '@app/models/base-models/snippet-list';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { formatSavedAgo } from '@app/components/ui/save-status/save-status.component';

const SEARCH_THRESHOLD = 6;

/**
 * "Start a new snippet" picker: built-in starters plus the signed-in user's
 * snippets marked "Use as template". Closes with the chosen template, or null.
 */
@Component({
  selector: 'app-template-picker-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-picker-dialog.component.html',
  styleUrl: './template-picker-dialog.component.scss',
})
export class TemplatePickerDialogComponent {
  dialogRef = inject(MatDialogRef<TemplatePickerDialogComponent, SnippetTemplate | null>);
  private api = inject(SnippyApi);

  readonly starters = SNIPPET_TEMPLATES;
  readonly query = signal('');
  readonly userTemplates = signal<SnippetList[]>([]);
  readonly loadingUser = signal(true);
  readonly userError = signal<string | null>(null);
  /** shortId of the user template whose files are loading. */
  readonly opening = signal<string | null>(null);
  readonly openError = signal<string | null>(null);

  readonly showSearch = computed(
    () => this.starters.length + this.userTemplates().length > SEARCH_THRESHOLD
  );

  readonly visibleStarters = computed(() =>
    this.starters.filter((t) => this.matches(t.name, t.description))
  );

  readonly visibleUser = computed(() =>
    this.userTemplates().filter((t) =>
      this.matches(t.name ?? '', t.description ?? '', ...(t.tags ?? []))
    )
  );

  private readonly now = new Date();

  constructor() {
    void this.loadUserTemplates();
  }

  async loadUserTemplates() {
    this.loadingUser.set(true);
    this.userError.set(null);
    try {
      this.userTemplates.set(await this.api.getMyTemplates());
    } catch {
      this.userError.set('Could not load your templates.');
    } finally {
      this.loadingUser.set(false);
    }
  }

  languages(tpl: SnippetTemplate): string[] {
    return templateLanguages(tpl);
  }

  updatedLabel(item: SnippetList): string {
    return item.updatedAt ? `Updated ${formatSavedAgo(new Date(item.updatedAt), this.now)}` : '';
  }

  pickStarter(tpl: SnippetTemplate) {
    if (this.opening()) return;
    this.dialogRef.close(tpl);
  }

  /** Fetch the template's files, then close with a copy of them. */
  async pickUser(item: SnippetList) {
    if (!item.shortId || this.opening()) return;
    this.opening.set(item.shortId);
    this.openError.set(null);
    try {
      const snippet = await this.api.getSnippetByShortId(item.shortId);
      this.dialogRef.close(templateFromSnippet(snippet));
    } catch {
      this.openError.set(`Could not open “${item.name}”. Try again.`);
    } finally {
      this.opening.set(null);
    }
  }

  startBlank() {
    this.dialogRef.close(templateById('blank'));
  }

  private matches(...fields: string[]): boolean {
    const q = this.query().trim().toLowerCase();
    if (!q) return true;
    return fields.some((f) => f.toLowerCase().includes(q));
  }
}
