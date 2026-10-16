import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SaveStatusComponent,
  formatSavedAgo,
} from '@app/components/ui/save-status/save-status.component';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { SnippetAutosaveService } from '@app/services/ui/snippet-autosave.service';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';

describe('formatSavedAgo', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  const ago = (ms: number) => formatSavedAgo(new Date(now.getTime() - ms), now);

  it('uses friendly relative wording', () => {
    expect(ago(10_000)).toBe('just now');
    expect(ago(4 * 60_000)).toBe('4 min ago');
    expect(ago(2 * 3_600_000)).toBe('2 h ago');
  });

  it('never reports a future time', () => {
    expect(ago(-30_000)).toBe('just now');
  });

  it('falls back to a short date after a day', () => {
    expect(ago(3 * 86_400_000)).not.toMatch(/ago/);
  });
});

describe('SaveStatusComponent', () => {
  const saving = signal(false);
  const dirty = signal(false);
  const lastSavedAt = signal<Date | null>(null);
  const lastSaveWasAuto = signal(false);
  const enabled = signal(true);

  beforeEach(() => {
    saving.set(false);
    dirty.set(false);
    lastSavedAt.set(null);
    lastSaveWasAuto.set(false);
    TestBed.configureTestingModule({
      imports: [SaveStatusComponent],
      providers: [
        { provide: SnippetSaveUIService, useValue: { saving } },
        {
          provide: SnippetStoreService,
          useValue: { isDirty: dirty, lastSavedAt, lastSaveWasAuto },
        },
        { provide: SnippetAutosaveService, useValue: { enabled } },
      ],
    });
  });

  /** Text a screen reader would read (decorative icons are aria-hidden). */
  function text() {
    const fixture = TestBed.createComponent(SaveStatusComponent);
    fixture.detectChanges();
    const root = (fixture.nativeElement as HTMLElement).cloneNode(true) as HTMLElement;
    root.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    return root.textContent!.replace(/\s+/g, ' ').trim();
  }

  it('is a polite live region', () => {
    const fixture = TestBed.createComponent(SaveStatusComponent);
    fixture.detectChanges();
    const status = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it('shows the last save time', () => {
    lastSavedAt.set(new Date());
    expect(text()).toBe('Saved just now');
  });

  it('distinguishes autosaves', () => {
    lastSavedAt.set(new Date());
    lastSaveWasAuto.set(true);
    expect(text()).toBe('Autosaved just now');
  });

  it('flags unsaved changes with the previous save time', () => {
    lastSavedAt.set(new Date());
    dirty.set(true);
    expect(text()).toBe('Unsaved changes · saved just now');
  });

  it('shows saving progress over everything else', () => {
    lastSavedAt.set(new Date());
    dirty.set(true);
    saving.set(true);
    expect(text()).toBe('Saving…');
  });

  it('renders nothing for a brand-new, untouched snippet', () => {
    expect(text()).toBe('');
  });
});
