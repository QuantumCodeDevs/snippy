# Document CSP. Requires $csp_frame_ancestors in this location
# ('self' for the app, * for /embed/). Do not include from /api/.
#
# Extra sources vs a strict default:
# - script-src/style-src 'unsafe-inline' 'unsafe-eval' https: — Angular, the code
#   editor, and snippet CDN libraries. Snippet HTML/JS runs in a sandboxed srcdoc
#   iframe (no allow-same-origin). Do not drop unsafe-inline or unsafe-eval here;
#   that breaks the editor and live preview. The sandbox is the XSS boundary.
# - img-src data: blob: https: — assets, avatars, data-URL snapshots
# - font-src https: data: — CDN stylesheets often @font-face from the same host
# - connect-src blob: data: — html-to-image / fetch(dataUrl) snapshot capture
# Same-origin PocketBase proxy — no extra connect/frame hosts
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' blob: data:; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors $csp_frame_ancestors" always;
