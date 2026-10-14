export interface RuntimeEnv {
  pocketbase_url: string;
}

declare global {
  interface Window {
    __env?: {
      pocketbase_url?: string;
    };
  }
}

/**
 * Typed access to container-injected `window.__env` (from /env.js).
 * Empty pocketbase_url means same-origin (nginx / ng serve proxy).
 * OAuth providers and SMTP come from GET /api/snippy/meta, not env.js.
 */
export function getRuntimeEnv(): RuntimeEnv {
  const raw = (typeof window !== 'undefined' ? window.__env : undefined) ?? {};
  return {
    pocketbase_url: (raw.pocketbase_url || '').replace(/\/$/, ''),
  };
}

export function pocketBaseBaseUrl(): string {
  const url = getRuntimeEnv().pocketbase_url;
  if (url) return url;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
