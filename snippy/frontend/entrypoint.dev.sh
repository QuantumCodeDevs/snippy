#!/bin/sh
# Local development only — writes public/env.js before ng serve. Not used in production.
set -e

js_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g'
}

PUBLIC_PATH="/app/public"
ENV_JS_FILE="$PUBLIC_PATH/env.js"

mkdir -p "$PUBLIC_PATH"

POCKETBASE_URL_ESC=$(js_escape "${POCKETBASE_URL:-}")

cat > "$ENV_JS_FILE" <<EOF
window.__env = {
  pocketbase_url: "${POCKETBASE_URL_ESC}"
};
EOF

echo "Wrote runtime env to $ENV_JS_FILE"
cat "$ENV_JS_FILE"

exec "$@"
