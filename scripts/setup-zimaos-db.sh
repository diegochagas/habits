#!/bin/bash
# Creates the habits role + database inside the existing ZimaOS PostgreSQL app and writes the
# app's .env.docker. Run as root on the ZimaOS server:
#   sudo bash /DATA/Projects/habits/scripts/setup-zimaos-db.sh
# Safe to re-run: the role/database are only created if missing, and an existing .env.docker
# keeps its password. (Same shape as finances-tracker's setup-zimaos-db.sh.)
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-postgresql}"
APP_DIR="${APP_DIR:-/DATA/Projects/habits}"
APP_DB="${APP_DB:-habits}"
APP_USER="${APP_USER:-habits}"
APP_OWNER="${APP_OWNER:-diegochagas:samba}"
ENV_FILE="$APP_DIR/.env.docker"

command -v docker >/dev/null || { echo "docker not found" >&2; exit 1; }
docker inspect "$PG_CONTAINER" >/dev/null 2>&1 || {
  echo "container '$PG_CONTAINER' not found — is the PostgreSQL app running?" >&2; exit 1; }

# Superuser credentials come from the running container's own environment, so the root-only
# CasaOS compose file never has to be read.
SUPERUSER=$(docker exec "$PG_CONTAINER" printenv POSTGRES_USER 2>/dev/null || echo postgres)
SUPERPASS=$(docker exec "$PG_CONTAINER" printenv POSTGRES_PASSWORD 2>/dev/null || true)
[ -n "$SUPERPASS" ] || { echo "could not read POSTGRES_PASSWORD from $PG_CONTAINER" >&2; exit 1; }
echo "postgres superuser: $SUPERUSER"

psqlq() {
  docker exec -e PGPASSWORD="$SUPERPASS" "$PG_CONTAINER" \
    psql -U "$SUPERUSER" -d postgres -v ON_ERROR_STOP=1 -tAc "$1"
}

if [ -f "$ENV_FILE" ]; then
  APP_PASS=$(sed -n "s|.*://$APP_USER:\([^@]*\)@.*|\1|p" "$ENV_FILE")
  echo "reusing password from existing $ENV_FILE"
fi
if [ -z "${APP_PASS:-}" ]; then
  # od reads a fixed 24 bytes and exits on its own (no head + pipefail trap). ZimaOS has no openssl.
  APP_PASS=$(od -An -tx1 -N24 /dev/urandom | tr -d ' \n')
fi

if [ "$(psqlq "SELECT 1 FROM pg_roles WHERE rolname='$APP_USER'")" = "1" ]; then
  psqlq "ALTER ROLE \"$APP_USER\" WITH LOGIN PASSWORD '$APP_PASS'" >/dev/null
  echo "role '$APP_USER': password set"
else
  psqlq "CREATE ROLE \"$APP_USER\" WITH LOGIN PASSWORD '$APP_PASS'" >/dev/null
  echo "role '$APP_USER': created"
fi

if [ "$(psqlq "SELECT 1 FROM pg_database WHERE datname='$APP_DB'")" = "1" ]; then
  echo "database '$APP_DB': already exists"
else
  psqlq "CREATE DATABASE \"$APP_DB\" OWNER \"$APP_USER\"" >/dev/null
  echo "database '$APP_DB': created"
fi

umask 077
printf 'DATABASE_URL=postgresql://%s:%s@host.docker.internal:5432/%s\nPORT=4180\nHABITS_STORE=postgres\n' \
  "$APP_USER" "$APP_PASS" "$APP_DB" > "$ENV_FILE"
chown "$APP_OWNER" "$ENV_FILE" || echo "warning: could not chown to $APP_OWNER" >&2
chmod 600 "$ENV_FILE"
echo "wrote $ENV_FILE (owner $APP_OWNER, mode 600)"
echo "Done. The password was not printed; it lives only in $ENV_FILE."
