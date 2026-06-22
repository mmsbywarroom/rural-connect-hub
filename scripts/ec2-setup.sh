#!/usr/bin/env bash
# One-time EC2 setup (Ubuntu 22.04). Run as ubuntu user after SSH login.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/rural-connect-hub}"
REPO_URL="${REPO_URL:-https://github.com/mmsbywarroom/rural-connect-hub.git}"
DOMAIN="${DOMAIN:-}"

echo "==> Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing git, nginx, certbot..."
sudo apt-get install -y git nginx certbot python3-certbot-nginx curl build-essential

echo "==> Installing Node.js 20..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Installing PM2..."
sudo npm install -g pm2

echo "==> Adding swap (helps t3.micro builds)..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Cloning repository..."
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
git checkout main
git pull origin main

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "IMPORTANT: Edit .env with your secrets before starting the app:"
  echo "  nano $APP_DIR/.env"
fi

echo "==> Installing app dependencies and building..."
npm ci
export NODE_ENV=production
npm run build

echo "==> Starting app with PM2..."
pm2 start ecosystem.config.cjs
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | bash || true
pm2 save

echo "==> Configuring nginx..."
sudo tee /etc/nginx/sites-available/rural-connect-hub >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/rural-connect-hub /etc/nginx/sites-enabled/rural-connect-hub
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

if [ -n "$DOMAIN" ]; then
  echo "==> Requesting SSL for $DOMAIN..."
  sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || true
fi

echo ""
echo "Setup done. App path: $APP_DIR"
echo "Check: curl -I http://127.0.0.1:8080"
echo "PM2:   pm2 status"
