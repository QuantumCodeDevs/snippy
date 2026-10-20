export interface CdnResource {
  resourceType?: string;
  url?: string;
}

export interface CdnLibraryHit {
  name: string;
  description: string;
  version: string;
  /** CDN URL for the file that matches the tab being searched. */
  url: string | null;
  /** Set when the library ships a CSS file. */
  cssUrl?: string | null;
  /** Set when the library ships a JS file. */
  jsUrl?: string | null;
}

export interface CdnjsLibraryResult {
  name: string;
  description?: string;
  version?: string;
  /** Default file, or a list when the library publishes more than one. */
  filename?: string | string[];
  latest?: string;
  fileType?: string;
}

export interface CdnjsSearchResponse {
  results: CdnjsLibraryResult[];
  total: number;
  available: number;
}

export interface CdnjsLibraryDetail {
  version?: string;
  filename?: string | string[];
  latest?: string;
  assets?: Array<{ version: string; files: string[] }>;
}
