#!/usr/bin/env bash
set -euo pipefail

#
# Neon Dugout — Full Deployment Script
# Run as root AFTER setup-vps.sh has been executed
# Usage: sudo bash deploy.sh YOUR_DOMAIN [GIT_REPO_URL]
#

echo "============================================"
echo "  NEON DUGOUT — DEPLOY"
echo "============================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: This script must be run as root"
  exit 1
fi

DOMAIN="${1:-}"
REPO_URL="${2:-}"
APP_DIR="/opt/neondugout"
CREDS_FILE="/root/.neondugout-db-credentials"

if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo bash deploy.sh YOUR_DOMAIN [GIT_REPO_URL]"
  echo ""
  echo "  YOUR_DOMAIN   - Your domain name (e.g., neondugout.com)"
  echo "  GIT_REPO_URL  - Git repository URL (optional if code already in ${APP_DIR})"
  exit 1
fi

echo "Domain:    ${DOMAIN}"
echo "App dir:   ${APP_DIR}"
echo ""

# ── Step 1: Get the code ──────────────────────────────────────────
echo "[1/10] Setting up application code..."
if [ -n "$REPO_URL" ]; then
  if [ -d "${APP_DIR}/.git" ]; then
    echo "  Pulling latest from ${REPO_URL}..."
    sudo -u neondugout git -C "$APP_DIR" pull
  else
    echo "  Cloning ${REPO_URL}..."
    sudo -u neondugout git clone "$REPO_URL" "$APP_DIR"
  fi
elif [ ! -f "${APP_DIR}/package.json" ]; then
  echo "ERROR: No git repo URL provided and no code found in ${APP_DIR}"
  echo "Either provide a git URL or copy the project files to ${APP_DIR} first"
  echo ""
  echo "To copy from this deploy folder's parent:"
  echo "  cp -r /path/to/project/* ${APP_DIR}/"
  echo "  chown -R neondugout:neondugout ${APP_DIR}"
  exit 1
fi

echo "  Code ready in ${APP_DIR}"

# ── Step 2: Generate .env.production ──────────────────────────────
echo "[2/10] Configuring environment variables..."
ENV_FILE="${APP_DIR}/.env.production"

if [ -f "$CREDS_FILE" ]; then
  source "$CREDS_FILE"
  DB_URL="${DATABASE_URL}"
else
  echo "WARNING: DB credentials file not found at ${CREDS_FILE}"
  read -rp "  Enter DATABASE_URL: " DB_URL
fi

JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

if [ -f "$ENV_FILE" ]; then
  echo "  .env.production already exists — keeping existing values"
  echo "  (Delete ${ENV_FILE} to regenerate)"
else
  read -rp "  Enter SOLANA_RPC_URL (Helius): " SOLANA_RPC
  read -rp "  Enter MERCHANT_WALLET (Solana pubkey): " MERCHANT_WALLET

  cat > "$ENV_FILE" <<ENV
DATABASE_URL=${DB_URL}
NODE_ENV=production
PORT=5000
JWT_SECRET=${JWT_SECRET}
SOLANA_RPC_URL=${SOLANA_RPC}
MERCHANT_WALLET=${MERCHANT_WALLET}
ENV

  chown neondugout:neondugout "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "  .env.production created"
fi

# ── Step 3: Install dependencies ──────────────────────────────────
echo "[3/10] Installing Node.js dependencies..."
cd "$APP_DIR"
sudo -u neondugout bash -c "cd ${APP_DIR} && npm ci"

# ── Step 4: Build production bundle ───────────────────────────────
echo "[4/10] Building production bundle..."
sudo -u neondugout bash -c "cd ${APP_DIR} && npm run build"

# ── Step 5: Push database schema ──────────────────────────────────
echo "[5/10] Pushing database schema..."
sudo -u neondugout bash -c "cd ${APP_DIR} && source .env.production && export DATABASE_URL && npx drizzle-kit push --force"

# ── Step 6: Configure Nginx (HTTP-only first, SSL later) ─────────
echo "[6/10] Configuring Nginx (HTTP-only for now)..."
NGINX_CONF="/etc/nginx/sites-available/neondugout"
sed "s/YOUR_DOMAIN/${DOMAIN}/g" "${APP_DIR}/deploy/nginx/neondugout-http.conf" > "$NGINX_CONF"

rm -f /etc/nginx/sites-enabled/default
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/neondugout

nginx -t
systemctl reload nginx
echo "  Nginx configured for ${DOMAIN} (HTTP)"

# ── Step 7: Set up PM2 ───────────────────────────────────────────
echo "[7/10] Starting application with PM2..."

sudo -u neondugout bash -c "cd ${APP_DIR} && cp deploy/ecosystem.config.cjs ."

pm2 delete neondugout 2>/dev/null || true
sudo -u neondugout bash -c "cd ${APP_DIR} && source .env.production && export DATABASE_URL JWT_SECRET SOLANA_RPC_URL MERCHANT_WALLET NODE_ENV PORT && pm2 start ecosystem.config.cjs"

sleep 3

echo "  Checking app health..."
if curl -sf http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
  echo "  App is running and healthy"
else
  echo "  WARNING: App may not be fully started yet. Check: pm2 logs neondugout"
fi

# ── Step 8: PM2 startup persistence ──────────────────────────────
echo "[8/10] Configuring PM2 auto-start on boot..."
pm2 startup systemd -u neondugout --hp /home/neondugout 2>/dev/null || true
sudo -u neondugout bash -c "pm2 save"
echo "  PM2 will auto-start on reboot"

# ── Step 9: Install logrotate config ──────────────────────────────
echo "[9/10] Installing log rotation..."
cp "${APP_DIR}/deploy/logrotate/neondugout" /etc/logrotate.d/neondugout
echo "  Log rotation configured (14 days, daily)"

# ── Step 10: SSL Certificate ─────────────────────────────────────
echo "[10/10] Setting up SSL certificate..."
echo ""
echo "  Obtaining Let's Encrypt certificate for ${DOMAIN}..."
echo "  (Make sure DNS A record points to this server's IP)"
echo ""

read -rp "  Enter email for SSL notifications [admin@${DOMAIN}]: " SSL_EMAIL
SSL_EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL" --redirect || {
  echo ""
  echo "  WARNING: Certbot failed. This usually means:"
  echo "  - DNS A record for ${DOMAIN} doesn't point to this server yet"
  echo "  - Port 80 is blocked"
  echo ""
  echo "  You can retry SSL later with:"
  echo "    sudo certbot --nginx -d ${DOMAIN}"
  echo ""
}

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE"
echo "============================================"
echo ""
echo "  Domain:    ${DOMAIN}"
echo "  App:       https://${DOMAIN}"
echo "  Health:    https://${DOMAIN}/api/health"
echo ""
echo "  Useful commands:"
echo "    pm2 status                    # Check app status"
echo "    pm2 logs neondugout           # View app logs"
echo "    pm2 restart neondugout        # Restart app"
echo "    pm2 monit                     # Live monitoring"
echo "    sudo ufw status              # Check firewall"
echo "    sudo nginx -t                # Test Nginx config"
echo "    sudo certbot renew --dry-run # Test SSL renewal"
echo ""
