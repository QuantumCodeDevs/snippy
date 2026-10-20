import {
  Component,
  ViewChild,
  viewChild,
  ElementRef,
  effect,
  OnInit,
  OnDestroy,
  inject,
  DestroyRef,
  HostListener,
  ChangeDetectionStrategy,
  computed,
  untracked,
  afterRenderEffect,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AngularSplitModule, SplitGutterInteractionEvent } from 'angular-split';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { combineLatest } from 'rxjs';

import { SnippetEditorComponent } from '@app/components/editor/snippet-editor/snippet-editor.component';
import {
  PaneLang,
  PaneLangLabelComponent,
} from '@app/components/editor/pane-lang-label/pane-lang-label.component';
import { SnippetPreviewComponent } from '@app/components/editor/snippet-preview/snippet-preview.component';
import { SnippetMobileViewComponent } from '@app/pages/snippet-mobile-view/snippet-mobile-view.component';
import { SnippetStoreService } from '@app/services/stores/snippet.store.service';
import { CdnResource } from '@app/models/extra-models/cdnLibrary';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnippetSaveUIService } from '@app/services/ui/snippet-save-ui.service';
import { EditorUiService } from '@app/services/ui/editor-ui.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStoreService } from '@app/services/stores/auth.store.service';
import { PreviewConsoleService } from '@app/services/ui/preview-console.service';
import { DraftAutosaveService } from '@app/services/ui/draft-autosave.service';
import { DialogService } from '@app/services/ui/dialog.service';
import { TemplatePickerDialogComponent } from '@app/components/dialogs/template-picker-dialog/template-picker-dialog.component';
import { templateById, templateLanguages, SnippetTemplate } from '@app/editor/snippet-templates';
import type { Snippet } from '@app/models/base-models/snippet';
import { SnippetAutosaveService } from '@app/services/ui/snippet-autosave.service';
import { SeoService } from '@app/services/ui/seo.service';
import {
  EDITOR_GUTTER_EMPTY,
  EDITOR_PANES,
  EditorPaneId,
  collapseEditorPanes,
  editorGridTemplate,
  editorGutterTracks,
  expandEditorPanes,
  gutterPaneIds,
  maximizeEditorPane as expandOneEditorPane,
  minimizeEditorPane as collapseOneEditorPane,
} from './editor-pane-layout';

@Component({
  selector: 'app-snippet-web-view',
  imports: [
    NgTemplateOutlet,
    AngularSplitModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    SnippetEditorComponent,
    SnippetPreviewComponent,
    SnippetMobileViewComponent,
    PaneLangLabelComponent,
  ],
  templateUrl: './snippet-web-view.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './snippet-web-view.component.scss',
})
export class SnippetWebViewComponent implements OnInit, OnDestroy {
  @ViewChild(SnippetPreviewComponent) previewComponent?: SnippetPreviewComponent;
  private editorSplitEl = viewChild('editorSplit', { read: ElementRef });

  snippetStoreService = inject(SnippetStoreService);
  snippetSaveUIService = inject(SnippetSaveUIService);
  editorUi = inject(EditorUiService);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authStoreService = inject(AuthStoreService);
  private previewConsole = inject(PreviewConsoleService);
  private drafts = inject(DraftAutosaveService);
  private dialogs = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  private autosave = inject(SnippetAutosaveService);
  private seo = inject(SeoService);

  get user() {
    return this.authStoreService.user;
  }
  get selectedLayout() {
    return this.editorUi.layout();
  }
  get isGuest() {
    return this.editorUi.guestMode();
  }
  get editorsDirection() {
    return this.selectedLayout === 'left' || this.selectedLayout === 'right'
      ? 'vertical'
      : 'horizontal';
  }

  /** Percent sizes for HTML, CSS, and JS. 0 means the pane is collapsed into the gutter. */
  readonly editorPaneSizes = signal<number[]>([33, 33, 34]);
  readonly editorCollapsed = computed(() => this.editorPaneSizes().map((size) => size <= 0));
  readonly editorGutterSize = computed(() => {
    const stacked = this.editorUi.layout() === 'left' || this.editorUi.layout() === 'right';
    const tracks = editorGutterTracks(this.editorCollapsed(), stacked);
    return Math.max(EDITOR_GUTTER_EMPTY, tracks[0], tracks[1]);
  });
  readonly collapsedGridTemplate = computed(() => {
    const layout = this.editorUi.layout();
    const direction = layout === 'left' || layout === 'right' ? 'vertical' : 'horizontal';
    return editorGridTemplate(direction, this.editorPaneSizes(), this.editorCollapsed());
  });
  private editorGridFrame = 0;

