# Admin Page (/admin)

## File
`client/src/pages/AdminPage.tsx`

## Descrizione
Pannello di amministrazione per configurare le regole di reward dei minigame di allenamento. Accessibile solo a utenti con `is_admin = true` nella tabella `users`.

## Accesso
- Nessun link nella navigazione — accesso diretto via URL `/admin`
- Protezione: verifica `isAdmin` dallo stato auth (Zustand store)
- Utenti non-admin vengono reindirizzati alla Home
- API admin protette con middleware che ritorna 403 per non-admin

## Sezioni
1. **Header** — "ADMIN PANEL" con icona Shield, stile Orbitron
2. **Training Config Cards** — Una card per ogni minigame con:
   - Nome del minigame
   - Reward Attributes (checkbox per selezionare quali attributi il gioco può potenziare)
   - Reward Amount (input numerico — boost di default per completamento)
   - Min Score for Reward (slider 0-1000 — punteggio minimo per ottenere reward)
   - Max Boosts per Season (input numerico — cap stagionale)
   - Pulsante "SAVE" per salvare la configurazione

## Dati
- API: `GET /api/admin/training-config` — lista tutte le configurazioni
- API: `PUT /api/admin/training-config/:gameType` — aggiorna configurazione per tipo di gioco

## Come abilitare un utente admin
Aggiornamento manuale nel database:
```sql
UPDATE users SET is_admin = true WHERE wallet_address = '<wallet>';
```

## Note
- Le configurazioni default vengono seedate automaticamente all'avvio del server
- Le modifiche hanno effetto immediato sui prossimi completamenti di minigame
