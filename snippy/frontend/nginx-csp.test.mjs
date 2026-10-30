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
    assert.match(csp, /script-src 'self';/);
    const header = csp.match(/add_header Content-Security-Policy "([^"]+)"/)[1];
    assert.doesNotMatch(header, /'unsafe-eval'/);
    assert.doesNotMatch(header, /script-src[^;]*'unsafe-inline'/);
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
    assert.match(site, /location \^~ \/_\/ \{/);
    assert.match(site, /try_files \/oauth2-popup-close\.html =404;/);
    const oauthClose = site.slice(site.indexOf('location ^~ /_/'), site.indexOf('location /api/'));
    assert.doesNotMatch(oauthClose, /proxy_pass/);
    assert.match(oauthClose, /script-src 'self'/);
    assert.match(site, /proxy_pass http:\/\/pocketbase:8090/);
    assert.match(site, /proxy_redirect default;/);
    assert.match(site, /absolute_redirect off;/);
    assert.match(site, /location = \/sitemap\.xml \{[\s\S]*?proxy_pass http:\/\/pocketbase:8090\/api\/snippy\/sitemap\.xml;/);
    const redirect = site.match(/proxy_redirect '([^']+)'/);
    assert.ok(redirect);
    const oauthLocation = new RegExp(redirect[1].replace(/^~\*/, ''));
    for (const location of [
      '../_/#/auth/oauth2-redirect-success',
      '../_/#/auth/oauth2-redirect-failure',
      '/_/#/auth/oauth2-redirect-success',
      '/_/#/auth/oauth2-redirect-failure',
      'https://snippy.example/_/#/auth/oauth2-redirect-success',
      'http://pocketbase:8090/_/#/auth/oauth2-redirect-failure',
    ]) {
      assert.match(location, oauthLocation);
    }
    assert.doesNotMatch('https://example.com/api/files/x', oauthLocation);
    const withoutOauthClose = site.replace(oauthClose, '');
    assert.doesNotMatch(withoutOauthClose, /add_header Content-Security-Policy/);
    assert.doesNotMatch(site, /minio/i);
  });

  it('closes the OAuth popup from the static /_/ page', () => {
    const html = readFrontend('public/oauth2-popup-close.html');
    const js = readFrontend('public/oauth2-popup-close.js');
    const index = readFrontend('src/index.html');
    const main = readFrontend('src/main.ts');
    assert.match(html, /src="\/oauth2-popup-close\.js"/);
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)/);
    assert.match(js, /window\.open\('', '_self'\)/);
    assert.match(js, /window\.close\(\)/);
    assert.match(js, /oauth2-redirect-failure/);
    const boot = readFrontend('public/boot.js');
    assert.match(index, /<script src="\/boot\.js"><\/script>/);
    assert.match(boot, /window\.__snippyOauthPopup = true/);
    assert.match(boot, /window\.open\('', '_self'\)/);
    assert.match(boot, /snippy-theme/);
    assert.match(index, /id="oauth-popup-msg"/);
    assert.match(main, /function closeOauthPopup/);
    assert.match(main, /window\.open\('', '_self'\)/);
    assert.match(main, /isOauthPopup\(\)/);
  });

  it('keeps clickjacking protection on the app and allows embed framing', () => {
    const appHeaders = readFrontend('nginx-app-headers.inc');
    const embedHeaders = readFrontend('nginx-embed-headers.inc');
    assert.match(appHeaders, /set \$csp_frame_ancestors "'self'"/);
    assert.match(appHeaders, /X-Frame-Options "SAMEORIGIN"/);
    assert.match(embedHeaders, /set \$csp_frame_ancestors "\*"/);
    assert.doesNotMatch(embedHeaders, /X-Frame-Options/);
  });

  it('keeps index.html free of inline scripts and critical-CSS inlining', () => {
    const index = readFrontend('src/index.html');
    assert.doesNotMatch(index, /<script(?![^>]*\ssrc=)/);
    const angular = JSON.parse(readFrontend('angular.json'));
    const prod = angular.projects.frontend.architect.build.configurations.production;
    assert.equal(prod.optimization.styles.inlineCritical, false);
  });

  it('serves the live preview page with its own sandboxed CSP', () => {
    const site = readFrontend('nginx.site.conf');
    const preview = readFrontend('nginx-preview-headers.inc');
    const page = readFrontend('public/preview.html');
    const component = readFrontend(
      'src/app/components/editor/snippet-preview/snippet-preview.component.ts'
    );
    const dockerfile = readFrontend('Dockerfile');
    assert.match(
      site,
      /location = \/preview\.html \{\s*include \/etc\/nginx\/nginx-preview-headers\.inc;\s*\}/
    );
    assert.match(dockerfile, /COPY \.\/nginx-preview-headers\.inc/);
    assert.match(
      preview,
      /Content-Security-Policy "sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads;/
    );
    const sandbox = preview.match(/Content-Security-Policy "(sandbox[^;]*);/)[1];
    assert.doesNotMatch(sandbox, /allow-same-origin/);
    assert.doesNotMatch(sandbox, /allow-top-navigation/);
    assert.doesNotMatch(sandbox, /allow-popups-to-escape-sandbox/);
    assert.match(page, /event\.source !== window\.parent/);
    assert.match(page, /window\.parent === window\) return/);
    assert.match(component, /PREVIEW_PAGE_URL = '\/preview\.html'/);
    assert.doesNotMatch(component, /previewIframe\.nativeElement\.srcdoc/);
  });
});
