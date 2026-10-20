import { TestBed } from '@angular/core/testing';
import { EditorUiService } from '@app/services/ui/editor-ui.service';

describe('EditorUiService mobile panes', () => {
  let ui: EditorUiService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    ui = TestBed.inject(EditorUiService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with every pane on and HTML selected', () => {
    expect(ui.panes()).toEqual({ html: true, css: true, js: true, result: true });
    expect(ui.activePane()).toBe('html');
    expect(ui.visiblePanes()).toEqual(['html', 'css', 'js']);
  });

  it('refuses to turn off the last pane', () => {
    expect(ui.setPaneEnabled('css', false)).toBe(true);
    expect(ui.setPaneEnabled('js', false)).toBe(true);
    expect(ui.setPaneEnabled('result', false)).toBe(true);
    expect(ui.setPaneEnabled('html', false)).toBe(false);
    expect(ui.panes()).toEqual({ html: true, css: false, js: false, result: false });
    expect(ui.activePane()).toBe('html');
  });

  it('selects the next pane when the active one is turned off', () => {
    ui.setPaneEnabled('html', false);
    expect(ui.activePane()).toBe('css');
    expect(ui.visiblePanes()).toEqual(['css', 'js']);
  });

  it('turns a hidden pane back on when it is shown', () => {
    ui.setPaneEnabled('result', false);
    ui.showPane('result');
    expect(ui.panes().result).toBe(true);
    expect(ui.activePane()).toBe('html');
  });

  it('remembers which panes are off', () => {
    ui.setPaneEnabled('js', false);
    ui.setPaneEnabled('result', false);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const again = TestBed.inject(EditorUiService);
    expect(again.panes()).toEqual({ html: true, css: true, js: false, result: false });
    expect(again.activePane()).toBe('html');
  });

  it('ignores corrupt or empty pane storage', () => {
    localStorage.setItem('editorPanes', '{');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(EditorUiService).panes().css).toBe(true);

    localStorage.setItem(
      'editorPanes',
      JSON.stringify({ html: false, css: false, js: false, result: false })
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(EditorUiService).panes()).toEqual({
      html: true,
      css: true,
      js: true,
      result: true,
    });
  });
});
