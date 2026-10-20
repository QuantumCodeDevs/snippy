// CDNJS API service for searching and resolving library URLs.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  CdnLibraryHit,
  CdnResource,
  CdnjsLibraryDetail,
  CdnjsLibraryResult,
  CdnjsSearchResponse,
} from '@app/models/extra-models/cdnLibrary';

const CDNJS_API = 'https://api.cdnjs.com/libraries';
const CDNJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs';
const CDNJS_SEARCH_LIMIT = '50';
const CDNJS_RESULT_LIMIT = 12;
/** Detail lookups for libraries whose default file is the other extension. */
const CDNJS_LOOKUP_LIMIT = 12;

// CDNJS API service for searching and resolving library URLs.
@Injectable({ providedIn: 'root' })
export class CdnApiService {
  private http = inject(HttpClient);

  //#region Search

  /**
   * Search cdnjs for libraries that ship `resourceType`.
   * A library whose default file is the other extension is still included when its
   * file list contains one of this type (Bootstrap's default is JS, and it also ships CSS).
   */
  searchLibraries(query: string, resourceType: 'css' | 'js'): Observable<CdnLibraryHit[]> {
    const q = query.trim();
    if (!q) return of([]);

    const params = new HttpParams()
      .set('search', q)
      .set('fields', 'description,version,filename,latest,fileType')
      .set('limit', CDNJS_SEARCH_LIMIT);

    return this.http.get<CdnjsSearchResponse>(CDNJS_API, { params }).pipe(
      switchMap((res) => this.rankSearchHits(res.results ?? [], resourceType)),
      catchError(() => of([]))
    );
  }

  /**
   * CSS and JS URLs for a library. Both are returned when the file list has both,
   * so picking the library from either tab can add each file.
   */
  resolveLibraryFiles(hit: CdnLibraryHit): Observable<CdnResource[]> {
    return this.loadDetail(hit.name).pipe(
      map((detail) => this.resourcesFromDetail(hit.name, detail)),
      catchError(() => of(this.resourcesFromHit(hit)))
    );
  }

  //#endregion Search

  //#region Ranking

  /**
   * Keep search rank. Filename matches are free; other rows are checked against
   * their asset list until the picker is full.
   */
  private rankSearchHits(
    rows: CdnjsLibraryResult[],
    resourceType: 'css' | 'js'
  ): Observable<CdnLibraryHit[]> {
    const ranked: Array<CdnLibraryHit | null> = [];
    const lookups: Array<{ index: number; lib: CdnjsLibraryResult }> = [];

    rows.forEach((lib, index) => {
      if (this.libraryMatchesType(lib, resourceType)) {
        ranked[index] = this.toHit(lib, resourceType);
        return;
      }
      if (lookups.length < CDNJS_LOOKUP_LIMIT) lookups.push({ index, lib });
    });

    const directCount = ranked.filter((hit) => !!hit).length;
    if (directCount >= CDNJS_RESULT_LIMIT || lookups.length === 0) {
      return of(this.takeHits(ranked));
    }

    return forkJoin(
      lookups.map(({ index, lib }) =>
        this.loadDetail(lib.name).pipe(
          map((detail) => {
            const urls = this.urlsFromDetail(lib.name, detail);
            const url = urls[resourceType];
            if (!url) return null;
            const hit = this.toHit(lib, resourceType);
            hit.url = url;
            hit.cssUrl = urls.css;
            hit.jsUrl = urls.js;
            return { index, hit };
          }),
          catchError(() => of(null))
        )
      )
    ).pipe(
      map((found) => {
        for (const item of found) {
          if (item) ranked[item.index] = item.hit;
        }
        return this.takeHits(ranked);
      })
    );
  }

  private takeHits(ranked: Array<CdnLibraryHit | null>): CdnLibraryHit[] {
    return ranked.filter((hit): hit is CdnLibraryHit => !!hit).slice(0, CDNJS_RESULT_LIMIT);
  }

  private loadDetail(name: string): Observable<CdnjsLibraryDetail> {
    const params = new HttpParams().set('fields', 'version,filename,latest,assets');
    return this.http.get<CdnjsLibraryDetail>(`${CDNJS_API}/${encodeURIComponent(name)}`, {
      params,
    });
  }

  //#endregion Ranking

  //#region URL helpers

  /** Map a cdnjs search row to a picker hit, including both types when `filename` lists them. */
  private toHit(lib: CdnjsLibraryResult, resourceType: 'css' | 'js'): CdnLibraryHit {
    const version = lib.version ?? '';
    const files = this.filenamesOf(lib.filename);
    const urls = version ? this.urlsFor(lib.name, version, files) : { css: null, js: null };

    let url = urls[resourceType];
    if (!url && lib.latest && this.urlMatchesType(lib.latest, resourceType)) {
      url = lib.latest;
    }
    if (resourceType === 'css' && !urls.css && url) urls.css = url;
    if (resourceType === 'js' && !urls.js && url) urls.js = url;

    return {
      name: lib.name,
      description: lib.description ?? '',
      version,
      url,
      cssUrl: urls.css,
      jsUrl: urls.js,
    };
  }

