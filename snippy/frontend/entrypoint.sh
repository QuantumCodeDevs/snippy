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

exec "$@"
