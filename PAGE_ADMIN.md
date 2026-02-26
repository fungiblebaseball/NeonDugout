# Admin Page (/admin)

## File
`client/src/pages/AdminPage.tsx`

## Descrizione
Pannello di amministrazione per configurare token economy e regole di reward dei minigame di allenamento. Accessibile solo a utenti con `is_admin = true` nella tabella `users`.

## Accesso
- Nessun link nella navigazione — accesso diretto via URL `/admin`
- Protezione: verifica `isAdmin` dallo stato auth (Zustand store)
- Utenti non-admin vengono reindirizzati alla Home
- API admin protette con middleware che ritorna 403 per non-admin

## Sezioni

### 1. Token Economy Config
- **Token Claim Settings** (card con bordo amber):
  - Tokens per Claim (X): input numerico (1-1000) — quanti token per ogni claim
  - Interval Hours (Y): input numerico (1-168) — ore tra un claim e l'altro
  - Pulsante "SAVE" per salvare configurazione
  - Pulsante "RESET TREASURY" con conferma a due click — azzera tutti i token di tutti gli utenti
    - Primo click: testo cambia in "CONFIRM RESET" con animazione pulse rossa
    - Conferma scade dopo 5 secondi
    - Secondo click: esegue reset globale

### 2. Training Reward Config
- Una card per ogni minigame con:
  - Nome del minigame
  - Reward Attributes (checkbox per selezionare quali attributi il gioco può potenziare)
  - Reward Amount (input numerico — boost di default per completamento)
  - Min Score for Reward (input 0-1000 — punteggio minimo per ottenere reward)
  - Max Boosts per Season (input numerico — cap stagionale)
  - Pulsante "SAVE" per salvare la configurazione

## Dati
- API: `GET /api/admin/token-config` — legge configurazione token
- API: `PUT /api/admin/token-config` — aggiorna X e Y
- API: `POST /api/admin/reset-tokens` — reset tesoreria globale
- API: `GET /api/admin/training-config` — lista tutte le configurazioni training
- API: `PUT /api/admin/training-config/:gameType` — aggiorna configurazione per tipo di gioco

## Come abilitare un utente admin
Aggiornamento manuale nel database:
```sql
UPDATE users SET is_admin = true WHERE wallet_address = '<wallet>';
```

## Note
- Le configurazioni default vengono seedate automaticamente all'avvio del server
- Token config default: 10 token ogni 24 ore
- Le modifiche hanno effetto immediato
- Il reset tesoreria cancella tutti i record dalla tabella user_tokens
