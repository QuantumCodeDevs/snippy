import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';

import { PageHeaderComponent } from '@app/components/headers/page-header/page-header.component';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';

describe('PageHeaderComponent', () => {
  let component: PageHeaderComponent;
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('PageHeaderComponent compact editor', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
      providers: [
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: true, breakpoints: { '(max-width: 767px)': true } }),
            isMatched: () => true,
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(SnippetStoreService).setSnippet({
      name: 'Mobile pen',
      snippetId: 'id',
      shortId: 'abc',
      isOwner: true,
      isFavorited: false,
    });
    TestBed.inject(AuthStoreService).user.set({
      userName: 'ken',
      displayName: 'Kenneth',
    });

    fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.detectChanges();
    fixture.componentInstance.mode = 'editor';
    fixture.detectChanges();
  });

  it('shows the title, favorite, and actions menu', () => {
    const el: HTMLElement = fixture.nativeElement;
    const title = el.querySelector<HTMLInputElement>('input[aria-label="Snippet name"]');
    expect(title?.value).toBe('Mobile pen');
    expect(el.querySelector('[aria-label="Favorite"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Snippet actions"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Editor layout"]')).toBeNull();
    expect(el.querySelector('[aria-label="Snippy"]')).toBeTruthy();
  });
});
