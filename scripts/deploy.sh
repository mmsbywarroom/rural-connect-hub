#!/usr/bin/env bash
# Manual deploy fallback — prefer GitHub Actions (builds on CI, not on t3.micro).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git fetch origin main
git reset --hard origin/main

if [ ! -f /swapfile ]; then
  echo "==> Adding 2G swap (t3.micro needs this for npm)..."
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
fi

echo "==> Installing production dependencies..."
export NODE_OPTIONS="--max-old-space-size=512"
npm ci --omit=dev

if [ ! -f dist/index.cjs ] || [ ! -f dist/public/index.html ]; then
  echo "==> Building (slow on t3.micro — use GitHub Actions when possible)..."
  export NODE_ENV=production
  npm run build
fi

echo "==> Restarting app..."
if pm2 describe rural-connect-hub >/dev/null 2>&1; then
  pm2 restart rural-connect-hub
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> Deploy complete."
