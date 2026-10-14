#!/usr/bin/env bash
# Operator password reset when SMTP is disabled.
# Usage: ./scripts/reset-user-password.sh user@example.com
# Prompts for the password without echoing it.
# Non-interactive: SNIPPY_NEW_PASSWORD='...' ./scripts/reset-user-password.sh user@example.com
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="$ROOT/.env"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <email>" >&2
  echo "The password is prompted, or set SNIPPY_NEW_PASSWORD." >&2
  exit 1
fi

EMAIL=$1
CALLER_PASSWORD=${SNIPPY_NEW_PASSWORD:-}

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -n "$CALLER_PASSWORD" ]]; then
  PASSWORD=$CALLER_PASSWORD
else
  read -r -s -p "New password: " PASSWORD
  echo
fi

if [[ ${#PASSWORD} -lt 8 ]]; then
  echo "Password must be at least 8 characters." >&2
  exit 1
fi

PB_URL="${PB_URL:-http://127.0.0.1:8090}"
ADMIN_EMAIL="${PB_ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  echo "PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in .env" >&2
  exit 1
fi

PB_URL="$PB_URL" \
PB_ADMIN_EMAIL="$ADMIN_EMAIL" \
PB_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
SNIPPY_TARGET_EMAIL="$EMAIL" \
SNIPPY_NEW_PASSWORD="$PASSWORD" \
python3 - <<'PY'
import json, os, urllib.error, urllib.parse, urllib.request

pb_url = os.environ["PB_URL"]
admin_email = os.environ["PB_ADMIN_EMAIL"]
admin_password = os.environ["PB_ADMIN_PASSWORD"]
email = os.environ["SNIPPY_TARGET_EMAIL"]
password = os.environ["SNIPPY_NEW_PASSWORD"]

def req(method, path, payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(pb_url + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        body = err.read().decode()
        raise SystemExit(f"HTTP {err.code} {path}: {body}") from err

auth = req(
    "POST",
    "/api/collections/_superusers/auth-with-password",
    {"identity": admin_email, "password": admin_password},
)
token = auth.get("token") or ""
if not token:
    raise SystemExit("Could not authenticate as superuser.")

filt = "email = " + json.dumps(email)
listed = req(
    "GET",
    "/api/collections/users/records?page=1&perPage=1&filter=" + urllib.parse.quote(filt),
    None,
    token,
)
items = listed.get("items") or []
if not items:
    raise SystemExit(f"No user found for {email}")

req(
    "PATCH",
    f"/api/collections/users/records/{items[0]['id']}",
    {"password": password, "passwordConfirm": password},
    token,
)
print(f"Password updated for {email}")
PY
