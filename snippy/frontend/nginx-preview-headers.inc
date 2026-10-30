# Live preview page (/preview.html). Snippet HTML/JS runs here, so this CSP keeps
# the loose script-src the app CSP no longer allows. `sandbox` forces an opaque
# origin even when the page is opened directly or framed without a sandbox
# attribute, so snippet code can never read Snippy's localStorage or cookies.
# No allow-same-origin, allow-top-navigation, or allow-popups-to-escape-sandbox.
# frame-ancestors is * because embeds frame this page through third-party sites.
include /etc/nginx/nginx-security-headers.inc;
add_header Content-Security-Policy "sandbox allow-scripts allow-forms allow-modals allow-popups allow-downloads; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' blob: data: https://api.cdnjs.com https://cdnjs.cloudflare.com; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors *" always;
add_header Cache-Control "no-cache" always;
