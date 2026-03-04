# Neon Dugout — Guida al Deploy / Deployment Guide

## Prerequisiti / Prerequisites

- **VPS**: Contabo (o qualsiasi) con Ubuntu 22.04 o 24.04
- **Dominio**: Un dominio con record DNS A che punta all'IP del VPS
- **Accesso SSH**: root al server

---

## Passo 1: Preparare i file / Step 1: Prepare Files

Dalla tua macchina locale, copia la cartella `deploy/` e tutto il progetto sul server:

```bash
# Comprimi il progetto
tar czf neondugout.tar.gz --exclude=node_modules --exclude=dist --exclude=.git .

# Copia sul server
scp neondugout.tar.gz root@TUO_IP:/root/
scp -r deploy/ root@TUO_IP:/root/deploy/
```

---

## Passo 2: Setup del VPS / Step 2: VPS Setup

SSH nel server ed esegui lo script di setup:

```bash
ssh root@TUO_IP

# Rendi eseguibili gli script
chmod +x /root/deploy/*.sh

# Installa tutto: Node.js, PostgreSQL, Nginx, firewall, PM2
bash /root/deploy/setup-vps.sh
```

Questo script:
- Installa Node.js 20, PostgreSQL 16, Nginx, Certbot, PM2
- Configura il firewall UFW (solo SSH + HTTP + HTTPS)
- Crea l'utente di sistema `neondugout`
- Crea il database PostgreSQL con password auto-generata
- Salva le credenziali in `/root/.neondugout-db-credentials`

---

## Passo 3: Deploy dell'app / Step 3: Deploy the App

Copia il codice nella directory dell'app e avvia il deploy:

```bash
# Estrai il codice nella directory dell'app
mkdir -p /opt/neondugout
tar xzf /root/neondugout.tar.gz -C /opt/neondugout
chown -R neondugout:neondugout /opt/neondugout

# Lancia il deploy (ti chiederà RPC URL e wallet)
bash /root/deploy/deploy.sh TUO_DOMINIO
```

Lo script ti chiederà:
- **SOLANA_RPC_URL**: Il tuo endpoint Helius (es. `https://mainnet.helius-rpc.com/?api-key=xxx`)
- **MERCHANT_WALLET**: La tua chiave pubblica Solana per ricevere pagamenti
- **Email SSL**: Per le notifiche di Let's Encrypt

---

## Passo 4: Verifica / Step 4: Verify

```bash
# Controlla che l'app sia attiva
pm2 status

# Controlla la salute dell'app
curl https://TUO_DOMINIO/api/health

# Apri nel browser
# https://TUO_DOMINIO
```

---

## Manutenzione / Maintenance

### Aggiornare l'app / Update the App

```bash
# Se usi git:
cd /opt/neondugout && sudo -u neondugout git pull
sudo bash /opt/neondugout/deploy/update.sh

# Se copi i file manualmente:
# 1. Copia i nuovi file in /opt/neondugout
# 2. Esegui: sudo bash /opt/neondugout/deploy/update.sh
```

### Comandi PM2 utili / Useful PM2 Commands

```bash
pm2 status                    # Stato dell'app
pm2 logs neondugout           # Log in tempo reale
pm2 logs neondugout --lines 100  # Ultime 100 righe
pm2 restart neondugout        # Riavvia l'app
pm2 stop neondugout           # Ferma l'app
pm2 monit                     # Monitoraggio live (CPU/RAM)
pm2 describe neondugout       # Info dettagliate
```

### Log / Logs

```bash
# Log dell'app
tail -f /var/log/neondugout/app-out.log
tail -f /var/log/neondugout/app-error.log

# Log di Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Firewall

```bash
sudo ufw status verbose       # Stato firewall
sudo ufw allow 22/tcp         # (già attivo) SSH
sudo ufw allow 80/tcp         # (già attivo) HTTP
sudo ufw allow 443/tcp        # (già attivo) HTTPS
```

### SSL / Certificato

```bash
# Verifica rinnovo automatico
sudo certbot renew --dry-run

# Rinnovo manuale (se necessario)
sudo certbot renew
```

### Database

```bash
# Accedi al database
sudo -u postgres psql neondugout

# Backup
sudo -u postgres pg_dump neondugout > backup_$(date +%Y%m%d).sql

# Ripristino
sudo -u postgres psql neondugout < backup_FILE.sql
```

---

## Troubleshooting / Risoluzione Problemi

### L'app non parte / App Won't Start

```bash
# Controlla i log per errori
pm2 logs neondugout --lines 50

# Verifica le variabili d'ambiente
cat /opt/neondugout/.env.production

# Verifica che il database sia accessibile
sudo -u neondugout bash -c "source /opt/neondugout/.env.production && psql \$DATABASE_URL -c 'SELECT 1'"
```

### Errore 502 Bad Gateway

```bash
# L'app non è in ascolto sulla porta 5000
pm2 status                    # Controlla se l'app è 'online'
pm2 restart neondugout        # Prova a riavviare

# Verifica che Nginx punti alla porta giusta
sudo nginx -t
cat /etc/nginx/sites-enabled/neondugout
```

### SSL non funziona / SSL Not Working

```bash
# Verifica che il DNS punti al server
dig TUO_DOMINIO

# Riprova Certbot
sudo certbot --nginx -d TUO_DOMINIO
```

### L'app crasha e non riparte / App Crashes and Won't Restart

```bash
# Controlla i restart di PM2
pm2 describe neondugout | grep restart

# Se troppi restart, PM2 potrebbe averlo fermato
pm2 restart neondugout

# Controlla la memoria
pm2 monit
free -h
```

---

## Struttura sul server / Server Structure

```
/opt/neondugout/           # Codice dell'app
├── dist/                  # Build di produzione
│   ├── index.cjs          # Server compilato
│   └── public/            # Frontend compilato
├── .env.production        # Variabili d'ambiente (SECRET)
├── ecosystem.config.cjs   # Config PM2
└── deploy/                # Script di deploy

/var/log/neondugout/       # Log dell'app
├── app-out.log            # Output standard
└── app-error.log          # Errori

/etc/nginx/sites-available/neondugout  # Config Nginx
/etc/logrotate.d/neondugout            # Rotazione log
/root/.neondugout-db-credentials       # Credenziali DB
```
