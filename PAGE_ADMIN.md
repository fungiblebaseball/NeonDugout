# Admin Page (/admin)

## File
`client/src/pages/AdminPage.tsx`

## Descrizione
Pannello di amministrazione per configurare token economy, regole di reward dei minigame, controllo manuale delle giornate di campionato, reset stagione e azzeramento completo del database. Accessibile solo a utenti con `is_admin = true` nella tabella `users`.

## Accesso
- Nessun link nella navigazione — accesso diretto via URL `/admin`
- Protezione: verifica `isAdmin` dallo stato auth (Zustand store)
- Utenti non-admin vengono reindirizzati alla Home
- API admin protette con middleware `requireAdmin` che ritorna 403 per non-admin
- Primo utente a registrarsi su database vuoto ottiene automaticamente `is_admin = true`

## Sezioni

### 1. Match Day Control
- **Match Day Simulation** (card con bordo pink):
  - Info automatismo: "Auto-runs daily at 00:00 CET"
  - Mostra prossimo giorno non giocato e numero di match
  - Pulsante "SIMULATE DAY X" per simulazione manuale (POST /api/simulate-day, admin auth)
  - Gestione playoff automatica (day >= 13: aggiorna matchup prima di simulare)
  - SEASON COMPLETE: quando tutti i match sono giocati, mostra "START NEW SEASON" (POST /api/new-season, admin auth)
  - Nota: a fine stagione lo scheduler auto-genera la nuova stagione a mezzanotte CET; questo pulsante consente trigger manuale immediato
  - Feedback testuale dopo simulazione (numero match simulati o errore)
  - **RESET & REGENERATE SEASON** (bordo arancione, sezione separata sotto):
    - Conferma a due click: primo click → "CONFIRM RESET SEASON" con animazione pulse arancione (scade 5s)
    - Secondo click → cancella match, dettagli, snapshot e training results della stagione corrente
    - Resetta tutti i bonus giocatori (_add = 0)
    - Genera immediatamente nuova stagione con schedule fresco
    - API: POST /api/admin/reset-season (admin auth)
  - **ERASE ALL DATA & RESET APP** (bordo rosso, pulsante in basso):
    - Conferma a due click: primo click → "CONFIRM — ERASE ALL DATA" con animazione pulse rossa (scade 5s)
    - Secondo click → cancella TUTTI i dati: users, teams, players, matches, configs, tokens — tutto
    - Re-seed database con 4 leghe (L1-L4, 80 team, 1600 giocatori)
    - Re-crea configurazioni default training e token
    - Reindirizza a /login — il primo utente che si registra diventa admin automaticamente
    - API: POST /api/admin/wipe-database (admin auth)

### 2. Token Economy Config
- **Token Claim Settings** (card con bordo amber):
  - Tokens per Claim (X): input numerico (1-1000) — quanti token per ogni claim
  - Interval Hours (Y): input numerico (1-168) — ore tra un claim e l'altro
  - Pulsante "SAVE" per salvare configurazione
  - Pulsante "RESET TREASURY" con conferma a due click — azzera tutti i token di tutti gli utenti
    - Primo click: testo cambia in "CONFIRM RESET" con animazione pulse rossa
    - Conferma scade dopo 5 secondi
    - Secondo click: esegue reset globale

### 3. Training Reward Config
- Una card per ogni minigame con:
  - Nome del minigame
  - **Reward Attributes** — checkbox per selezionare quali attributi il gioco potenzia (tutti applicati contemporaneamente)
  - **Reward Target** — selettore a 3 opzioni:
    - "Random Player" — un giocatore casuale dal roster
    - "Specific Role" — un giocatore casuale con posizione specifica (mostra dropdown posizioni)
    - "Entire Team" — tutti i giocatori del roster
  - **Target Position** (visibile solo con "Specific Role"): P, C, 1B, 2B, 3B, SS, LF, CF, RF, DH
  - Reward Amount (input numerico — boost di default per completamento)
  - Min Score for Reward (input 0-1000 — punteggio minimo per ottenere reward)
  - Max Boosts per Season (input numerico — cap stagionale, conta solo boost confermati con firma wallet)
  - Pulsante "SAVE" per salvare la configurazione

## Dati
- API: `GET /api/admin/token-config` — legge configurazione token (admin auth)
- API: `PUT /api/admin/token-config` — aggiorna X e Y (admin auth)
- API: `POST /api/admin/reset-tokens` — reset tesoreria globale (admin auth)
- API: `GET /api/admin/training-config` — lista tutte le configurazioni training (admin auth)
- API: `PUT /api/admin/training-config/:gameType` — aggiorna configurazione (include rewardTarget, rewardTargetRole) (admin auth)
- API: `GET /api/matches` — match per determinare prossimo giorno
- API: `POST /api/simulate-day` — simula giornata (admin auth)
- API: `POST /api/update-playoff-matchups` — aggiorna accoppiamenti playoff (admin auth)
- API: `POST /api/new-season` — avvia nuova stagione (admin auth)
- API: `POST /api/admin/reset-season` — reset + rigenera stagione corrente (admin auth)
- API: `POST /api/admin/wipe-database` — cancella tutto e re-seed (admin auth)

## Come abilitare un utente admin
- **Automatico**: il primo utente a registrarsi su database vuoto (dopo seed o wipe) diventa admin
- **Manuale**: aggiornamento diretto nel database:
```sql
UPDATE users SET is_admin = true WHERE wallet_address = '<wallet>';
```

## Note
- Le configurazioni default vengono seedate automaticamente all'avvio del server
- Token config default: 10 token ogni 24 ore
- Le modifiche hanno effetto immediato
- Il reset tesoreria cancella tutti i record dalla tabella user_tokens
- Simulazione automatica giornata: cron job a 00:00 CET (23:00 UTC) in server/scheduler.ts
- A fine stagione lo scheduler auto-genera nuova stagione (non serve intervento admin)
- Pulsanti manuali in admin consentono override della schedulazione automatica
- Tutte le API admin inviano Authorization: Bearer token nel header
- Database si reseed con 4 leghe (L1-L4): 80 team, 1600 giocatori
- Max 4 leghe — nessuna espansione oltre L4, nuovi utenti assegnati a team liberi nelle 4 leghe esistenti
