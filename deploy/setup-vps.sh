#!/usr/bin/env bash
set -euo pipefail

#
# Neon Dugout — VPS Setup Script
# Run as root on a fresh Ubuntu 22.04 / 24.04 Contabo VPS
# Usage: sudo bash setup-vps.sh
#

echo "============================================"
echo "  NEON DUGOUT — VPS SETUP"
echo "============================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: This script must be run as root"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/9] Updating system packages..."
apt update -y && apt upgrade -y

echo "[2/9] Installing base tools..."
apt install -y curl wget git build-essential software-properties-common ufw fail2ban unzip

echo "[3/9] Installing Node.js 20 LTS..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "  Node.js $(node -v) installed"
echo "  npm $(npm -v) installed"

echo "[4/9] Installing PostgreSQL 16..."
if ! command -v psql &>/dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  apt update -y
  apt install -y postgresql-16 postgresql-client-16
fi
systemctl enable postgresql
systemctl start postgresql
echo "  PostgreSQL $(psql --version | awk '{print $3}') installed"

echo "[5/9] Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
echo "  Nginx installed"

echo "[6/9] Installing Certbot (Let's Encrypt)..."
if ! command -v certbot &>/dev/null; then
  apt install -y snapd
  snap install core 2>/dev/null || true
  snap refresh core 2>/dev/null || true
  snap install --classic certbot
  ln -sf /snap/bin/certbot /usr/bin/certbot
fi
echo "  Certbot installed"

echo "[7/9] Installing PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
echo "  PM2 $(pm2 -v) installed"

echo "[8/9] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "  Firewall active:"
ufw status verbose

echo "[9/9] Creating app user and directories..."

CREDS_FILE="/root/.neondugout-db-credentials"

if [ -f "$CREDS_FILE" ]; then
  echo "  DB credentials file exists — reusing existing password"
  source "$CREDS_FILE"
  DB_PASSWORD="${DB_PASSWORD}"
else
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
fi

if ! id "neondugout" &>/dev/null; then
  useradd --system --create-home --shell /bin/bash neondugout
  echo "  Created system user: neondugout"
else
  echo "  User neondugout already exists"
fi

mkdir -p /opt/neondugout
chown neondugout:neondugout /opt/neondugout

mkdir -p /var/log/neondugout
chown neondugout:neondugout /var/log/neondugout

if sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='neondugout'" | grep -q 1; then
  echo "  DB user neondugout already exists — updating password"
  sudo -u postgres psql -c "ALTER USER neondugout WITH PASSWORD '${DB_PASSWORD}';"
else
  sudo -u postgres psql -c "CREATE USER neondugout WITH PASSWORD '${DB_PASSWORD}';"
fi

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='neondugout'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE neondugout OWNER neondugout;"

cat > "$CREDS_FILE" <<CREDS
# Neon Dugout DB Credentials (auto-generated)
DB_USER=neondugout
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=neondugout
DATABASE_URL=postgresql://neondugout:${DB_PASSWORD}@localhost:5432/neondugout
CREDS
chmod 600 "$CREDS_FILE"

echo ""
echo "============================================"
echo "  VPS SETUP COMPLETE"
echo "============================================"
echo ""
echo "  Node.js:      $(node -v)"
echo "  PostgreSQL:    $(psql --version | awk '{print $3}')"
echo "  Nginx:         active"
echo "  PM2:           $(pm2 -v)"
echo "  Firewall:      active (SSH + HTTP + HTTPS)"
echo "  App user:      neondugout"
echo "  App directory: /opt/neondugout"
echo "  Log directory: /var/log/neondugout"
echo ""
echo "  DB credentials saved to: $CREDS_FILE"
echo ""
echo "  Next step: run deploy.sh YOUR_DOMAIN"
echo ""