  snippetId: string | null = null;
  error: string | null = null;
  private viewRecorded = false;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private draftTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.autosave.watch();
    // The microtask runs after angular-split writes its own grid tracks, so a
    // gutter that holds a collapsed name can be wider than an empty gutter.
    afterRenderEffect({
      write: () => {
        const template = this.collapsedGridTemplate();
        const el = this.editorSplitEl()?.nativeElement as HTMLElement | undefined;
        if (!el) return;
        const frame = ++this.editorGridFrame;
        if (!template) return;
        queueMicrotask(() => {
          if (frame !== this.editorGridFrame) return;
          el.style.gridTemplate = template;
        });
      },
    });

    effect(() => {
      const snippet = this.snippetStoreService.snippet();
      const previewUpdateType = this.snippetStoreService.previewUpdateType();
      this.editorUi.layout();
      this.editorUi.isCompact();

      if (!previewUpdateType || !snippet?.snippetFiles) return;

      const html = snippet.snippetFiles.find((f) => f.fileType === 'html')?.content || '';
      const css = snippet.snippetFiles.find((f) => f.fileType === 'css')?.content || '';
      const js = snippet.snippetFiles.find((f) => f.fileType === 'js')?.content || '';
      const cdn = snippet.cdnResources || [];

      if (previewUpdateType === 'partial') {
        this.updatePreview(html, css, js, 'partial', cdn);
        return;
      }

      if (this.previewTimer) clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(() => {
        this.updatePreview(html, css, js, 'full', cdn);
      }, 200);
    });

    // Title and search metadata. Keyed on metadata fields so typing code does not rerun it.
    const seoKey = computed(() => {
      const s = this.snippetStoreService.snippet();
      return s
        ? JSON.stringify([s.snippetId, s.name, s.description, s.snapshotUrl, s.isPrivate, s.tags])
        : null;
    });
    effect(() => {
      seoKey();
      const error = this.snippetStoreService.error();
      untracked(() => this.updateSeo(this.snippetStoreService.snippet(), error));
    });

    effect(() => {
      const snippet = this.snippetStoreService.snippet();
      if (!snippet?.snippetId || snippet.isOwner || this.viewRecorded) return;
      if (!this.authStoreService.isAuthenticated()) return;
      this.viewRecorded = true;
      void this.snippetStoreService.recordView(snippet.snippetId);
    });

