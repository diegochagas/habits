#!/bin/bash
# One-time root steps on the ZimaOS server after the clone exists in /DATA/Projects/habits:
#   1. the habits role + database in the PostgreSQL app, and .env.docker (setup-zimaos-db.sh)
#   2. the state/ folder for the list's CSV, owned by the deploy user so it can be edited by hand
#   3. passwordless sudo for exactly the compose command the push-to-deploy hook runs
#   4. the first `docker compose up -d --build`
# Run as root:  sudo bash /DATA/Projects/habits/scripts/zimaos-first-deploy.sh
# Safe to re-run: every step is idempotent.
set -euo pipefail

APP_DIR="${APP_DIR:-/DATA/Projects/habits}"
DEPLOY_USER="${DEPLOY_USER:-diegochagas}"
COMPOSE="$APP_DIR/docker-compose.yml"
SUDOERS_FILE="/etc/sudoers.d/$DEPLOY_USER-deploy-habits"

[ "$(id -u)" = 0 ] || { echo "run as root (sudo)" >&2; exit 1; }
[ -f "$COMPOSE" ] || { echo "$COMPOSE not found: clone the repo first" >&2; exit 1; }

echo "== 1/4 database"
bash "$APP_DIR/scripts/setup-zimaos-db.sh"

echo "== 2/4 list folder"
# Created here, not by docker (which would make it root's): the container writes items.csv with
# the folder's owner so the file can be edited over SMB / in a terminal without sudo.
install -d -m 0775 -o "$DEPLOY_USER" -g samba "$APP_DIR/state"
echo "$APP_DIR/state: owned by $DEPLOY_USER"

echo "== 3/4 sudoers for the deploy hook"
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

echo "== 4/4 compose up"
docker compose -f "$COMPOSE" up -d --build
docker compose -f "$COMPOSE" ps
echo "Done. Next pushes from the workstation redeploy through the post-receive hook."
