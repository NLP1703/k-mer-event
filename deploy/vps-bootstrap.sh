#!/usr/bin/env bash
# ── One-shot VPS preparation for the Docker + CI/CD deploy ───────────────────
# Run ON THE VPS, as the deploy user (tontineadmin), ONCE:
#
#   DOMAIN=your-domain.com bash vps-bootstrap.sh
#
# It installs Docker, clones the repo into $APP_DIR, installs the host Nginx
# reverse proxy and requests a TLS certificate. It stops the old PM2/Nginx-static
# setup if present. After this, pushing to `main` deploys automatically.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/K-MER-EVENT}"
REPO_URL="${REPO_URL:-https://github.com/NLP1703/k-mer-event.git}"
DOMAIN="${DOMAIN:?Set DOMAIN=your-domain.com}"

echo "▶ 1/5 Installing Docker (if missing)…"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "  ⚠️  You were added to the 'docker' group — log out/in (or 'newgrp docker') before the deploy job runs."
fi

echo "▶ 2/5 Cloning repo into $APP_DIR…"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch --all --prune
fi

echo "▶ 3/5 Retiring the old PM2/Nginx-static stack (if any)…"
command -v pm2 >/dev/null && { pm2 delete kmer-api 2>/dev/null || true; pm2 save 2>/dev/null || true; }

echo "▶ 4/5 Installing host Nginx reverse proxy for $DOMAIN…"
sudo apt-get update -y && sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo sed "s/your-domain.com/$DOMAIN/g" "$APP_DIR/deploy/nginx-kmer.conf" \
  | sudo tee /etc/nginx/sites-available/kmer >/dev/null
sudo ln -sf /etc/nginx/sites-available/kmer /etc/nginx/sites-enabled/kmer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "▶ 5/5 Requesting TLS certificate…"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || \
  echo "  ⚠️  certbot failed — run it manually: sudo certbot --nginx -d $DOMAIN"

echo "✅ VPS ready. Now set the GitHub secrets and push to main to deploy."
