import { TestBed } from '@angular/core/testing';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import JSZip from 'jszip';
import { baseEditorExtensions } from '@app/editor/codemirror-extensions';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import {
  EditorCommandsService,
  buildSnippetZip,
  safeFileName,
} from '@app/services/ui/editor-commands.service';
import { EditorInsertService } from '@app/services/ui/editor-insert.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  return new EditorView({
    state: EditorState.create({ doc, extensions: baseEditorExtensions() }),
    parent,
  });
}

describe('EditorCommandsService helpers', () => {
  it('safeFileName strips characters that are unsafe in file names', () => {
    expect(safeFileName('My card / v2?')).toBe('My_card_v2_');
    expect(safeFileName('')).toBe('snippet');
    expect(safeFileName(null)).toBe('snippet');
  });

  it('buildSnippetZip writes index, style, script, and CDN links', async () => {
    const blob = await buildSnippetZip({
      name: 'A <b> & c',
      description: 'desc',
      snippetFiles: [
        { fileType: 'html', content: '<p>Hi</p>' },
        { fileType: 'css', content: 'p{color:red}' },
        { fileType: 'js', content: 'console.log(1)' },
      ],
      cdnResources: [
        { resourceType: 'css', url: 'https://cdn.example/a.css' },
        { resourceType: 'js', url: 'https://cdn.example/a.js' },
      ],
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual([
      'README.txt',
      'index.html',
      'script.js',
      'style.css',
    ]);
    const index = await zip.file('index.html')!.async('string');
    expect(index).toContain('<title>A &lt;b&gt; &amp; c</title>');
    expect(index).toContain('<link rel="stylesheet" href="https://cdn.example/a.css">');
    expect(index).toContain('<script src="https://cdn.example/a.js"></script>');
    expect(index).toContain('<p>Hi</p>');
    expect(await zip.file('style.css')!.async('string')).toBe('p{color:red}');
  });
});

describe('EditorCommandsService', () => {
  let commands: EditorCommandsService;
  let editors: EditorInsertService;
  let views: EditorView[] = [];

  beforeEach(() => {
    commands = TestBed.inject(EditorCommandsService);
    editors = TestBed.inject(EditorInsertService);
    views = [];
  });

  afterEach(() => {
    views.forEach((v) => {
      v.dom.parentElement?.remove();
      v.destroy();
    });
  });

  function register(pane: 'html' | 'css' | 'js', doc: string) {
    const view = mountView(doc);
    views.push(view);
    editors.register(pane, view);
    return view;
  }

  it('formats the requested pane in place', () => {
    const css = register('css', 'a{color:red}');
    commands.formatPane('css');
    expect(css.state.doc.toString()).toBe('a {\n  color:red\n}');
  });

  it('formats the last focused pane by default', () => {
    register('html', '<div><p>x</p></div>');
    const js = register('js', 'if (a) {\nb()\n}');
    editors.markFocused('js');
    commands.formatPane();
    expect(js.state.doc.toString()).toBe('if (a) {\n  b()\n}');
  });

  it('opens find/replace with the replace field focused', async () => {
    const html = register('html', '<p>hello</p>');
    await commands.findReplace('html', true);
    const replace = html.dom.querySelector<HTMLInputElement>('.cm-search input[name=replace]');
    expect(replace).toBeTruthy();
    expect(document.activeElement).toBe(replace);
  });

  it('only allows saving for owners and new pens, never guests', () => {
    const store = TestBed.inject(SnippetStoreService);
    const ui = TestBed.inject(EditorUiService);
    store.setSnippet({ snippetId: 'x', isOwner: false });
    expect(commands.canSave()).toBe(false);
    store.setSnippet({ snippetId: 'x', isOwner: true });
    expect(commands.canSave()).toBe(true);
    store.setSnippet({ isOwner: true });
    expect(commands.canSave()).toBe(true);
    ui.setGuestMode(true);
    expect(commands.canSave()).toBe(false);
    ui.setGuestMode(false);
  });

  it('rerunPreview re-sets the preview type so an unchanged "full" still refreshes', () => {
    const store = TestBed.inject(SnippetStoreService);
    store.setSnippet({ isOwner: true }, true);
    const set = vi.spyOn(store.previewUpdateType, 'set');
    commands.rerunPreview();
    expect(set.mock.calls).toEqual([[null], ['full']]);
    expect(store.previewUpdateType()).toBe('full');
  });
});