    effect(() => {
      const dirty = this.snippetStoreService.isDirty();
      const snippet = this.snippetStoreService.snippet();
      if (!dirty || !snippet || !this.canPersistDraft(snippet)) return;
      if (this.draftTimer) clearTimeout(this.draftTimer);
      this.draftTimer = setTimeout(() => this.persistDraft(), 400);
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (!this.snippetStoreService.isDirty()) return;
    this.persistDraft();
    event.preventDefault();
    event.returnValue = '';
  }

  gutterPanes(gutterNum: number): EditorPaneId[] {
    return gutterPaneIds(this.editorCollapsed(), gutterNum);
  }

  expandLabel(pane: PaneLang): string {
    const name = pane === 'js' ? 'JavaScript' : pane.toUpperCase();
    return `${name}. Double-click to expand.`;
  }

  onEditorDragEnd(event: SplitGutterInteractionEvent) {
    const sizes = event.sizes.map((size) => (typeof size === 'number' ? size : 0));
    this.editorPaneSizes.set(collapseEditorPanes(sizes));
  }

  onEditorGutterDblClick(event: SplitGutterInteractionEvent) {
    const indexes = gutterPaneIds(this.editorCollapsed(), event.gutterNum).map((pane) =>
      EDITOR_PANES.indexOf(pane)
    );
    if (!indexes.length) return;
    this.editorPaneSizes.set(expandEditorPanes(this.editorPaneSizes(), indexes));
  }

  canResizePane(index: number): boolean {
    const sizes = this.editorPaneSizes();
    return sizes.filter((size) => size > 0).length > 1 && sizes[index] > 0;
  }

  minimizeEditorPane(pane: EditorPaneId) {
    this.editorPaneSizes.set(
      collapseOneEditorPane(this.editorPaneSizes(), EDITOR_PANES.indexOf(pane))
    );
  }

  maximizeEditorPane(pane: EditorPaneId) {
    this.editorPaneSizes.set(
      expandOneEditorPane(this.editorPaneSizes(), EDITOR_PANES.indexOf(pane))
    );
  }

  expandEditorPane(pane: EditorPaneId, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.editorPaneSizes.set(
      expandEditorPanes(this.editorPaneSizes(), [EDITOR_PANES.indexOf(pane)])
    );
  }

  ngOnInit(): void {
    const guest = !!this.route.snapshot.data['guest'];
    const share = !!this.route.snapshot.data['share'];
    this.editorUi.setGuestMode(guest || share);
    this.editorUi.editorOpen.set(true);

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => {
        const id = params.get('id');
        const token = params.get('token');
        this.snippetId = id;
        this.viewRecorded = false;
        this.error = null;

        if (share && token) {
          void this.snippetStoreService.loadSharedSnippet(token).then(() => {
            const snip = this.snippetStoreService.snippet();
            this.editorUi.setGuestMode(!snip?.isOwner);
          });
        } else if (id && !guest) {
          const current = this.snippetStoreService.snippet();
          if (current?.shortId === id) {
            this.restoreDraft();
          } else {
            void this.snippetStoreService.loadSnippet(id).then(() => this.restoreDraft());
          }
        } else {
          const forceNew = !!query.get('new');
          const templateId = guest ? 'hello' : query.get('template');
          if (forceNew) {
            this.initBlankSnippet(guest, templateId);
            void this.router.navigate(['/snippet'], {
              replaceUrl: true,
              queryParams: templateId ? { template: templateId } : {},
            });
            return;
          }
          this.initBlankSnippet(guest, templateId);
          if (guest) {
            this.restoreDraft();
            return;
          }
          if (templateId) return;
          this.restoreDraft();
          if (!this.snippetStoreService.isDirty()) this.openTemplatePicker();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
      this.draftTimer = null;
    }
    this.persistDraft();
    this.editorUi.setGuestMode(false);
    this.editorUi.editorOpen.set(false);
    this.previewConsole.setOpen(false);
    this.previewConsole.clear();
    if (!this.navigatingToOpenSnippet()) {
      this.snippetStoreService.clearSnippet();
    }
  }

  /** Keep the saved pen in the store when save navigates to its new URL. */
  private navigatingToOpenSnippet(): boolean {
    const shortId = this.snippetStoreService.snippet()?.shortId;
    if (!shortId) return false;
    const nav = this.router.getCurrentNavigation();
    const next = nav?.finalUrl?.toString() || nav?.extractedUrl?.toString() || '';
    return next.includes(`/snippet/${shortId}`);
  }

  private initBlankSnippet(guest: boolean, templateId?: string | null) {
    const tpl = templateById(guest ? templateId || 'hello' : templateId);
    this.applyTemplate(tpl, guest);
  }

  /**
   * Seed a new pen from a template. `chosen` (picked in the dialog, not a URL
   * default) marks non-blank content unsaved, so Save is enabled right away and
   * the local draft protects it.
   */
  private applyTemplate(tpl: SnippetTemplate, guest: boolean, chosen = false) {
    this.snippetStoreService.clearSnippet();
    const snippet: Snippet = {
      shortId: '',
      name: guest ? 'Try Snippy' : tpl.id === 'blank' ? 'Untitled' : tpl.name,
      description: tpl.source === 'user' ? tpl.description : '',
      tags: [...(tpl.tags ?? [])],
      isPrivate: false,
      forkCount: 0,
      viewCount: 0,
      commentCount: 0,
      favoriteCount: 0,
      parentShortId: '',
      isOwner: true,
      displayName: guest ? 'Guest' : this.user()?.displayName || '',
      snippetFiles: [
        { fileType: 'html', content: tpl.html },
        { fileType: 'css', content: tpl.css },
        { fileType: 'js', content: tpl.js },
      ],
      cdnResources: (tpl.cdnResources ?? []).map((r) => ({ ...r })),
    };
    const hasContent = templateLanguages(tpl).length > 0 || !!tpl.cdnResources?.length;
    if (chosen && !guest && hasContent) {
      this.snippetStoreService.setSnippet(
        { ...snippet, snippetFiles: snippet.snippetFiles!.map((f) => ({ ...f, content: '' })) },
        false
      );
      this.snippetStoreService.applyDraft(snippet);
    } else {
      this.snippetStoreService.setSnippet(snippet, false);
    }
    this.snippetStoreService.previewUpdateType.set('full');
    this.snippetStoreService.loading.set(false);
  }

  private openTemplatePicker() {
    const ref = this.dialogs.open<TemplatePickerDialogComponent, unknown, SnippetTemplate | null>(
      TemplatePickerDialogComponent,
      'lg',
      { ariaLabel: 'Start a new snippet' }
    );
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tpl) => {
        if (tpl) {
          this.drafts.remove(this.drafts.keyFor({ guest: false }));
          this.applyTemplate(tpl, false, true);
        }
      });
  }

