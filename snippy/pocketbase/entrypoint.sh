#!/bin/sh
set -e

if [ -n "${PB_ADMIN_EMAIL:-}" ] && [ -n "${PB_ADMIN_PASSWORD:-}" ]; then
  /usr/local/bin/pocketbase superuser upsert \
    "${PB_ADMIN_EMAIL}" \
    "${PB_ADMIN_PASSWORD}" \
    --dir=/pb_data
fi

append_origin() {
  origin=$1
  [ -z "$origin" ] && return
  origin=$(printf '%s' "$origin" | sed 's:/*$::')
  case ",$ORIGINS," in
    *",$origin,"*) ;;
    *)
      if [ -n "$ORIGINS" ]; then
        ORIGINS="$ORIGINS,$origin"
      else
        ORIGINS="$origin"
      fi
      ;;
  esac
}

ORIGINS=""
append_origin "http://localhost:4200"
append_origin "http://127.0.0.1:4200"
append_origin "${PB_APP_URL:-}"

# Extra operator origins (comma-separated). "*" is ignored — use explicit hosts.
old_ifs=$IFS
IFS=','
for extra in ${PB_ALLOWED_ORIGINS:-}; do
  extra=$(printf '%s' "$extra" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [ "$extra" = "*" ] && continue
  append_origin "$extra"
done
IFS=$old_ifs

exec /usr/local/bin/pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir=/pb_data \
  --migrationsDir=/pb/pb_migrations \
  --hooksDir=/pb/pb_hooks \
  --origins="${ORIGINS}"
