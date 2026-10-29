#!/bin/bash
# One-time root steps on the ZimaOS server after the clone exists in /DATA/Projects/habits:
#   1. the habits role + database in the PostgreSQL app, and .env.docker (setup-zimaos-db.sh)
#   2. passwordless sudo for exactly the compose command the push-to-deploy hook runs
#   3. the first `docker compose up -d --build`
# Run as root:  sudo bash /DATA/Projects/habits/scripts/zimaos-first-deploy.sh
# Safe to re-run: every step is idempotent.
set -euo pipefail

APP_DIR="${APP_DIR:-/DATA/Projects/habits}"
DEPLOY_USER="${DEPLOY_USER:-diegochagas}"
COMPOSE="$APP_DIR/docker-compose.yml"
SUDOERS_FILE="/etc/sudoers.d/$DEPLOY_USER-deploy-habits"

[ "$(id -u)" = 0 ] || { echo "run as root (sudo)" >&2; exit 1; }
[ -f "$COMPOSE" ] || { echo "$COMPOSE not found: clone the repo first" >&2; exit 1; }

echo "== 1/3 database"
bash "$APP_DIR/scripts/setup-zimaos-db.sh"

echo "== 2/3 sudoers for the deploy hook"
candidate=$(mktemp)
echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/docker compose -f $COMPOSE up -d --build" > "$candidate"
visudo -cqf "$candidate"
if cmp -s "$candidate" "$SUDOERS_FILE"; then
  echo "$SUDOERS_FILE: up to date"
else
  install -m 0440 -o root -g root "$candidate" "$SUDOERS_FILE"
  echo "$SUDOERS_FILE: installed"
fi
rm -f "$candidate"

echo "== 3/3 compose up"
docker compose -f "$COMPOSE" up -d --build
docker compose -f "$COMPOSE" ps
echo "Done. Next pushes from the workstation redeploy through the post-receive hook."
