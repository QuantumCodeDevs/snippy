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

  it('does not flag void or self-closing tags as unclosed', () => {
    const analyze = (
      component as unknown as { analyzeHTML: (html: string) => string[] }
    ).analyzeHTML.bind(component);
    expect(analyze('<div><img src="a.png"><br><input></div>')).toEqual([]);
    expect(analyze('<div class="card" />')).toEqual([]);
    expect(analyze('<!-- <div> --><p>ok</p>')).toEqual([]);
  });

  it('flags a tag that is missing its close', () => {
    const analyze = (
      component as unknown as { analyzeHTML: (html: string) => string[] }
    ).analyzeHTML.bind(component);
    expect(analyze('<div><span>hi</div>')).toEqual(['Unclosed <span> tag']);
    expect(analyze('</p>')).toEqual(['Unexpected </p> tag']);
  });
});
