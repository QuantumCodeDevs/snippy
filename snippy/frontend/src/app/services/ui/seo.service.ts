import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export const SITE_NAME = 'Snippy';
export const DEFAULT_TITLE = 'Snippy: live HTML, CSS & JavaScript playground';
export const DEFAULT_IMAGE = '/assets/images/example-snippet.png';
export const DEFAULT_DESCRIPTION =
  'Write HTML, CSS, and JavaScript with a live preview. Save snippets, start from templates, and share, fork, or embed your work.';

/** Per-route SEO, set in route `data.seo` and refined by pages once content loads. */
export interface SeoData {
  /** Page title without the site suffix. Omit for the site default. */
  title?: string;
  description?: string;
  /** Absolute or root-relative preview image (snippet snapshot). Defaults to the product shot. */
  image?: string | null;
  /** Keep the page out of search results (private, auth, editor-only pages). */
  noindex?: boolean;
  type?: 'website' | 'article' | 'profile';
  /** Root-relative canonical path; defaults to the current path without query. */
  canonicalPath?: string;
  /** schema.org JSON-LD object, or null to remove it. */
  jsonLd?: Record<string, unknown> | null;
}

/** Full `<title>` text for a page title. */
export function documentTitle(title?: string | null): string {
  const clean = title?.trim();
  return clean ? `${clean} · ${SITE_NAME}` : DEFAULT_TITLE;
}

/** Collapse whitespace and cut to a search-snippet friendly length. */
export function seoDescription(text: string | null | undefined, max = 160): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return DEFAULT_DESCRIPTION;
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/**
 * Keeps `<title>`, description, canonical, robots, Open Graph, Twitter, and
 * JSON-LD in sync with the current page. Snippy is client-rendered, so this
 * serves crawlers that run JavaScript (Google, Bing). Link-preview bots that do
 * not run JS see the defaults in index.html.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  /** Current page title (without suffix), announced to screen readers on navigation. */
  readonly pageTitle = signal<string>(SITE_NAME);

  private current: SeoData = {};

  /** Replace all SEO tags for a new page. */
  set(data: SeoData) {
    this.current = { ...data };
    this.apply();
  }

  /** Refine the current page once its content has loaded. */
  update(data: Partial<SeoData>) {
    this.current = { ...this.current, ...data };
    this.apply();
  }

  private apply() {
    const data = this.current;
    const fullTitle = documentTitle(data.title);
    const description = seoDescription(data.description);
    const url = this.absoluteUrl(data.canonicalPath ?? this.currentPath());
    const image = this.absoluteUrl(data.image || DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);
    this.pageTitle.set(data.title?.trim() || SITE_NAME);

    this.setName('description', description);
    this.setName('robots', data.noindex ? 'noindex, nofollow' : 'index, follow');

    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:title', data.title?.trim() || DEFAULT_TITLE);
    this.setProperty('og:description', description);
    this.setProperty('og:type', data.type ?? 'website');
    this.setProperty('og:url', url);
    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', data.title?.trim() || DEFAULT_TITLE);
    this.setName('twitter:description', description);
    this.setProperty('og:image', image);
    this.setName('twitter:image', image);

    this.setCanonical(data.noindex ? null : url);
    this.setJsonLd(data.jsonLd ?? null);
  }

  private setName(name: string, content: string) {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }

  private setProperty(property: string, content: string) {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  private setCanonical(url: string | null) {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: Record<string, unknown> | null) {
    const head = this.document.head;
    let script = head.querySelector<HTMLScriptElement>('script#seo-jsonld');
    if (!data) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.document.createElement('script');
      script.id = 'seo-jsonld';
      script.type = 'application/ld+json';
      head.appendChild(script);
    }
    // Escape `<` so snippet text can never close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }

  private currentPath(): string {
    const loc = this.document.location;
    return loc ? loc.pathname : '/';
  }

  private absoluteUrl(pathOrUrl: string): string {
    try {
      return new URL(pathOrUrl, this.document.location?.origin ?? 'http://localhost').toString();
    } catch {
      return pathOrUrl;
    }
  }
}
