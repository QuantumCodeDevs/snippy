import {
  Component,
  ViewChild,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';

import { CdnResource } from '@app/models/extra-models/cdnLibrary';
import { ConsoleLevel, PreviewConsoleService } from '@app/services/ui/preview-console.service';
import { PreviewSnapshotService } from '@app/services/ui/preview-snapshot.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { toJpeg } from 'html-to-image';

/**
 * Live preview. Scripts run here and nowhere else.
 * No allow-same-origin (opaque origin, cannot read the app).
 * No allow-top-navigation (cannot move the Snippy tab).
 * No allow-popups-to-escape-sandbox (window.open stays sandboxed).
 */
export const PREVIEW_IFRAME_SANDBOX =
  'allow-scripts allow-forms allow-modals allow-popups allow-downloads';

/** Same-origin so html-to-image can read the DOM; no scripts so user HTML cannot XSS. */
export const CAPTURE_IFRAME_SANDBOX = 'allow-same-origin';

export function buildPreviewSrcdoc(opts: {
  html: string;
  css: string;
  js?: string;
  cdnResources?: CdnResource[];
  includeRuntime?: boolean;
}): string {
  const cdnResources = opts.cdnResources ?? [];
  const stylesheets = cdnResources
    .filter((res) => res.resourceType === 'css')
    .map((res) => `<link rel="stylesheet" href="${res.url}">`)
    .join('\n');

  if (!opts.includeRuntime) {
    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${stylesheets}
          <style>html, body { margin: 0; min-height: 100%; height: 100%; }</style>
          <style id="snippet-style">${opts.css}</style>
        </head>
        <body>
          ${opts.html}
        </body>
      </html>`;
  }

  const scripts = cdnResources
    .filter((res) => res.resourceType === 'js')
    .map((res) => `<script src="${res.url}"><\/script>`)
    .join('\n');

  const consoleBridge = `
      <script>
        (function () {
          function serialize(value) {
            if (typeof value === 'string') return value;
            if (value instanceof Error) return value.stack || value.message;
            try { return JSON.stringify(value); }
            catch (e) { return String(value); }
          }
          function send(level, args) {
            try {
              parent.postMessage({
                source: 'snippy-console',
                level: level,
                args: Array.prototype.map.call(args, serialize)
              }, '*');
            } catch (e) {}
          }
          ['log', 'info', 'warn', 'error'].forEach(function (level) {
            var original = console[level];
            console[level] = function () {
              send(level, arguments);
              if (typeof original === 'function') {
                return original.apply(console, arguments);
              }
            };
          });
          window.addEventListener('error', function (event) {
            send('error', [event.message + (event.filename ? ' (' + event.filename + ':' + event.lineno + ')' : '')]);
          });
          window.addEventListener('unhandledrejection', function (event) {
            send('error', ['Unhandled rejection: ' + serialize(event.reason)]);
          });
        })();
      <\/script>
    `;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${stylesheets}
          <style>html, body { margin: 0; min-height: 100%; height: 100%; }</style>
          <style id="snippet-style">${opts.css}</style>
          ${consoleBridge}
        </head>
        <body>
          ${opts.html}
          <script>
            ${opts.js ?? ''}
          <\/script>
          ${scripts}
        </body>
      </html>
    `;
}

/** Convert a data URL without fetch(), which CSP connect-src may block for data:. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) {
    throw new Error('Invalid data URL');
  }
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

@Component({
  selector: 'app-snippet-preview',
  imports: [],
  templateUrl: './snippet-preview.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SnippetPreviewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewIframe') previewIframe?: ElementRef<HTMLIFrameElement>;

  private previewConsole = inject(PreviewConsoleService);
  private previewSnapshot = inject(PreviewSnapshotService);
  private destroyRef = inject(DestroyRef);
  private messageListenerAttached = false;
  private lastHtml = '';
  private lastCss = '';
  private lastCdnResources: CdnResource[] = [];

  constructor() {
    fromEvent<MessageEvent>(window, 'message')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onConsoleMessage(event));
    this.messageListenerAttached = true;
  }

  ngAfterViewInit() {
    this.previewSnapshot.register(() => this.captureJpeg());
  }

  updatePreview(
    html: string,
    css: string,
    js: string,
    previewUpdateType: string | null,
    cdnResources: CdnResource[] = []
  ) {
    this.lastHtml = html;
    this.lastCss = css;
    this.lastCdnResources = cdnResources;

    if (!this.previewIframe) return;

    if (previewUpdateType?.toLocaleLowerCase() === 'partial') {
      // Attempt CSS-only update; if it fails (e.g., due to sandbox), fall back to full reload
      const updated = this.updateCssOnly(css);
      if (!updated) {
        this.fullReload(html, css, js, cdnResources);
      }
    } else {
      this.fullReload(html, css, js, cdnResources);
    }
  }

  private fullReload(html: string, css: string, js: string, cdnResources: CdnResource[] = []) {
    if (!this.previewIframe) return;

    this.previewConsole.clear();
    this.previewIframe.nativeElement.srcdoc = buildPreviewSrcdoc({
      html,
      css,
      js,
      cdnResources,
      includeRuntime: true,
    });
  }

  private updateCssOnly(css: string): boolean {
    if (!this.previewIframe) return false;

    const iframe = this.previewIframe.nativeElement;
    const doc = iframe.contentDocument;

    if (!doc) return false;

    let styleEl = doc.getElementById('snippet-style') as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = 'snippet-style';
      doc.head.appendChild(styleEl);
    }

    styleEl.textContent = css;
    return true;
  }

  private onConsoleMessage(event: MessageEvent) {
    // Validate that the message comes from our preview iframe
    if (event.source !== this.previewIframe?.nativeElement?.contentWindow) return;

    const data = event.data;
    if (!data || data.source !== 'snippy-console') return;
    const level = (data.level as ConsoleLevel) || 'log';
    const args = Array.isArray(data.args) ? data.args : [String(data.args ?? '')];
    this.previewConsole.append(level, args);
  }

  ngOnDestroy() {
    this.previewSnapshot.unregister();
    void this.messageListenerAttached;
  }

  private async captureJpeg(): Promise<Blob | null> {
    const live = this.previewIframe?.nativeElement;
    const srcWidth = Math.max(live?.clientWidth || 0, 400);
    const srcHeight = Math.max(live?.clientHeight || 0, 225);

    const capture = document.createElement('iframe');
    capture.setAttribute('sandbox', CAPTURE_IFRAME_SANDBOX);
    capture.setAttribute('aria-hidden', 'true');
    capture.tabIndex = -1;
    capture.style.cssText = [
      'position:fixed',
      'left:-10000px',
      'top:0',
      `width:${srcWidth}px`,
      `height:${srcHeight}px`,
      'border:0',
      'opacity:0',
      'pointer-events:none',
    ].join(';');

    try {
      await this.loadSrcdoc(
        capture,
        buildPreviewSrcdoc({
          html: this.lastHtml,
          css: this.lastCss,
          cdnResources: this.lastCdnResources,
          includeRuntime: false,
        })
      );
      const doc = capture.contentDocument;
      const root = doc?.documentElement;
      if (!doc || !root) return null;

      const pixelRatio = Math.min(1, 800 / Math.max(srcWidth, srcHeight));
      const backgroundColor = this.snapshotBackground(doc);
      const dataUrl = await toJpeg(root, {
        quality: 0.8,
        width: srcWidth,
        height: srcHeight,
        pixelRatio,
        cacheBust: true,
        backgroundColor,
        style: {
          width: `${srcWidth}px`,
          height: `${srcHeight}px`,
          margin: '0',
          backgroundColor,
        },
      });
      return dataUrlToBlob(dataUrl);
    } catch {
      return null;
    } finally {
      capture.remove();
    }
  }

  private loadSrcdoc(iframe: HTMLIFrameElement, srcdoc: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('snapshot iframe timeout')), 4000);
      iframe.onload = () => {
        window.clearTimeout(timer);
        resolve();
      };
      iframe.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('snapshot iframe failed'));
      };
      iframe.srcdoc = srcdoc;
      if (!iframe.isConnected) {
        document.body.appendChild(iframe);
      }
    });
  }

  private snapshotBackground(doc: Document): string {
    const raw = doc.defaultView?.getComputedStyle(doc.body).backgroundColor ?? '';
    const transparent = !raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)';
    return transparent ? '#ffffff' : raw;
  }
}
