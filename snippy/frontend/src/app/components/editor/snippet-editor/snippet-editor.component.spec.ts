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
