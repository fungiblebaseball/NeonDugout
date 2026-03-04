#!/usr/bin/env bash
set -euo pipefail

#
# Neon Dugout — SSL Setup (Let's Encrypt)
# Usage: sudo bash setup-ssl.sh YOUR_DOMAIN [YOUR_EMAIL]
#

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: This script must be run as root"
  exit 1
fi

DOMAIN="${1:-}"
EMAIL="${2:-admin@${DOMAIN}}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo bash setup-ssl.sh YOUR_DOMAIN [YOUR_EMAIL]"
  exit 1
fi

echo "Obtaining SSL certificate for ${DOMAIN}..."

certbot certonly \
  --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

echo ""
echo "SSL certificate obtained for ${DOMAIN}"
echo "Reloading Nginx..."
nginx -t && systemctl reload nginx
echo "Done. Site available at https://${DOMAIN}"
