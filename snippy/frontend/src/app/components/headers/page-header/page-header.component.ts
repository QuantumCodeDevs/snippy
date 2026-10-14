import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserMenuComponent } from '@app/components/modules/user-menu/user-menu.component';
import { ThemeToggleComponent } from '@app/components/ui/theme-toggle/theme-toggle.component';
import { HeaderMode } from '@app/models/extra-models/header-mode';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';
import { EditorLayout, EditorUiService } from '@app/services/ui/editor-ui.service';
import { SnippetSettingsDialogComponent } from '@app/components/dialogs/snippet-settings-dialog/snippet-settings-dialog.component';
import { DialogService } from '@app/services/ui/dialog.service';
import { NavigationService } from '@app/services/ui/navigation.service';
import { SnippetActionsService } from '@app/services/ui/snippet-actions.service';
import { ForkAttributionComponent } from '@app/components/ui/fork-attribution/fork-attribution.component';
import { SnippetStatBarComponent } from '@app/components/ui/snippet-stat-bar/snippet-stat-bar.component';
import { DraftAutosaveService } from '@app/services/ui/draft-autosave.service';

@Component({
  selector: 'app-page-header',
  imports: [
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonToggleModule,
    MatTooltipModule,
    UserMenuComponent,
    ThemeToggleComponent,
    ForkAttributionComponent,
    SnippetStatBarComponent,
  ],
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PageHeaderComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private authStore = inject(AuthStoreService);
  private dialogService = inject(DialogService);
  private navigation = inject(NavigationService);
  private snippetActions = inject(SnippetActionsService);
  private drafts = inject(DraftAutosaveService);

  snippetStore = inject(SnippetStoreService);
  snippetSaveUI = inject(SnippetSaveUIService);
  editorUi = inject(EditorUiService);

  mode: HeaderMode = 'landing';

  get user() {
    return this.authStore.user;
  }

  get canEdit(): boolean {
    const s = this.snippetStore.snippet();
    return !!s && (s.isOwner || !s.snippetId);
  }

  get hasSavedSnippet(): boolean {
    return !!this.snippetStore.snippet()?.snippetId;
  }

  get isGuest(): boolean {
    return this.editorUi.guestMode();
  }

  ngOnInit() {
    this.syncFromRouter();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncFromRouter());
  }

  private syncFromRouter() {
    this.mode = this.resolveHeaderMode();
  }

  private resolveHeaderMode(): HeaderMode {
    let current: ActivatedRoute | null = this.route;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    const fromData = current?.snapshot.data?.['header'] as HeaderMode | undefined;
    if (fromData) return fromData;

    const url = this.router.url.split('?')[0];
    if (url === '/' || url === '') return 'landing';
    if (url.startsWith('/embed/')) return 'embed';
    if (url === '/try' || url === '/snippet' || /\/snippet\//.test(url)) return 'editor';
    if (/\/fullpage\//.test(url)) return 'minimal';
    return 'feed';
  }

  login() {
    if (this.editorUi.guestMode()) {
      const snippet = this.snippetStore.snippet();
      if (snippet) {
        this.drafts.persistFromSnippet(this.drafts.keyFor({ guest: true }), snippet);
      }
      this.drafts.promoteTryToNew();
    }
    const target = this.editorUi.guestMode() ? '/snippet' : '/home';
    void this.router.navigate(['/login'], { queryParams: { redirect: target } });
  }

  onSnippetNameChange(name: string) {
    this.snippetStore.updateSnippetName(name);
  }

  onLayoutChange(layout: EditorLayout) {
    this.editorUi.setLayout(layout);
    this.snippetStore.previewUpdateType.set('full');
  }

  openSettings() {
    const snippet = this.snippetStore.snippet();
    if (!snippet || !this.canEdit) return;

    const guest = this.isGuest;
    const dialogRef = this.dialogService.open(SnippetSettingsDialogComponent, 'xl', {
      data: { ...snippet, guestMode: guest },
      minHeight: '50vh',
      panelClass: 'snippy-dialog-tall',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        this.snippetStore.updateSnippetSettings(result);
        if (!guest) {
          this.snippetSaveUI.saveSnippetWithUI(this.snippetStore, this.user);
        }
      });
  }

  viewFullPage() {
    const snippet = this.snippetStore.snippet();
    if (!snippet?.shortId) return;
    window.open(this.navigation.fullPageUrl(snippet.shortId, snippet.userName), '_blank');
  }

  toggleFavorite() {
    const snippet = this.snippetStore.snippet();
    if (!snippet?.snippetId) return;
    void this.snippetActions.toggleFavorite(snippet.snippetId);
  }

  openComments() {
    const snippet = this.snippetStore.snippet();
    if (!snippet?.snippetId) return;
    this.snippetActions.openComments({
      ...snippet,
      userName: snippet.userName || this.user()?.userName,
    });
  }

  openForks() {
    const snippet = this.snippetStore.snippet();
    if (!snippet?.shortId) return;
    this.snippetActions.openForks(snippet);
  }

  forkSnippet() {
    const snippet = this.snippetStore.snippet();
    if (!snippet?.snippetId) return;
    void this.snippetActions.forkAndOpen(snippet.snippetId);
  }
}