  private canPersistDraft(snippet = this.snippetStoreService.snippet()): boolean {
    if (!snippet) return false;
    if (this.route.snapshot.data['share']) return false;
    if (snippet.snippetId && !snippet.isOwner) return false;
    return true;
  }

  private persistDraft() {
    const snippet = this.snippetStoreService.snippet();
    if (!snippet || !this.snippetStoreService.isDirty() || !this.canPersistDraft(snippet)) return;
    if (snippet.snippetId && !snippet.shortId) return;
    const shortId = snippet.shortId?.trim() || null;
    if (snippet.snippetId && !shortId) return;
    this.drafts.persistFromSnippet(this.drafts.keyFor({ guest: this.isGuest, shortId }), snippet);
  }

  private restoreDraft() {
    const snippet = this.snippetStoreService.snippet();
    if (!snippet || !this.canPersistDraft(snippet)) return;
    const key = this.drafts.keyFor({ guest: this.isGuest, shortId: snippet.shortId || null });
    const draft = this.drafts.read(key);
    if (!draft) return;
    if (!this.drafts.shouldRestore(draft, snippet.updatedAt)) return;
    this.snippetStoreService.applyDraft(this.drafts.applyToSnippet(snippet, draft));
  }

  private updateSeo(snippet: Snippet | null, error: string | null) {
    if (error && !snippet) {
      this.seo.update({ title: 'Snippet not found', noindex: true, jsonLd: null });
      return;
    }
    if (!snippet || !snippet.snippetId) return;
    const name = snippet.name || 'Untitled';
    const author = snippet.displayName || snippet.userName;
    const share = !!this.route.snapshot.data['share'];
    const canonicalPath =
      snippet.userName && snippet.shortId
        ? `/${snippet.userName}/snippet/${snippet.shortId}`
        : undefined;
    this.seo.update({
      title: author ? `${name} by ${author}` : name,
      description:
        snippet.description ||
        `${name}: an HTML, CSS, and JavaScript snippet${author ? ` by ${author}` : ''} on Snippy.`,
      image: snippet.snapshotUrl,
      type: 'article',
      noindex: share || !!snippet.isPrivate,
      canonicalPath,
      jsonLd:
        share || snippet.isPrivate
          ? null
          : {
              '@context': 'https://schema.org',
              '@type': 'SoftwareSourceCode',
              name,
              ...(snippet.description ? { description: snippet.description } : {}),
              programmingLanguage: ['HTML', 'CSS', 'JavaScript'],
              ...(snippet.tags?.length ? { keywords: snippet.tags.join(', ') } : {}),
              ...(snippet.snapshotUrl ? { image: snippet.snapshotUrl } : {}),
              ...(snippet.updatedAt ? { dateModified: snippet.updatedAt } : {}),
              ...(author
                ? { author: { '@type': 'Person', name: author, alternateName: snippet.userName } }
                : {}),
            },
    });
  }

  private updatePreview(
    html: string,
    css: string,
    js: string,
    previewUpdateType: string | null,
    cdnResources: CdnResource[] = []
  ) {
    if (!this.previewComponent) {
      setTimeout(() => {
        if (this.previewComponent) {
          this.previewComponent.updatePreview(html, css, js, previewUpdateType, cdnResources);
        }
      }, 100);
      return;
    }

    this.previewComponent.updatePreview(html, css, js, previewUpdateType, cdnResources);
  }
}
