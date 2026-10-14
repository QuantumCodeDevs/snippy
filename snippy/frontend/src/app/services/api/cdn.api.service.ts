// CDNJS API service for searching and resolving library URLs.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  CdnLibraryHit,
  CdnjsLibraryDetail,
  CdnjsLibraryResult,
  CdnjsSearchResponse,
} from '@app/models/extra-models/cdnLibrary';

const CDNJS_API = 'https://api.cdnjs.com/libraries';
const CDNJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs';

// CDNJS API service for searching and resolving library URLs.
@Injectable({ providedIn: 'root' })
export class CdnApiService {
  private http = inject(HttpClient);

  //#region Search

  /** Search cdnjs and map hits whose `latest` URL matches `resourceType`. */
  searchLibraries(query: string, resourceType: 'css' | 'js'): Observable<CdnLibraryHit[]> {
    const q = query.trim();
    if (!q) return of([]);

    const params = new HttpParams()
      .set('search', q)
      .set('fields', 'description,version,filename,latest,fileType')
      .set('limit', '12');

    return this.http.get<CdnjsSearchResponse>(CDNJS_API, { params }).pipe(
      map((res) => (res.results ?? []).map((lib) => this.toHit(lib, resourceType))),
      catchError(() => of([]))
    );
  }

  /**
   * Resolve a CDN URL for the given library and resource type.
   * Uses search `latest` when it already matches; otherwise picks a file from library assets.
   */
  resolveLibraryUrl(hit: CdnLibraryHit, resourceType: 'css' | 'js'): Observable<string | null> {
    if (hit.url && this.urlMatchesType(hit.url, resourceType)) {
      return of(hit.url);
    }

    const params = new HttpParams().set('fields', 'version,filename,latest,assets');
    return this.http
      .get<CdnjsLibraryDetail>(`${CDNJS_API}/${encodeURIComponent(hit.name)}`, { params })
      .pipe(
        map((detail) => this.pickUrlFromDetail(hit.name, detail, resourceType)),
        catchError(() => of(null))
      );
  }

  //#endregion Search

  //#region URL helpers

  /** Map a cdnjs search row to a picker hit, preferring a typed `latest` URL. */
  private toHit(lib: CdnjsLibraryResult, resourceType: 'css' | 'js'): CdnLibraryHit {
    const version = lib.version ?? '';
    let url: string | null = null;

    if (lib.latest && this.urlMatchesType(lib.latest, resourceType)) {
      url = lib.latest;
    } else if (lib.filename && version && this.filenameMatchesType(lib.filename, resourceType)) {
      url = `${CDNJS_BASE}/${lib.name}/${version}/${lib.filename}`;
    }

    return {
      name: lib.name,
      description: lib.description ?? '',
      version,
      url,
    };
  }

  /** Pick a `.css` / `.js` file URL from a library detail payload. */
  private pickUrlFromDetail(
    name: string,
    detail: CdnjsLibraryDetail,
    resourceType: 'css' | 'js'
  ): string | null {
    if (detail.latest && this.urlMatchesType(detail.latest, resourceType)) {
      return detail.latest;
    }

    const version = detail.version;
    if (!version) return null;

    const asset = detail.assets?.find((a) => a.version === version) ?? detail.assets?.[0];
    const file = asset ? this.pickFile(asset.files, resourceType, name) : null;
    return file ? `${CDNJS_BASE}/${name}/${version}/${file}` : null;
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
