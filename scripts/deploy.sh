#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "==> Installing dependencies..."
npm ci

echo "==> Building..."
export NODE_ENV=production
npm run build

echo "==> Restarting app..."
if pm2 describe rural-connect-hub >/dev/null 2>&1; then
  pm2 restart rural-connect-hub
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> Deploy complete."
