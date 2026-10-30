#!/bin/sh
set -e

HTML_ROOT="/usr/share/nginx/html"

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
