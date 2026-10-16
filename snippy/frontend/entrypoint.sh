#!/bin/sh
set -e

js_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g'
}

HTML_ROOT="/usr/share/nginx/html"
ENV_JS_FILE="$HTML_ROOT/env.js"

mkdir -p "$HTML_ROOT"

POCKETBASE_URL_ESC=$(js_escape "${POCKETBASE_URL:-}")

cat > "$ENV_JS_FILE" <<EOF
window.__env = {
  pocketbase_url: "${POCKETBASE_URL_ESC}"
};
EOF
echo "Wrote runtime env to $ENV_JS_FILE"

# Point crawlers at the sitemap when the public URL is known. robots.txt
# requires an absolute Sitemap URL, so this is skipped without SITE_URL.
ROBOTS_FILE="$HTML_ROOT/robots.txt"
if [ -n "${SITE_URL:-}" ] && [ -f "$ROBOTS_FILE" ] && [ -w "$ROBOTS_FILE" ]; then
  SITE_URL_TRIMMED=$(printf '%s' "$SITE_URL" | sed -e 's#/*$##')
  sed -i '/^Sitemap:/d' "$ROBOTS_FILE"
  printf '\nSitemap: %s/sitemap.xml\n' "$SITE_URL_TRIMMED" >> "$ROBOTS_FILE"
  echo "Added sitemap to $ROBOTS_FILE"
fi

exec "$@"
