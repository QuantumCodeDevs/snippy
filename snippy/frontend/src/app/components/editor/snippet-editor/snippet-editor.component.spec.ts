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
});
