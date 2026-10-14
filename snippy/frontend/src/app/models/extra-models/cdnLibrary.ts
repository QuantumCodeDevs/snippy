export interface CdnResource {
  resourceType?: string;
  url?: string;
}

export interface CdnLibraryHit {
  name: string;
  description: string;
  version: string;
  /** CDN URL for the default file of the requested type, when already known from search. */
  url: string | null;
}

export interface CdnjsLibraryResult {
  name: string;
  description?: string;
  version?: string;
  filename?: string;
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
  filename?: string;
  latest?: string;
  assets?: Array<{ version: string; files: string[] }>;
}
