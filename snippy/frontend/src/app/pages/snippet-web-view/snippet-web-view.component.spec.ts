import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { Snippet } from '@app/models/base-models/snippet';
import { SnippetWebViewComponent } from '@app/pages/snippet-web-view/snippet-web-view.component';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';

function savedPen(shortId: string, html: string): Snippet {
  return {
    snippetId: `id-${shortId}`,
    shortId,
    name: 'Pen',
    description: '',
    tags: [],
    isPrivate: false,
    isOwner: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    snippetFiles: [
      { fileType: 'html', content: html },
      { fileType: 'css', content: '' },
      { fileType: 'js', content: '' },
    ],
    cdnResources: [],
  } as Snippet;
}

describe('SnippetWebViewComponent', () => {
  let component: SnippetWebViewComponent;
  let fixture: ComponentFixture<SnippetWebViewComponent>;
  let store: SnippetStoreService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SnippetWebViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SnippetWebViewComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(SnippetStoreService);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('drops the draft when edits are undone back to the saved copy', () => {
    store.setSnippet(savedPen('abc', '<p>saved</p>'));
    TestBed.tick();
    store.updateSnippetFile('html', '<p>saved</p>x');
    TestBed.tick();
    expect(store.isDirty()).toBe(true);
    localStorage.setItem('snippy.draft.abc', JSON.stringify({ updatedAt: 'now' }));

    store.updateSnippetFile('html', '<p>saved</p>');
    TestBed.tick();
    expect(store.isDirty()).toBe(false);
    expect(localStorage.getItem('snippy.draft.abc')).toBeNull();
  });

  it("keeps another pen's draft when switching away from a dirty pen", () => {
    store.setSnippet(savedPen('abc', 'a'));
    TestBed.tick();
    store.updateSnippetFile('html', 'a changed');
    TestBed.tick();
    localStorage.setItem('snippy.draft.xyz', JSON.stringify({ updatedAt: 'later' }));

    store.setSnippet(savedPen('xyz', 'b'));
    TestBed.tick();
    expect(localStorage.getItem('snippy.draft.xyz')).not.toBeNull();
  });
});
