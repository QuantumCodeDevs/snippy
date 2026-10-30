# Document CSP. Requires $csp_frame_ancestors in this location
# ('self' for the app, * for /embed/). Do not include from /api/.
#
# script-src is 'self' only: no inline scripts, no eval, no third-party script.
# index.html loads /boot.js, and critical-CSS inlining is off
# (angular.json) because it emits an inline script. Snippet code never runs under
# this policy: the live preview loads /preview.html, which has its own CSP
# (nginx-preview-headers.inc). The snapshot capture iframe is a srcdoc with no scripts.
#
# Extra sources vs a strict default:
# - style-src 'unsafe-inline' https: — Angular and CodeMirror inject <style> tags;
#   snapshot capture inlines snippet CSS and CDN stylesheets
# - img-src data: blob: https: — assets, avatars, data-URL snapshots
# - font-src https: data: — CDN stylesheets often @font-face from the same host
# - connect-src api.cdnjs.com — library search and detail
# - connect-src cdnjs.cloudflare.com — snapshot inlining of library CSS and fonts
# - connect-src blob: data: — html-to-image / fetch(dataUrl) snapshot capture
# Same-origin PocketBase proxy — no extra connect/frame hosts
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' blob: data: https://api.cdnjs.com https://cdnjs.cloudflare.com; frame-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors $csp_frame_ancestors" always;
