# Neon Dugout — Guida al Deploy / Deployment Guide

**Dominio**: galiasoccer.fun
**Server**: Contabo VPS, Ubuntu 24.04 LTS

---

## Prerequisiti / Prerequisites

- VPS Contabo con Ubuntu 24.04 LTS
- Dominio `galiasoccer.fun` con record DNS A che punta all'IP del VPS
- Accesso SSH root al server
- Repository GitHub con il codice del progetto

---

## Passo 1: Crea il repo GitHub / Step 1: Create GitHub Repo

1. Vai su https://github.com/new
2. Crea un nuovo repository (pubblico o privato)
3. Da Replit, nella Shell, esegui:

```bash
git remote add origin https://github.com/TUO_UTENTE/neon-dugout.git
git branch -M main
git push -u origin main
```

Se il repo è privato, sul VPS dovrai configurare l'accesso (token o SSH key).

---

## Passo 2: Setup del VPS / Step 2: VPS Setup

```bash
# Collegati al server
ssh root@TUO_IP

# Scarica lo script di setup (o copialo manualmente)
# Opzione A: clona il repo per avere gli script
git clone https://github.com/TUO_UTENTE/neon-dugout.git /tmp/neondugout-setup
chmod +x /tmp/neondugout-setup/deploy/*.sh

# Esegui il setup del sistema
bash /tmp/neondugout-setup/deploy/setup-vps.sh

# Puoi rimuovere la copia temporanea
rm -rf /tmp/neondugout-setup
```

Questo script installa e configura:
- Node.js 20 LTS
- PostgreSQL 16 (crea utente e database automaticamente)
- Nginx
- Certbot (Let's Encrypt per SSL)
- PM2 (process manager)
- UFW firewall (solo SSH + HTTP + HTTPS aperti)
- Utente di sistema `neondugout`
- Le credenziali DB vengono salvate in `/root/.neondugout-db-credentials`

---

## Passo 3: Deploy dell'app / Step 3: Deploy the App

```bash
# Lancia il deploy con il repo GitHub e il dominio
bash /opt/neondugout/deploy/deploy.sh galiasoccer.fun https://github.com/TUO_UTENTE/neon-dugout.git
```

Lo script ti chiederà:
- **SOLANA_RPC_URL**: Il tuo endpoint Helius (es. `https://mainnet.helius-rpc.com/?api-key=xxx`)
- **MERCHANT_WALLET**: La tua chiave pubblica Solana per ricevere pagamenti
- **Email SSL**: Per le notifiche di Let's Encrypt

Il deploy:
1. Clona il repo in `/opt/neondugout`
2. Genera `.env.production` con credenziali sicure
3. Installa dipendenze e compila il progetto
4. Crea le tabelle nel database
5. Configura Nginx come reverse proxy
6. Avvia l'app con PM2 (auto-restart)
7. Ottiene il certificato SSL da Let's Encrypt

---

## Passo 4: Verifica / Step 4: Verify

```bash
# Controlla lo stato dell'app
pm2 status

# Controlla la salute
curl https://galiasoccer.fun/api/health

# Apri nel browser: https://galiasoccer.fun
```

---

## Aggiornamenti / Updates

Quando fai modifiche al codice su Replit:

```bash
# 1. Pusha le modifiche su GitHub (da Replit)
git add -A && git commit -m "update" && git push

# 2. Sul VPS, esegui lo script di update
ssh root@TUO_IP
bash /opt/neondugout/deploy/update.sh
```

Lo script fa automaticamente: pull, install, build, schema push, restart.

---

## Comandi Utili / Useful Commands

### PM2 (Gestione App)

```bash
pm2 status                       # Stato dell'app
pm2 logs neondugout              # Log in tempo reale
pm2 logs neondugout --lines 100  # Ultime 100 righe di log
pm2 restart neondugout           # Riavvia l'app
pm2 stop neondugout              # Ferma l'app
pm2 monit                        # Monitoraggio live CPU/RAM
pm2 describe neondugout          # Info dettagliate + contatore restart
```

### Log

```bash
# Log dell'app
tail -f /var/log/neondugout/app-out.log    # Output normale
tail -f /var/log/neondugout/app-error.log  # Solo errori

# Log di Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Firewall

```bash
sudo ufw status verbose    # Stato del firewall
```

### SSL / Certificato

```bash
sudo certbot renew --dry-run   # Verifica rinnovo automatico
sudo certbot renew             # Rinnovo manuale (se necessario)
# Il rinnovo automatico è già configurato via systemd timer
```

### Database

```bash
# Accedi al database
sudo -u postgres psql neondugout

# Backup del database
sudo -u postgres pg_dump neondugout > backup_$(date +%Y%m%d).sql

# Ripristino da backup
sudo -u postgres psql neondugout < backup_FILE.sql
```

---

## Troubleshooting / Risoluzione Problemi

### L'app non parte

```bash
pm2 logs neondugout --lines 50           # Guarda gli errori
cat /opt/neondugout/.env.production      # Verifica le variabili
sudo -u neondugout bash -c "source /opt/neondugout/.env.production && psql \$DATABASE_URL -c 'SELECT 1'"
```

### Errore 502 Bad Gateway

L'app non è in ascolto. Controlla:
```bash
pm2 status              # L'app è 'online'?
pm2 restart neondugout  # Prova a riavviare
sudo nginx -t           # La config Nginx è valida?
```

### SSL non funziona

```bash
dig galiasoccer.fun          # Il DNS punta al server?
sudo certbot --nginx -d galiasoccer.fun   # Riprova
```

### L'app crasha continuamente

```bash
pm2 describe neondugout | grep restart   # Quanti restart?
pm2 logs neondugout --lines 200          # Cerca l'errore
free -h                                   # Memoria sufficiente?
```

---

## Struttura sul Server / Server Structure

```
/opt/neondugout/               # Codice dell'app
├── dist/                      # Build di produzione
│   ├── index.cjs              # Server compilato
│   └── public/                # Frontend compilato
├── .env.production            # Variabili d'ambiente (NON su GitHub)
├── ecosystem.config.cjs       # Config PM2
├── deploy/                    # Script di deploy
│   ├── setup-vps.sh           # Setup iniziale VPS
│   ├── deploy.sh              # Deploy completo
│   ├── update.sh              # Aggiornamento codice
│   ├── setup-ssl.sh           # Setup SSL manuale
│   ├── ecosystem.config.cjs   # Config PM2
│   ├── nginx/                 # Config Nginx
│   └── logrotate/             # Rotazione log
└── node_modules/              # Dipendenze

/var/log/neondugout/           # Log dell'app
├── app-out.log                # Output standard
└── app-error.log              # Errori

/etc/nginx/sites-available/neondugout  # Config Nginx
/etc/logrotate.d/neondugout            # Rotazione log
/root/.neondugout-db-credentials       # Credenziali DB (solo root)
```
