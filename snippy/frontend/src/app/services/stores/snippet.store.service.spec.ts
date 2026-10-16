import { TestBed } from '@angular/core/testing';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import type { Snippet } from '@app/models/base-models/snippet';

function savedSnippet(overrides: Partial<Snippet> = {}): Snippet {
  return {
    snippetId: 'id1',
    shortId: 'abc1234',
    name: 'Card',
    description: '',
    isPrivate: false,
    isTemplate: false,
    isOwner: true,
    tags: [],
    cdnResources: [],
    updatedAt: '2026-10-15T10:00:00Z',
    snippetFiles: [
      { snippetFileID: 'f1', fileType: 'html', content: '<p>a</p>' },
      { snippetFileID: 'f2', fileType: 'css', content: '' },
      { snippetFileID: 'f3', fileType: 'js', content: '' },
    ],
    ...overrides,
  };
}

describe('SnippetStoreService', () => {
  let store: SnippetStoreService;
  const api = {
    updateSnippet: vi.fn(),
    createSnippet: vi.fn(),
    setSnippetTemplate: vi.fn(),
  };

  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: SnippyApi, useValue: api }] });
    store = TestBed.inject(SnippetStoreService);
  });

  it('records the server update time as last saved when a snippet loads', () => {
    store.setSnippet(savedSnippet());
    expect(store.lastSavedAt()?.toISOString()).toBe('2026-10-15T10:00:00.000Z');
    store.setSnippet(savedSnippet({ snippetId: null }));
    expect(store.lastSavedAt()).toBeNull();
  });

  it('treats toggling "Use as template" as an unsaved change', () => {
    store.setSnippet(savedSnippet());
    expect(store.isDirty()).toBe(false);
    store.updateSnippetSettings({ description: '', isPrivate: false, tags: [], isTemplate: true });
    expect(store.isDirty()).toBe(true);
  });

  it('sends isTemplate on save and stamps lastSavedAt / lastSaveWasAuto', async () => {
    store.setSnippet(savedSnippet({ isTemplate: true }));
    store.updateSnippetFile('html', '<p>b</p>');
    api.updateSnippet.mockImplementation(async (_id: string, body: Snippet) =>
      savedSnippet({ isTemplate: !!body.isTemplate, snippetFiles: body.snippetFiles })
    );

    await store.saveSnippet({ auto: true });

    expect(api.updateSnippet.mock.calls[0][1].isTemplate).toBe(true);
    expect(store.isDirty()).toBe(false);
    expect(store.lastSaveWasAuto()).toBe(true);
    expect(Date.now() - store.lastSavedAt()!.getTime()).toBeLessThan(1000);
  });

  it('keeps edits typed while a save was in flight', async () => {
    store.setSnippet(savedSnippet());
    store.updateSnippetFile('html', '<p>sent</p>');

    let resolve!: (s: Snippet) => void;
    api.updateSnippet.mockReturnValue(new Promise<Snippet>((r) => (resolve = r)));
    const saving = store.saveSnippet();

    store.updateSnippetFile('html', '<p>typed during save</p>');
    resolve(
      savedSnippet({
        updatedAt: '2026-10-15T11:00:00Z',
        snippetFiles: [
          { snippetFileID: 'f1', fileType: 'html', content: '<p>sent</p>' },
          { snippetFileID: 'f2', fileType: 'css', content: '' },
          { snippetFileID: 'f3', fileType: 'js', content: '' },
        ],
      })
    );
    await saving;

    const html = store.snippet()!.snippetFiles!.find((f) => f.fileType === 'html')!;
    expect(html.content).toBe('<p>typed during save</p>');
    expect(html.snippetFileID).toBe('f1');
    expect(store.snippet()!.updatedAt).toBe('2026-10-15T11:00:00Z');
    expect(store.isDirty()).toBe(true);
  });

  it('setTemplate patches the open snippet and list rows without marking dirty', async () => {
    store.setSnippet(savedSnippet());
    store.snippetList.set({
      snippets: [{ snippetId: 'id1', name: 'Card' }, { snippetId: 'id2' }],
      totalCount: 2,
    });
    api.setSnippetTemplate.mockResolvedValue(undefined);

    await store.setTemplate('id1', true);

    expect(api.setSnippetTemplate).toHaveBeenCalledWith('id1', true);
    expect(store.snippet()!.isTemplate).toBe(true);
    expect(store.isDirty()).toBe(false);
    expect(store.snippetList()!.snippets.map((s) => !!s.isTemplate)).toEqual([true, false]);
  });

  it('clearSnippet resets save metadata', () => {
    store.setSnippet(savedSnippet());
    store.clearSnippet();
    expect(store.snippet()).toBeNull();
    expect(store.lastSavedAt()).toBeNull();
  });
});
