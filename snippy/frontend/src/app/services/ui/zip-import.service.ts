import { Injectable } from '@angular/core';
import type { CdnResource } from '@app/models/extra-models/cdnLibrary';
import type { SnippetFile } from '@app/models/base-models/snippet-file';

const MAX_FILES = 20;
const MAX_UNCOMPRESSED = 2 * 1024 * 1024;

export interface ImportedPen {
  name: string;
  html: string;
  css: string;
  js: string;
  cdnResources: CdnResource[];
}

@Injectable({ providedIn: 'root' })
export class ZipImportService {
  //#region Import

  /** Unzip a CodePen-style archive into HTML/CSS/JS + CDN links. */
  async importFile(file: File): Promise<ImportedPen> {
    // Lazy: the footer (initial bundle) injects this service, but imports are rare.
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter((e) => !e.dir);
    if (entries.length > MAX_FILES) {
      throw new Error('ZIP has too many files');
    }

    let html = '';
    let css = '';
    let js = '';
    let uncompressed = 0;

    for (const entry of entries) {
      const name = entry.name.replace(/\\/g, '/').split('/').pop() ?? entry.name;
      const lower = name.toLowerCase();
      const text = await entry.async('string');
      uncompressed += text.length;
      if (uncompressed > MAX_UNCOMPRESSED) {
        throw new Error('ZIP contents are too large');
      }
      if (lower === 'index.html' || lower.endsWith('.html')) {
        if (!html || lower === 'index.html') html = text;
      } else if (lower === 'style.css' || lower.endsWith('.css')) {
        if (!css || lower === 'style.css') css = text;
      } else if (lower === 'script.js' || lower.endsWith('.js')) {
        if (!js || lower === 'script.js') js = text;
      }
    }

    const extracted = this.extractFromHtml(html);
    return {
      name: file.name.replace(/\.zip$/i, '') || 'Imported',
      html: extracted.body,
      css: css || extracted.style,
      js: js || extracted.script,
      cdnResources: extracted.cdn,
    };
  }

  /** Convert an import into the three editor `SnippetFile`s. */
  filesFromImport(imported: ImportedPen): SnippetFile[] {
    return [
      { fileType: 'html', content: imported.html },
      { fileType: 'css', content: imported.css },
      { fileType: 'js', content: imported.js },
    ];
  }

  //#endregion Import

  //#region HTML extract

  /** Pull body, inline style/script, and external CDN URLs out of `index.html`. */
  private extractFromHtml(html: string): {
    body: string;
    style: string;
    script: string;
    cdn: CdnResource[];
  } {
    const cdn: CdnResource[] = [];
    const linkRe = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
    const scriptRe = /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html))) {
      const href = m[1];
      if (!href.endsWith('style.css') && /^https?:/i.test(href)) {
        cdn.push({ resourceType: 'css', url: href });
      }
    }
    while ((m = scriptRe.exec(html))) {
      const src = m[1];
      if (src !== 'script.js' && /^https?:/i.test(src)) {
        cdn.push({ resourceType: 'js', url: src });
      }
    }

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let body = bodyMatch ? bodyMatch[1] : html;
    body = body.replace(/<script[^>]+src=["']script\.js["'][^>]*><\/script>/gi, '').trim();

    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const inlineScript = html.match(/<script(?![^>]+src)[^>]*>([\s\S]*?)<\/script>/i);

    return {
      body,
      style: styleMatch ? styleMatch[1].trim() : '',
      script: inlineScript ? inlineScript[1].trim() : '',
      cdn,
    };
  }

  //#endregion HTML extract
}
