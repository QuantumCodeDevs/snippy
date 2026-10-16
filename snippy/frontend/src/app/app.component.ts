import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  Event as RouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  ResolveEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { FooterComponent } from '@app/components/footer/footer.component';
import { PageHeaderComponent } from '@app/components/headers/page-header/page-header.component';
import { PreviewConsolePanelComponent } from '@app/components/editor/preview-console-panel/preview-console-panel.component';
import { HeaderMode } from '@app/models/extra-models/header-mode';
import { KeyboardShortcutsService } from '@app/services/ui/keyboard-shortcuts.service';
import { ThemeService } from '@app/services/ui/theme.service';
import { ActivityService } from '@app/services/ui/activity.service';
import { SeoData, SeoService } from '@app/services/ui/seo.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    FooterComponent,
    PageHeaderComponent,
    PreviewConsolePanelComponent,
    MatProgressBarModule,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'contents' },
})
export class AppComponent implements OnInit {
  title = 'Snippy';
  private authStoreService = inject(AuthStoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private shortcuts = inject(KeyboardShortcutsService);
  private readonly themeService = inject(ThemeService);
  readonly activity = inject(ActivityService);
  readonly seo = inject(SeoService);
  private navigationDone: (() => void) | null = null;

  headerMode: HeaderMode = 'landing';

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    this.shortcuts.handle(event);
  }

  /** Hash links would change the URL; move focus to <main> instead. */
  skipToMain(event: Event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }

  get isEmbedShell(): boolean {
    return this.headerMode === 'embed';
  }

  ngOnInit() {
    this.themeService.theme();
    this.syncHeaderMode();
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onRouterEvent(event));
  }

  private onRouterEvent(event: RouterEvent) {
    if (event instanceof NavigationStart) {
      this.navigationDone?.();
      this.navigationDone = this.activity.start();
    } else if (event instanceof ResolveEnd) {
      // Before the page component activates, so pages can refine it afterwards.
      this.seo.set({
        ...(deepestData(event.state.root)['seo'] as SeoData | undefined),
        canonicalPath: event.urlAfterRedirects.split(/[?#]/)[0] || '/',
      });
    } else if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError
    ) {
      this.navigationDone?.();
      this.navigationDone = null;
      if (event instanceof NavigationEnd) this.syncHeaderMode();
    }
  }

  private syncHeaderMode() {
    let current: ActivatedRoute | null = this.route;
    while (current?.firstChild) current = current.firstChild;
    const fromData = current?.snapshot.data?.['header'] as HeaderMode | undefined;
    if (fromData) {
      this.headerMode = fromData;
      return;
    }
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/embed/')) this.headerMode = 'embed';
    else if (url === '/' || url === '') this.headerMode = 'landing';
    else if (
      url === '/try' ||
      url === '/snippet' ||
      /\/snippet\//.test(url) ||
      url.startsWith('/s/')
    )
      this.headerMode = 'editor';
    else if (/\/fullpage\//.test(url)) this.headerMode = 'minimal';
    else this.headerMode = 'feed';
  }
}

/** Merged `data` of the deepest activated route (child data wins). */
function deepestData(root: ActivatedRouteSnapshot): Record<string, unknown> {
  let node: ActivatedRouteSnapshot | null = root;
  let data: Record<string, unknown> = {};
  while (node) {
    data = { ...data, ...node.data };
    node = node.firstChild;
  }
  return data;
}
