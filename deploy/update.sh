#!/usr/bin/env bash
set -euo pipefail

#
# Neon Dugout — Update Script
# Run as root to pull latest code, rebuild, and restart
# Usage: sudo bash update.sh
#

echo "============================================"
echo "  NEON DUGOUT — UPDATE"
echo "============================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: This script must be run as root"
  exit 1
fi

APP_DIR="/opt/neondugout"

if [ ! -f "${APP_DIR}/package.json" ]; then
  echo "ERROR: App not found in ${APP_DIR}. Run deploy.sh first."
  exit 1
fi

cd "$APP_DIR"

echo "[1/5] Pulling latest code..."
if [ -d ".git" ]; then
  sudo -u neondugout git pull
else
  echo "  No git repo found — skipping pull"
  echo "  Copy updated files to ${APP_DIR} manually before running this script"
fi

echo "[2/5] Installing dependencies..."
sudo -u neondugout bash -c "cd ${APP_DIR} && npm ci"

echo "[3/5] Building production bundle..."
sudo -u neondugout bash -c "cd ${APP_DIR} && npm run build"

echo "[4/5] Pushing database schema updates..."
sudo -u neondugout bash -c "cd ${APP_DIR} && source .env.production && export DATABASE_URL && npx drizzle-kit push --force"

echo "[5/5] Restarting application..."
sudo -u neondugout bash -c "pm2 restart neondugout"

sleep 3

echo ""
if curl -sf http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
  HEALTH=$(curl -s http://127.0.0.1:5000/api/health)
  echo "  App is healthy: ${HEALTH}"
else
  echo "  WARNING: Health check failed. Check logs: pm2 logs neondugout"
fi

echo ""
echo "============================================"
echo "  UPDATE COMPLETE"
echo "============================================"
echo ""
echo "  pm2 status          # Check status"
echo "  pm2 logs neondugout # View logs"
echo ""
