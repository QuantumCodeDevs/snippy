import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { FooterComponent } from '@app/components/footer/footer.component';
import { PageHeaderComponent } from '@app/components/headers/page-header/page-header.component';
import { PreviewConsolePanelComponent } from '@app/components/editor/preview-console-panel/preview-console-panel.component';
import { HeaderMode } from '@app/models/extra-models/header-mode';
import { CommandPaletteComponent } from '@app/components/dialogs/command-palette/command-palette.component';
import { DialogService } from '@app/services/ui/dialog.service';
import { ThemeService } from '@app/services/ui/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, PageHeaderComponent, PreviewConsolePanelComponent],
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
  private dialogService = inject(DialogService);
  private readonly themeService = inject(ThemeService);

  headerMode: HeaderMode = 'landing';

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.dialogService.open(CommandPaletteComponent, 'md');
    }
  }

  get isEmbedShell(): boolean {
    return this.headerMode === 'embed';
  }

  ngOnInit() {
    this.themeService.theme();
    this.syncHeaderMode();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncHeaderMode());
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
