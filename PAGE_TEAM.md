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
   - **Header**: icona Users, "Roster (N players)", bottone reload (RotateCcw) a destra
     - Il bottone reload invalida e rifetch `team-players`, `lineup`, `pitcher-rotation`
     - Animazione spin durante il refetch
   - **Colonne**:
     - **Player**: nome cliccabile → /player/:id (sticky a sinistra)
     - **Pos**: posizioni naturali del giocatore
     - **#**: numero nel batting order (1-9) se il giocatore è nel lineup, "—" altrimenti (verde)
     - **FLD**: posizione difensiva assegnata (C, 1B, 2B, SS, etc.), "—" se non assegnato (verde)
     - **9 attributi**: POW, CON, SPD, EYE, VEL, CTL, MOV, STA, DEF — header cliccabili per ordinamento
   - **Ordinamento colonne**: click su header attributo cicla desc → asc → nessuno. Freccia ▼/▲ sulla colonna attiva
   - Per ogni attributo: valore totale (base + bonus) in cyan
   - Se bonus > 0: dettaglio "base+bonus" in ambra sotto il totale
   - Righe cliccabili per navigazione a Player Detail

## Dati
- Store Zustand: walletAddress, user, team, token
- API: `GET /api/team/:id/players` — lista giocatori con attributi base e _add (refetchOnMount: 'always')
- API: `GET /api/lineup/:teamId` — battingOrder e fieldPositions per colonne # e FLD (refetchOnMount: 'always')
- API: `GET /api/tokens/balance` — saldo token e info claim (autenticato)

## Interazioni
- Click bottone back → torna a Home
- Click nome giocatore o riga → apre Player Detail (/player/:id)
- Click "CLAIM TOKENS" → reindirizza a Home dove avviene il claim con firma
- Click bottone reload (RotateCcw) → invalida cache e rifetch dati
- Click header colonna attributo → ordina roster (desc → asc → none)
- Tabella scrollabile orizzontalmente per schermi piccoli
- Colonna Player sticky a sinistra durante scroll

## Accesso
- Link nella navigazione bottom (icona Users, label "Team")
- Card "MY TEAM" nella Home page
- Richiede wallet connesso, redirect a loading se non autenticato
