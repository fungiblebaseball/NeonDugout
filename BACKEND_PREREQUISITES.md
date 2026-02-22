# BACKEND_PREREQUISITES.md
Ultimo aggiornamento: 22 febbraio 2026  
Versione: 1.0

## Scopo del file
Requisiti e istruzioni per configurare il server Contabo come backend centralizzato per Gridiron Ghosts.  
Questo server gestirà: API REST, database PostgreSQL, batch processor giornaliero, e futuramente il relay per le transazioni Anchor/Solana.

---

## 1. Sistema Operativo consigliato
**Ubuntu 22.04 LTS (Jammy Jellyfish)** oppure **Ubuntu 24.04 LTS (Noble Numbat)**
- LTS = supporto a lungo termine (5 anni di aggiornamenti di sicurezza)
- Compatibilità eccellente con Node.js, PostgreSQL, Nginx, Certbot
- Community enorme per troubleshooting

---

## 2. Software da installare sul server Contabo

### 2.1 Aggiornamento sistema base
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential software-properties-common ufw
```

### 2.2 Node.js 20 LTS (runtime applicazione)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # deve mostrare v20.x
npm -v    # deve mostrare 10.x
```

### 2.3 PostgreSQL 16 (database relazionale)
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16

# Avvia e abilita al boot
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crea utente e database per l'applicazione
sudo -u postgres psql -c "CREATE USER gridiron WITH PASSWORD 'CAMBIA_QUESTA_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE gridiron_db OWNER gridiron;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gridiron_db TO gridiron;"
```

### 2.4 Nginx (reverse proxy + HTTPS)
```bash
sudo apt install -y nginx

# Configurazione base sito
sudo nano /etc/nginx/sites-available/gridiron
```
Contenuto del file Nginx:
```nginx
server {
    listen 80;
    server_name tuodominio.com www.tuodominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/gridiron /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2.5 Certbot (certificato HTTPS gratuito Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com
# Segui le istruzioni interattive per ottenere il certificato SSL
```

### 2.6 PM2 (process manager per Node.js in produzione)
```bash
sudo npm install -g pm2

# Per avviare l'app:
cd /home/gridiron/app
pm2 start dist/index.cjs --name gridiron-api

# Per avviare al boot:
pm2 startup systemd
pm2 save
```

### 2.7 Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# NON esporre la porta 3000 direttamente (Nginx fa da proxy)
sudo ufw enable
sudo ufw status
```

---

## 3. Variabili d'ambiente da configurare sul server

Crea un file `.env` nella root dell'applicazione:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://gridiron:CAMBIA_QUESTA_PASSWORD@localhost:5432/gridiron_db

# Futuro: Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Futuro: JWT o altro segreto per autenticazione
SESSION_SECRET=genera_un_hash_casuale_lungo
```

---

## 4. Deploy workflow consigliato

1. Sviluppo su Replit (frontend + backend insieme, dev mode)
2. Build: `npm run build` → genera `dist/` con server compilato e frontend statico
3. Trasferisci `dist/`, `package.json`, `package-lock.json`, `migrations/` sul server Contabo via `rsync` o `scp`
4. Sul server: `npm install --production` → `npx drizzle-kit push` → `pm2 restart gridiron-api`

```bash
# Esempio deploy da locale/Replit:
rsync -avz --exclude='node_modules' --exclude='.git' ./ user@contabo-ip:/home/gridiron/app/
ssh user@contabo-ip "cd /home/gridiron/app && npm install --production && npx drizzle-kit push && pm2 restart gridiron-api"
```

---

## 5. Requisiti hardware minimi (Contabo)

| Risorsa | Minimo MVP | Consigliato |
|---------|-----------|-------------|
| CPU     | 2 vCPU    | 4 vCPU      |
| RAM     | 4 GB      | 8 GB        |
| Disco   | 50 GB SSD | 100 GB NVMe |
| Banda   | 1 TB/mese | Illimitata  |

Il batch processor giornaliero (simulazione partite per 20 squadre) richiede pochissime risorse.  
PostgreSQL con ~400 giocatori e ~20 squadre usa pochi MB.  
Il collo di bottiglia futuro sarà il numero di utenti concorrenti e le query di stats aggregate.

---

## 6. Sicurezza base

- [ ] Cambia la password di default di PostgreSQL
- [ ] Disabilita login root via SSH (`PermitRootLogin no` in `/etc/ssh/sshd_config`)
- [ ] Usa chiavi SSH invece di password
- [ ] Aggiorna regolarmente: `sudo apt update && sudo apt upgrade -y`
- [ ] Configura backup automatici del database (pg_dump via cron)
- [ ] Monitora con `htop`, `pm2 monit`, o servizi esterni (UptimeRobot)

---

## 7. Cron job per batch giornaliero (00:00 CET)

```bash
# Aggiungi al crontab dell'utente applicazione
crontab -e

# Esegui il batch processor ogni notte a mezzanotte CET (23:00 UTC in inverno, 22:00 UTC in estate)
0 23 * * * cd /home/gridiron/app && node dist/batch-processor.cjs >> /var/log/gridiron-batch.log 2>&1
```

---

Fine documento – aggiorna quando il server è attivo e configurato.
