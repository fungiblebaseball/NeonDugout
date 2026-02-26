# Team Page (/team)

## File
`client/src/pages/TeamPage.tsx`

## Descrizione
Pagina dedicata alla visualizzazione completa dei dati utente, squadra, credito token e roster completo con dettaglio bonus attributi.

## Sezioni
1. **Header** — "MY TEAM" con stile Orbitron, sottotitolo "Owner Dashboard", bottone back
2. **User Info** — Wallet address e data registrazione utente
3. **Team Info** — Nome team, colore primario, lega/serie/divisione in griglia 2 colonne
4. **Token Balance** — Saldo corrente con icona moneta, bottone "CLAIM TOKENS" (link a Home se disponibile), countdown prossimo claim
5. **Roster** — Tabella completa di tutti i giocatori della squadra:
   - Nome giocatore (cliccabile → link a /player/:id)
   - Posizioni
   - 9 attributi: POW, CON, SPD, EYE, VEL, CTL, MOV, STA, DEF
   - Per ogni attributo: valore totale (base + bonus) in cyan
   - Se bonus > 0: dettaglio "base+bonus" in ambra sotto il totale
   - Righe cliccabili per navigazione a Player Detail

## Dati
- Store Zustand: walletAddress, user, team, token
- API: `GET /api/team/:id/players` — lista giocatori con attributi base e _add
- API: `GET /api/tokens/balance` — saldo token e info claim (autenticato)

## Interazioni
- Click bottone back → torna a Home
- Click nome giocatore o riga → apre Player Detail (/player/:id)
- Click "CLAIM TOKENS" → reindirizza a Home dove avviene il claim con firma
- Tabella scrollabile orizzontalmente per schermi piccoli
- Colonna Player sticky a sinistra durante scroll

## Accesso
- Link nella navigazione bottom (icona Users, label "Team")
- Card "MY TEAM" nella Home page
- Richiede wallet connesso, redirect a loading se non autenticato
