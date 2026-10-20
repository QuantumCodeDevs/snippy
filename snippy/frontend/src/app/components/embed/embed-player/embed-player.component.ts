import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SnippyApi } from '@app/services/data/snippy-api.service';
import { Snippet } from '@app/models/base-models/snippet';
import { CdnResource } from '@app/models/extra-models/cdnLibrary';
import { SnippetPreviewComponent } from '@app/components/editor/snippet-preview/snippet-preview.component';
import { EmbedCodePaneComponent } from '@app/components/embed/embed-code-pane/embed-code-pane.component';
import { EDITOR_THEME_KEYS, EditorThemeKey } from '@app/editor/editor-preferences';

export type EmbedTab = 'html' | 'css' | 'js' | 'result';
export type EmbedLayout = 'horizontal' | 'vertical';
export type EmbedZoom = 1 | 0.5 | 0.25;

/** How often an open embed confirms the snippet is still public. */
export const EMBED_RECHECK_MS = 30_000;

@Component({
  selector: 'app-embed-player',
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    SnippetPreviewComponent,
    EmbedCodePaneComponent,
  ],
  templateUrl: './embed-player.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './embed-player.component.scss',
})
export class EmbedPlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild(SnippetPreviewComponent) preview?: SnippetPreviewComponent;

  private route = inject(ActivatedRoute);
  private api = inject(SnippyApi);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal<string | null>(null);
  snippet = signal<Snippet | null>(null);

  html = signal('');
  css = signal('');
  js = signal('');
  resources = signal<CdnResource[]>([]);

  editable = signal(false);
  layout = signal<EmbedLayout>('horizontal');
  theme = signal<EditorThemeKey | null>(null);
  enabledTabs = signal<EmbedTab[]>(['html', 'result']);
  activeCodeTab = signal<'html' | 'css' | 'js'>('html');
  showResult = signal(true);
  showResources = signal(false);
  zoom = signal<EmbedZoom>(1);
  previewTick = signal(0);

  readonly codeTabs = computed(() =>
    (['html', 'css', 'js'] as const).filter((t) => this.enabledTabs().includes(t))
  );

  readonly cssResources = computed(() => this.resources().filter((r) => r.resourceType === 'css'));

  readonly jsResources = computed(() => this.resources().filter((r) => r.resourceType === 'js'));

  readonly showCodePane = computed(() => this.codeTabs().length > 0);
  readonly editUrl = computed(() => {
    const s = this.snippet();
    if (!s?.shortId) return '/try';
    if (s.userName) return `/${s.userName}/snippet/${s.shortId}`;
    return `/snippet`;
  });

  private refreshTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private recheckTimer: ReturnType<typeof setInterval> | null = null;
  private watchingVisibility = false;
  private loadGeneration = 0;
  private loadedShortId: string | null = null;
  private destroyed = false;

  private onVisibility = () => {
    if (document.visibilityState === 'visible') void this.recheck();
  };

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const shortId = params.get('shortId');
      if (shortId) void this.load(shortId);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.editable.set(q.get('editable') === 'true');
      this.layout.set(q.get('layout') === 'vertical' ? 'vertical' : 'horizontal');
      const themeRaw = (q.get('theme') || '').toLowerCase();
      this.theme.set(
        (EDITOR_THEME_KEYS as readonly string[]).includes(themeRaw)
          ? (themeRaw as EditorThemeKey)
          : null
      );
      const raw = (q.get('default-tab') || 'html,result').toLowerCase();
      const tabs = raw
        .split(',')
        .map((t) => t.trim())
        .filter((t): t is EmbedTab => ['html', 'css', 'js', 'result'].includes(t));
      const enabled = tabs.length ? [...new Set(tabs)] : (['html', 'result'] as EmbedTab[]);
      this.enabledTabs.set(enabled);
      this.showResult.set(enabled.includes('result'));
      const firstCode = (['html', 'css', 'js'] as const).find((t) => enabled.includes(t));
      if (firstCode) this.activeCodeTab.set(firstCode);
    });
  }

  ngAfterViewInit() {
    // Only start refreshPreview if the result pane is enabled
    if (this.showResult()) {
      this.refreshPreview();
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.loadGeneration += 1;
    this.stopRecheck();
    this.clearRefreshTimeout();
  }

  selectCodeTab(tab: 'html' | 'css' | 'js') {
    this.activeCodeTab.set(tab);
    this.showResources.set(false);
  }

  toggleResources() {
    this.showResources.update((v) => !v);
  }

  setZoom(z: EmbedZoom) {
    this.zoom.set(z);
  }

  rerun() {
    this.previewTick.update((n) => n + 1);
    this.refreshPreview();
  }

  onCodeChange(tab: 'html' | 'css' | 'js', value: string) {
    if (!this.editable()) return;
    if (tab === 'html') this.html.set(value);
    if (tab === 'css') this.css.set(value);
    if (tab === 'js') this.js.set(value);
    this.refreshPreview(tab === 'css' ? 'partial' : 'full');
  }

  private async load(shortId: string) {
    const generation = ++this.loadGeneration;
    this.stopRecheck();
    this.loadedShortId = null;
    this.loading.set(true);
    this.error.set(null);
    try {
      const snip = await this.api.getPublicEmbed(shortId);
      if (this.destroyed || generation !== this.loadGeneration) return;
      if (!snip || snip.isPrivate) throw new Error('not found');
      this.snippet.set(snip);
      this.html.set(snip.snippetFiles?.find((f) => f.fileType === 'html')?.content ?? '');
      this.css.set(snip.snippetFiles?.find((f) => f.fileType === 'css')?.content ?? '');
      this.js.set(snip.snippetFiles?.find((f) => f.fileType === 'js')?.content ?? '');
      this.resources.set(snip.cdnResources ?? []);
      this.loading.set(false);
      this.loadedShortId = shortId;
      this.startRecheck();
      queueMicrotask(() => {
        if (generation === this.loadGeneration && !this.error()) this.refreshPreview();
      });
    } catch {
      if (this.destroyed || generation !== this.loadGeneration) return;
      this.failClosed();
    }
  }

  /** Drop a playing embed once the snippet is missing or no longer public. */
  private failClosed() {
    this.stopRecheck();
    this.loadedShortId = null;
    this.snippet.set(null);
    this.html.set('');
    this.css.set('');
    this.js.set('');
    this.resources.set([]);
    this.clearRefreshTimeout();
    this.error.set('Snippet not found or is private.');
    this.loading.set(false);
  }

  private startRecheck() {
    this.stopRecheck();
    this.recheckTimer = setInterval(() => void this.recheck(), EMBED_RECHECK_MS);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.watchingVisibility = true;
  }

  private stopRecheck() {
    if (this.recheckTimer !== null) {
      clearInterval(this.recheckTimer);
      this.recheckTimer = null;
    }
    if (this.watchingVisibility) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.watchingVisibility = false;
    }
  }

  private async recheck() {
    const shortId = this.loadedShortId;
    const generation = this.loadGeneration;
    if (!shortId || this.error()) return;
    try {
      const snip = await this.api.getPublicEmbed(shortId);
      if (this.destroyed || generation !== this.loadGeneration || this.loadedShortId !== shortId) {
        return;
      }
      if (!snip || snip.isPrivate) throw new Error('not found');
    } catch {
      if (this.destroyed || generation !== this.loadGeneration || this.loadedShortId !== shortId) {
        return;
      }
      this.failClosed();
    }
  }

  private clearRefreshTimeout() {
    if (this.refreshTimeoutHandle !== null) {
      clearTimeout(this.refreshTimeoutHandle);
      this.refreshTimeoutHandle = null;
    }
  }

  private refreshPreview(type: 'full' | 'partial' = 'full') {
    this.clearRefreshTimeout();

    // Guard: do not schedule refresh if result pane is not shown
    if (!this.showResult()) {
      return;
    }

    if (!this.preview) {
      this.refreshTimeoutHandle = setTimeout(() => this.refreshPreview(type), 50);
      return;
    }
    this.preview.updatePreview(this.html(), this.css(), this.js(), type, this.resources());
  }
}
