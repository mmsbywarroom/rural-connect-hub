#!/usr/bin/env bash
# Run on EC2 when GitHub Actions deploy fails:
#   bash deploy/ec2-recover.sh ~/rural-connect-hub
set -euo pipefail

APP_PATH="${1:-$HOME/rural-connect-hub}"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

cd "$APP_PATH"

echo "==> Disk before recovery:"
df -h /

echo "==> Freeing space..."
rm -f release.tar.gz
rm -rf ~/.npm/_cacache node_modules/.cache 2>/dev/null || true
sudo apt-get clean 2>/dev/null || true
sudo journalctl --vacuum-size=50M 2>/dev/null || true

if ! swapon --show 2>/dev/null | grep -q .; then
  if [ ! -f /swapfile ]; then
    echo "==> Enabling swap..."
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
  fi
  sudo swapon /swapfile 2>/dev/null || true
fi

if [ -f release.tar.gz ]; then
  echo "==> Extracting uploaded release..."
  tar -xzf release.tar.gz
  rm -f release.tar.gz
fi

if [ ! -d node_modules/express ]; then
  echo "==> Installing dependencies (this may take a few minutes)..."
  rm -rf node_modules
  export NODE_OPTIONS="--max-old-space-size=768"
  npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund
fi

if [ ! -f dist/index.cjs ]; then
  echo "ERROR: dist/index.cjs missing. Run a GitHub deploy first or npm run build." >&2
  exit 1
fi

sed -i 's/\r$//' deploy/apply-nginx.sh deploy/nginx-site.conf 2>/dev/null || true
chmod +x deploy/apply-nginx.sh
bash deploy/apply-nginx.sh "$APP_PATH" || echo "WARNING: nginx apply failed"

if pm2 describe rural-connect-hub >/dev/null 2>&1; then
  pm2 restart rural-connect-hub
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> Recovery done. Test:"
curl -I http://127.0.0.1:8080 || true
df -h /