  private resourcesFromDetail(name: string, detail: CdnjsLibraryDetail): CdnResource[] {
    const urls = this.urlsFromDetail(name, detail);
    return this.resourcesFromUrls(urls.css, urls.js);
  }

  private resourcesFromHit(hit: CdnLibraryHit): CdnResource[] {
    return this.resourcesFromUrls(hit.cssUrl ?? null, hit.jsUrl ?? null, hit.url);
  }

  private resourcesFromUrls(
    css: string | null,
    js: string | null,
    extra?: string | null
  ): CdnResource[] {
    const resources: CdnResource[] = [];
    const push = (url: string | null | undefined) => {
      if (!url || resources.some((resource) => resource.url === url)) return;
      const resourceType = this.extensionOf(url);
      if (!resourceType) return;
      resources.push({ resourceType, url });
    };
    push(css);
    push(js);
    push(extra);
    return resources;
  }

  private urlsFromDetail(
    name: string,
    detail: CdnjsLibraryDetail
  ): { css: string | null; js: string | null } {
    const version = detail.version ?? '';
    const asset = detail.assets?.find((entry) => entry.version === version) ?? detail.assets?.[0];
    const files = [...(asset?.files ?? [])];
    for (const filename of this.filenamesOf(detail.filename)) {
      if (!files.includes(filename)) files.push(filename);
    }
    const urls = version ? this.urlsFor(name, version, files) : { css: null, js: null };
    if (!urls.css && detail.latest && this.urlMatchesType(detail.latest, 'css')) {
      urls.css = detail.latest;
    }
    if (!urls.js && detail.latest && this.urlMatchesType(detail.latest, 'js')) {
      urls.js = detail.latest;
    }
    return urls;
  }

  private urlsFor(
    name: string,
    version: string,
    files: string[]
  ): { css: string | null; js: string | null } {
    const cssFile = this.pickFile(files, 'css', name);
    const jsFile = this.pickFile(files, 'js', name);
    return {
      css: cssFile ? `${CDNJS_BASE}/${name}/${version}/${cssFile}` : null,
      js: jsFile ? `${CDNJS_BASE}/${name}/${version}/${jsFile}` : null,
    };
  }

  /** Score candidate files: minified library-named first, skip maps/rtl/esm. */
  private pickFile(
    files: string[],
    resourceType: 'css' | 'js',
    libraryName: string
  ): string | null {
    const ext = `.${resourceType}`;
    const candidates = files.filter(
      (f) => f.endsWith(ext) && !f.endsWith('.map') && !f.includes('.map.')
    );
    if (!candidates.length) return null;

    const minFiles = candidates.filter((f) => /\.min\./.test(f));
    const pool = minFiles.length ? minFiles : candidates;

    const scored = pool.map((f) => {
      const base = f.split('/').pop() ?? f;
      let score = 0;
      if (
        base === `${libraryName}.min.${resourceType}` ||
        base === `${libraryName}.${resourceType}`
      ) {
        score += 30;
      }
      if (base.startsWith(libraryName)) score += 10;
      if (resourceType === 'js' && base.includes('bundle') && base.includes('.min.')) score += 8;
      if (/(rtl|grid|reboot|utilities|esm)/i.test(base)) score -= 8;
      return { f, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.f ?? null;
  }

  /** True when `latest` or any listed filename ends with the tab's extension. */
  private libraryMatchesType(lib: CdnjsLibraryResult, resourceType: 'css' | 'js'): boolean {
    const names = this.filenamesOf(lib.filename);
    if (lib.latest) names.push(lib.latest.split('?')[0]);
    return names.some((filename) => this.filenameMatchesType(filename, resourceType));
  }

  /** cdnjs `filename` is a string, or an array when the package publishes several files. */
  private filenamesOf(filename: string | string[] | undefined): string[] {
    if (Array.isArray(filename)) {
      return filename.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
    }
    if (typeof filename === 'string' && filename.trim()) return [filename];
    return [];
  }

  private extensionOf(url: string): 'css' | 'js' | null {
    const path = url.split('?')[0].toLowerCase();
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.js')) return 'js';
    return null;
  }

  /** True when the URL path ends with `.css` or `.js`. */
  private urlMatchesType(url: string, resourceType: 'css' | 'js'): boolean {
    return this.filenameMatchesType(url.split('?')[0], resourceType);
  }

  /** True when `filename` ends with the given extension. */
  private filenameMatchesType(filename: string, resourceType: 'css' | 'js'): boolean {
    return filename.toLowerCase().endsWith(`.${resourceType}`);
  }

  //#endregion URL helpers
}
