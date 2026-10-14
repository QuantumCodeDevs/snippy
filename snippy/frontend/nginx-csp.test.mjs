import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = import.meta.dirname;

function readFrontend(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

describe('nginx CSP for PocketBase proxy and snippet previews', () => {
  const csp = readFrontend('nginx-csp.inc');
  const site = readFrontend('nginx.site.conf');

  it('allows snapshot capture and CDN assets without opening default-src', () => {
    assert.match(csp, /connect-src[^"]*blob:/);
    assert.match(csp, /connect-src[^"]*data:/);
    assert.match(csp, /connect-src[^"]*https:\/\/api\.cdnjs\.com/);
    assert.match(csp, /connect-src[^"]*https:\/\/cdnjs\.cloudflare\.com/);
    assert.doesNotMatch(csp, /connect-src[^"]*https:(?!\/\/)/);
    assert.match(csp, /script-src[^"]*https:/);
    assert.match(csp, /style-src[^"]*https:/);
    assert.match(csp, /img-src[^"]*'self' data: blob: https:/);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors \$csp_frame_ancestors/);
    assert.doesNotMatch(csp, /default-src \*/);
    assert.doesNotMatch(csp, /auth0/i);
  });

  it('proxies PocketBase on the same origin and keeps embed sandbox headers', () => {
    assert.match(site, /include \/etc\/nginx\/nginx-app-headers\.inc;/);
    assert.match(site, /include \/etc\/nginx\/nginx-embed-headers\.inc;/);
    assert.match(site, /client_max_body_size 6m;/);
    assert.match(site, /location \/api\//);
    assert.match(site, /X-Content-Type-Options "nosniff"/);
    assert.doesNotMatch(site, /location \/_\/ /);
    assert.match(site, /proxy_pass http:\/\/pocketbase:8090/);
    assert.doesNotMatch(site, /add_header Content-Security-Policy/);
    assert.doesNotMatch(site, /minio/i);
  });

  it('keeps clickjacking protection on the app and allows embed framing', () => {
    const appHeaders = readFrontend('nginx-app-headers.inc');
    const embedHeaders = readFrontend('nginx-embed-headers.inc');
    assert.match(appHeaders, /set \$csp_frame_ancestors "'self'"/);
    assert.match(appHeaders, /X-Frame-Options "SAMEORIGIN"/);
    assert.match(embedHeaders, /set \$csp_frame_ancestors "\*"/);
    assert.doesNotMatch(embedHeaders, /X-Frame-Options/);
  });
});
