import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnippetWebViewComponent } from '@app/pages/snippet-web-view/snippet-web-view.component';

describe('SnippetWebViewComponent', () => {
  let component: SnippetWebViewComponent;
  let fixture: ComponentFixture<SnippetWebViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnippetWebViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SnippetWebViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
