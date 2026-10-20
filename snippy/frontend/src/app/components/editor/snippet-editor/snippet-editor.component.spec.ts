import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnippetEditorComponent } from '@app/components/editor/snippet-editor/snippet-editor.component';

describe('SnippetEditorComponent', () => {
  let component: SnippetEditorComponent;
  let fixture: ComponentFixture<SnippetEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnippetEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SnippetEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('labels the pane and its CodeMirror content for assistive tech', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('section')?.getAttribute('aria-label')).toBe('HTML editor');
    expect(el.querySelector('.cm-content')?.getAttribute('aria-label')).toBe('HTML code editor');
    expect(el.querySelector('.pane-lang__name')?.textContent?.trim()).toBe('HTML');
    expect(el.querySelector('.pane-lang__mark')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Find and replace in HTML"]')).toBeTruthy();
  });

  it('shows JS on the tab and keeps the JavaScript accessible name', () => {
    component.editorType = 'js';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('section')?.getAttribute('aria-label')).toBe('JavaScript editor');
    expect(el.querySelector('.pane-lang__name')?.textContent?.trim()).toBe('JS');
    expect(el.querySelector('button[aria-label="JavaScript pane actions"]')).toBeTruthy();
  });

  it('lists minimize, fold all, and unfold all in the pane menu', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('button[aria-label="HTML pane actions"]')?.click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(document.body.textContent).toContain('Fold All'));
    expect(document.body.textContent).toContain('Unfold All');
    expect(document.body.textContent).toContain('Minimize');
    expect(document.body.textContent).toContain('Maximize');
  });

  it('folds and unfolds ranges in the pane', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const view = component['editorInstance'];
    expect(view).toBeTruthy();
    view?.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: '<div>\n  <p>Hi</p>\n</div>',
      },
    });
    component.foldAllCode();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.cm-foldPlaceholder')).toBeTruthy();
    component.unfoldAllCode();
    expect(el.querySelector('.cm-foldPlaceholder')).toBeFalsy();
  });

  it('opens the find/replace panel from the toolbar button', async () => {
    await new Promise((r) => setTimeout(r, 0));
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector<HTMLButtonElement>(
      'button[aria-label="Find and replace in HTML"]'
    );
    button?.click();
    await vi.waitFor(() => expect(el.querySelector('.cm-search')).toBeTruthy());
    expect(el.querySelector('.cm-search input[name=replace]')).toBeTruthy();
  });
});
