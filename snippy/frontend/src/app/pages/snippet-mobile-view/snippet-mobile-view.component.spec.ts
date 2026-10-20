import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import { SnippetMobileViewComponent } from './snippet-mobile-view.component';

describe('SnippetMobileViewComponent', () => {
  let fixture: ComponentFixture<SnippetMobileViewComponent>;
  let ui: EditorUiService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SnippetMobileViewComponent],
    }).compileComponents();

    ui = TestBed.inject(EditorUiService);
    fixture = TestBed.createComponent(SnippetMobileViewComponent);
    fixture.detectChanges();
  });

  it('shows one tab per enabled pane and selects HTML', () => {
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(Array.from(tabs, (tab) => (tab as HTMLElement).textContent?.trim())).toEqual([
      'HTML',
      'CSS',
      'JS',
    ]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('#mobile-pane-css')?.hasAttribute('hidden')).toBe(
      true
    );
    expect(fixture.nativeElement.querySelector('.mobile-result')?.hasAttribute('hidden')).toBe(
      false
    );
  });

  it('switches the visible pane from a tab', () => {
    const css = fixture.nativeElement.querySelector('#mobile-tab-css') as HTMLButtonElement;
    css.click();
    fixture.detectChanges();
    expect(ui.activePane()).toBe('css');
    expect(css.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('#mobile-pane-css')?.hasAttribute('hidden')).toBe(
      false
    );
  });

  it('moves between visible tabs with the arrow keys', () => {
    const html = fixture.nativeElement.querySelector('#mobile-tab-html') as HTMLButtonElement;
    html.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(ui.activePane()).toBe('css');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#mobile-tab-css'));
  });

  it('hides a pane that is turned off', () => {
    ui.togglePane('js');
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'), (tab) =>
      (tab as HTMLElement).textContent?.trim()
    );
    expect(labels).toEqual(['HTML', 'CSS']);
    expect(fixture.nativeElement.querySelector('.mobile-result')?.hasAttribute('hidden')).toBe(
      false
    );
  });
});
