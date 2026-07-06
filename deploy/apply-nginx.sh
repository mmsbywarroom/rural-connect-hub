#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${1:-}"
if [ -z "$APP_ROOT" ]; then
  echo "Usage: apply-nginx.sh <app-root-path>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/nginx-site.conf"
TARGET="/etc/nginx/sites-available/rural-connect-hub"
SSL_CERT="/etc/letsencrypt/live/balbirs.com/fullchain.pem"

if [ ! -f "$TEMPLATE" ]; then
  echo "Missing nginx template: $TEMPLATE" >&2
  exit 1
fi

if [ ! -d "$APP_ROOT/dist/public" ]; then
  echo "Build output not found at $APP_ROOT/dist/public" >&2
  exit 1
fi

if [ ! -f "$SSL_CERT" ]; then
  echo "SSL cert not found at $SSL_CERT — using HTTP-only nginx config"
  sudo tee "$TARGET" >/dev/null <<NGINX
server {
    listen 80;
    server_name balbirs.com www.balbirs.com _;

    client_max_body_size 50M;
    root $APP_ROOT/dist/public;

    location /assets/ {
        try_files \$uri =404;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX
else
  sudo sed "s|__APP_ROOT__|$APP_ROOT|g" "$TEMPLATE" | sudo tee "$TARGET" >/dev/null
fi

sudo ln -sf "$TARGET" /etc/nginx/sites-enabled/rural-connect-hub
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx updated: static assets from $APP_ROOT/dist/public"
