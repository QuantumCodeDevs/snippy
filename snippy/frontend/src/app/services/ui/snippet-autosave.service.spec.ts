import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import {
  AUTOSAVE_DELAY_MS,
  AutosaveTimer,
  SnippetAutosaveService,
} from '@app/services/ui/snippet-autosave.service';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';
import type { Snippet } from '@app/models/base-models/snippet';

describe('AutosaveTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs once after the delay and ignores re-arming while pending', () => {
    const run = vi.fn();
    const timer = new AutosaveTimer(run, 1000);
    timer.arm();
    vi.advanceTimersByTime(600);
    timer.arm();
    vi.advanceTimersByTime(400);
    expect(run).toHaveBeenCalledTimes(1);
    expect(timer.pending).toBe(false);
  });

  it('cancel() stops a pending run', () => {
    const run = vi.fn();
    const timer = new AutosaveTimer(run, 1000);
    timer.arm();
    timer.cancel();
    vi.advanceTimersByTime(2000);
    expect(run).not.toHaveBeenCalled();
  });

  it('defaults to five minutes', () => {
    expect(AUTOSAVE_DELAY_MS).toBe(300_000);
  });
});

@Component({ selector: 'app-autosave-host', template: '' })
class AutosaveHostComponent {
  constructor() {
    inject(SnippetAutosaveService).watch();
  }
}

describe('SnippetAutosaveService', () => {
  const snippet = signal<Snippet | null>(null);
  const dirty = signal(false);
  const save = vi.fn();
  const guest = signal(false);

  beforeEach(() => {
    vi.useFakeTimers();
    snippet.set(null);
    dirty.set(false);
    guest.set(false);
    save.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: SnippetStoreService, useValue: { snippet, isDirty: dirty } },
        { provide: SnippetSaveUIService, useValue: { saveSnippetWithUI: save } },
        { provide: EditorUiService, useValue: { guestMode: guest } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function mount() {
    const fixture = TestBed.createComponent(AutosaveHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('is off until the snippet has been saved once', () => {
    const autosave = TestBed.inject(SnippetAutosaveService);
    snippet.set({ isOwner: true });
    expect(autosave.enabled()).toBe(false);
    snippet.set({ isOwner: true, snippetId: 'id1' });
    expect(autosave.enabled()).toBe(true);
    guest.set(true);
    expect(autosave.enabled()).toBe(false);
  });

  it('is off for snippets the user does not own', () => {
    const autosave = TestBed.inject(SnippetAutosaveService);
    snippet.set({ isOwner: false, snippetId: 'id1' });
    expect(autosave.enabled()).toBe(false);
  });

  it('saves quietly five minutes after the first unsaved change', async () => {
    const fixture = mount();
    snippet.set({ isOwner: true, snippetId: 'id1' });
    dirty.set(true);
    TestBed.tick();

    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][2]).toEqual({ quiet: true });
    fixture.destroy();
  });

  it('does not autosave an unsaved new snippet', () => {
    const fixture = mount();
    snippet.set({ isOwner: true });
    dirty.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2);
    expect(save).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('cancels the countdown when changes are saved manually', () => {
    const fixture = mount();
    snippet.set({ isOwner: true, snippetId: 'id1' });
    dirty.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS / 2);
    dirty.set(false);
    TestBed.tick();
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
    expect(save).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('stops when the editor page is destroyed', () => {
    const fixture = mount();
    snippet.set({ isOwner: true, snippetId: 'id1' });
    dirty.set(true);
    TestBed.tick();
    fixture.destroy();
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2);
    expect(save).not.toHaveBeenCalled();
  });
});
