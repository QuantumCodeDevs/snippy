import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { SnippetAutosaveService } from '@app/services/ui/snippet-autosave.service';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';

/** "just now", "4 min ago", "2 h ago", then a short date. */
export function formatSavedAgo(saved: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - saved.getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return saved.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Full timestamp for the tooltip, e.g. "Oct 15, 2026, 3:41 PM". */
export function formatSavedExact(saved: Date): string {
  return saved.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Editor header status: saving spinner, unsaved marker, and the last saved
 * time (relative, refreshed every 30s, exact time in the tooltip).
 */
@Component({
  selector: 'app-save-status',
  imports: [MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="save-status"
      role="status"
      aria-live="polite"
      [class.save-status--dirty]="dirty() && !saving()"
      [matTooltip]="tooltip()"
    >
      @if (saving()) {
        <mat-spinner diameter="14" aria-hidden="true"></mat-spinner>
        <span>Saving…</span>
      } @else if (dirty()) {
        <span class="save-status__dot" aria-hidden="true"></span>
        <span>
          Unsaved changes
          @if (lastSaved(); as saved) {
            <span class="save-status__meta">· saved {{ ago() }}</span>
          }
        </span>
      } @else if (lastSaved()) {
        <mat-icon class="save-status__icon" aria-hidden="true">{{
          wasAuto() ? 'cloud_sync' : 'cloud_done'
        }}</mat-icon>
        <span>{{ wasAuto() ? 'Autosaved' : 'Saved' }} {{ ago() }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      min-width: 0;
    }
    .save-status {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-width: 0;
      white-space: nowrap;
      font-size: 0.75rem;
      color: var(--text-faint);
    }
    .save-status--dirty {
      color: var(--text-warning);
    }
    .save-status__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: currentColor;
      flex: none;
    }
    .save-status__meta {
      color: var(--text-faint);
    }
    .save-status__icon {
      width: 1rem;
      height: 1rem;
      font-size: 1rem;
    }
    @media (max-width: 640px) {
      .save-status__meta {
        display: none;
      }
    }
  `,
})
export class SaveStatusComponent {
  private store = inject(SnippetStoreService);
  private saveUi = inject(SnippetSaveUIService);
  private autosave = inject(SnippetAutosaveService);

  private now = signal(new Date());

  readonly saving = this.saveUi.saving;
  readonly dirty = this.store.isDirty;
  readonly lastSaved = this.store.lastSavedAt;
  readonly wasAuto = this.store.lastSaveWasAuto;

  readonly ago = computed(() => {
    const saved = this.lastSaved();
    return saved ? formatSavedAgo(saved, this.now()) : '';
  });

  readonly tooltip = computed(() => {
    const saved = this.lastSaved();
    const parts: string[] = [];
    if (saved) parts.push(`Last saved ${formatSavedExact(saved)}`);
    parts.push(
      this.autosave.enabled()
        ? 'Autosave is on: changes save every 5 minutes'
        : 'Autosave starts after the first save'
    );
    return parts.join('. ');
  });

  constructor() {
    const id = setInterval(() => this.now.set(new Date()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
