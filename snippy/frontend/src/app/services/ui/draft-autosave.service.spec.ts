import { TestBed } from '@angular/core/testing';
import {
  DRAFT_NEW_KEY,
  DRAFT_TRY_KEY,
  DraftAutosaveService,
} from '@app/services/ui/draft-autosave.service';

describe('DraftAutosaveService', () => {
  let drafts: DraftAutosaveService;

  beforeEach(() => {
    localStorage.clear();
    drafts = TestBed.inject(DraftAutosaveService);
  });

  it('keyFor separates guest, unsaved new, and saved snippets', () => {
    expect(drafts.keyFor({ guest: true, shortId: 'abc' })).toBe(DRAFT_TRY_KEY);
    expect(drafts.keyFor({ guest: false })).toBe(DRAFT_NEW_KEY);
    expect(drafts.keyFor({ guest: false, shortId: '  ' })).toBe(DRAFT_NEW_KEY);
    expect(drafts.keyFor({ guest: false, shortId: 'abc' })).toBe('snippy.draft.abc');
  });

  it('round-trips a snippet draft', () => {
    drafts.persistFromSnippet('k', {
      name: 'Draft',
      snippetFiles: [{ fileType: 'html', content: '<p>x</p>' }],
    });
    const read = drafts.read('k');
    expect(read?.name).toBe('Draft');
    expect(read?.snippetFiles?.[0].content).toBe('<p>x</p>');
  });

  it('refuses drafts over the size cap and ignores corrupt JSON', () => {
    expect(drafts.write('big', { updatedAt: 'now', name: 'x'.repeat(500_000) })).toBe(false);
    localStorage.setItem('bad', '{not json');
    expect(drafts.read('bad')).toBeNull();
  });

  it('restores only drafts newer than the server copy', () => {
    const draft = { updatedAt: '2026-10-15T12:00:00Z' };
    expect(drafts.shouldRestore(draft, '2026-10-15T11:00:00Z')).toBe(true);
    expect(drafts.shouldRestore(draft, '2026-10-15T13:00:00Z')).toBe(false);
    expect(drafts.shouldRestore(draft, null)).toBe(true);
  });

  it('promotes guest work to the signed-in new-snippet draft', () => {
    drafts.write(DRAFT_TRY_KEY, { updatedAt: 'now', name: 'From try' });
    drafts.promoteTryToNew();
    expect(drafts.read(DRAFT_TRY_KEY)).toBeNull();
    expect(drafts.read(DRAFT_NEW_KEY)?.name).toBe('From try');
  });
});
