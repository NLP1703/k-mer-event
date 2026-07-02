#!/usr/bin/env bash
# ── Configure every GitHub Actions secret needed by the deploy job ───────────
# Run ONCE, from the repo root, on a machine where the `gh` CLI is installed
# and authenticated (`gh auth login`).
#
#   bash deploy/set-github-secrets.sh
#
# Fresh strong values are generated here for JWT_SECRET / DB passwords, so they
# never touch the repo. You only need to provide two things below: the path to
# the VPS private SSH key, and the public domain.
set -euo pipefail

# ── EDIT THESE TWO ───────────────────────────────────────────────────────────
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/tontine_vps}"   # private key that CAN log into the VPS
FRONTEND_URL="${FRONTEND_URL:-https://REPLACE-with-your-domain.com}"
# ─────────────────────────────────────────────────────────────────────────────

# Known infrastructure values (from project memory).
VPS_HOST="${VPS_HOST:-2.25.178.95}"
VPS_USER="${VPS_USER:-tontineadmin}"
VPS_APP_DIR="${VPS_APP_DIR:-/home/tontineadmin/K-MER-EVENT}"

command -v gh >/dev/null || { echo "❌ gh CLI not found. Install it and run 'gh auth login' first."; exit 1; }
[ -f "$SSH_KEY_PATH" ] || { echo "❌ SSH key not found at $SSH_KEY_PATH"; exit 1; }
case "$FRONTEND_URL" in *REPLACE*) echo "❌ Set FRONTEND_URL to your real domain first."; exit 1;; esac

# Generated secrets — single source of truth is GitHub; the deploy job writes
# them into the VPS .env. Regenerating here rotates them.
JWT_SECRET="$(openssl rand -hex 32)"
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
DB_ROOT_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"

echo "Setting secrets on $(gh repo view --json nameWithOwner -q .nameWithOwner)…"
gh secret set VPS_HOST         --body "$VPS_HOST"
gh secret set VPS_USER         --body "$VPS_USER"
gh secret set VPS_APP_DIR      --body "$VPS_APP_DIR"
gh secret set VPS_SSH_KEY      < "$SSH_KEY_PATH"
gh secret set JWT_SECRET       --body "$JWT_SECRET"
gh secret set DB_PASSWORD      --body "$DB_PASSWORD"
gh secret set DB_ROOT_PASSWORD --body "$DB_ROOT_PASSWORD"
gh secret set FRONTEND_URL     --body "$FRONTEND_URL"

echo "✅ All secrets set. (COOKIE_SAMESITE and WEB_PORT are optional — defaults lax / 8081.)"
