Objective
Prepare the Neon Dugout application for deployment on a Contabo VPS with full production configuration. Create all deployment scripts, configuration files, and documentation needed so the user can SSH into their fresh VPS and run a setup script that:

Installs all system dependencies (Node.js 20, PostgreSQL 16, Nginx, Certbot, UFW, PM2)
Configures UFW firewall (SSH + HTTP + HTTPS only)
Sets up PostgreSQL database with secure credentials
Clones/transfers the app, installs deps, builds production bundle
Configures Nginx as reverse proxy with SSL (Let's Encrypt)
Sets up PM2 process manager for auto-restart on crash + boot persistence
Creates systemd integration so everything survives reboots
Note: The user will need to provide their domain name and VPS credentials separately. All scripts are parameterized. Files created inside a deploy/ directory in the project.

Tasks
T001: Create production environment config template
Blocked By: []
Details:
Create deploy/.env.production.template with all required env vars:
DATABASE_URL=postgresql://neondugout:PASSWORD@localhost:5432/neondugout
NODE_ENV=production
PORT=5000
JWT_SECRET= (to be generated during setup)
SOLANA_RPC_URL= (user's Helius RPC)
MERCHANT_WALLET= (user's merchant wallet)
Files: deploy/.env.production.template
Acceptance: Template has all vars with clear placeholder comments
T002: Create VPS setup script (system dependencies + firewall)
Blocked By: []
Details:
Create deploy/setup-vps.sh — bash script to run as root on fresh Ubuntu 22.04/24.04 VPS:
Update system packages (apt update && apt upgrade -y)
Install Node.js 20 LTS via NodeSource
Install PostgreSQL 16
Install Nginx
Install Certbot (Let's Encrypt) via snap
Install PM2 globally (npm install -g pm2)
Install Git, build-essential, curl
Configure UFW firewall:
Default deny incoming, allow outgoing
Allow OpenSSH (22), HTTP (80), HTTPS (443)
Enable UFW
Create dedicated neondugout system user for running the app
Set up PostgreSQL: create DB user + database with auto-generated password
Create app directory /opt/neondugout owned by the app user
Create log directory /var/log/neondugout
Script must be idempotent (safe to re-run)
Files: deploy/setup-vps.sh
Acceptance: Script installs all deps, configures firewall, creates DB and app user
T003: Create Nginx configuration with SSL support
Blocked By: []
Details:
Create deploy/nginx/neondugout.conf — Nginx reverse proxy config:
Server block listening on 80 (redirect to HTTPS)
Server block listening on 443 with SSL (cert paths for Let's Encrypt)
server_name parameterized as YOUR_DOMAIN (replaced by deploy script)
Proxy pass to http://127.0.0.1:5000
WebSocket upgrade support (Connection/Upgrade headers)
Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy)
Gzip compression for text/js/css/json
Static asset caching (long Cache-Control for /assets/)
Client max body size 10M
Create deploy/setup-ssl.sh — runs Certbot to obtain SSL cert
Files: deploy/nginx/neondugout.conf, deploy/setup-ssl.sh
Acceptance: Valid Nginx config with SSL, security headers, reverse proxy to Node app
T004: Create PM2 ecosystem config for process management
Blocked By: []
Details:
Create deploy/ecosystem.config.cjs — PM2 config file:
App name: neondugout
Script: dist/index.cjs
CWD: /opt/neondugout
NODE_ENV=production
Env file reference
Instances: 1 (app uses in-memory scheduler state)
Auto-restart: enabled
Max restarts: 15 within restart window
Restart delay: 5000ms
Watch: false
Log files: /var/log/neondugout/app-out.log, /var/log/neondugout/app-error.log
Max memory restart: 512M
Merge logs: true
Files: deploy/ecosystem.config.cjs
Acceptance: PM2 config handles crash recovery, logging, memory limits
T005: Add health check endpoint to the server
Blocked By: []
Details:
Add GET /api/health endpoint in server/routes.ts (no auth required):
Returns { status: "ok", uptime: process.uptime(), timestamp: Date.now() }
Used by Nginx health checks and external monitoring
Files: server/routes.ts
Acceptance: Endpoint returns JSON health status without authentication
T006: Create log rotation config
Blocked By: []
Details:
Create deploy/logrotate/neondugout — logrotate config:
Target: /var/log/neondugout/*.log
Rotate daily, keep 14 days, compress, delaycompress
copytruncate (so PM2 doesn't need restart)
missingok, notifempty
Files: deploy/logrotate/neondugout
Acceptance: Log rotation configured to prevent disk fill
T007: Create main deployment script + update script
Blocked By: [T001, T002, T003, T004, T005, T006]
Details:
Create deploy/deploy.sh — full first-time deploy script (run as root):
Accept DOMAIN as required parameter
Clone repo into /opt/neondugout (or copy from upload)
Generate .env.production from template (auto-generate JWT_SECRET, auto-fill DB URL from setup)
Prompt user for SOLANA_RPC_URL and MERCHANT_WALLET
npm ci (install all deps including devDeps for build)
npm run build (frontend + backend bundle)
npx drizzle-kit push (create/update DB schema)
Install Nginx config: copy, replace YOUR_DOMAIN, enable site
Test Nginx config (nginx -t), reload Nginx
Start app with PM2 using ecosystem config
pm2 startup systemd + pm2 save (persist across reboots)
Install logrotate config
Run Certbot for SSL
Print summary with status + URL
Create deploy/update.sh — for subsequent code updates:
git pull (or accept tarball)
npm ci
npm run build
npx drizzle-kit push (in case schema changed)
pm2 restart neondugout
Print status
Files: deploy/deploy.sh, deploy/update.sh
Acceptance: Full deployment from fresh VPS to running app with SSL in one script run
T008: Create deployment guide (Italian + English)
Blocked By: [T007]
Details:
Create deploy/GUIDA-DEPLOY.md with clear bilingual instructions:
Prerequisites: Contabo VPS Ubuntu 22.04/24.04, domain DNS A record pointing to VPS IP
Step 1: SSH into VPS as root, upload deploy folder
Step 2: Run setup-vps.sh (installs everything)
Step 3: Run deploy.sh YOUR_DOMAIN (deploys app)
Step 4: Verify at https://YOUR_DOMAIN
Maintenance section: update app, view logs, restart, check status
PM2 commands reference: pm2 status, pm2 logs neondugout, pm2 restart neondugout
Troubleshooting: common issues and solutions
Firewall check: ufw status
SSL renewal: automatic via Certbot timer
Files: deploy/GUIDA-DEPLOY.md
Acceptance: A user with basic SSH knowledge can follow the guide to deploy successfully