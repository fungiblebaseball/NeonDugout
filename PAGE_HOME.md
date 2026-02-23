# Home Page (/)

## File
`client/src/pages/Home.tsx`

## Descrizione
Dashboard principale del manager. Punto di ingresso dopo il wallet connect.

## Sezioni
1. **Wallet Connect** — Schermata pre-auth con bottone connessione (mock wallet per dev)
2. **Header** — Nome team (editabile inline con icona matita), lega/serie/divisione, bottone disconnect
3. **Owner Registry** — Mostra wallet address
4. **Grid Navigazione** — 6 card (2 colonne):
   - LINEUP — Formazione e batting order
   - PITCHERS — Rotazione lanciatori e ruoli
   - ATTACK — Strategia offensiva
   - DEFENSE — Posizionamento difensivo
   - SCHEDULE — Calendario e risultati
   - STANDINGS — Classifica e anteprima partita
5. **Test Match** — Link a simulazione exhibition vs squadra della stessa lega/serie/girone corrente (col-span-2)
6. **Next Game Preview** — Blocco sempre visibile con:
   - Nome avversario e giorno partita
   - Grafico confronto settori (barre affiancate ATK/DEF/PIT) delle due squadre
   - ATK = media (pow + con + spd + eye) roster
   - DEF = media (def) roster
   - PIT = media (vel + ctl + mov + sta) roster
   - Bottone PLAY DAY per simulare giornata completa (col-span-2)
7. **Match Result** — Risultato inline dopo simulazione con link "View Match Report"
8. **Recent Results (scrollabile)** — Lista completa gare disputate dall'utente, scrollabile orizzontalmente o verticalmente
   - Ogni gara mostra: W/L badge, avversario, punteggio
   - Ogni gara cliccabile → apre dettaglio match (/match/:id)
   - Navigazione indietro per vedere tutte le gare precedenti (non solo ultime 3)

## Modifica Nome Team
- Icona matita accanto al nome team nell'header
- Click → campo input inline editabile
- Conferma con Enter o icona check → PATCH `/api/teams/:id/name`
- Annulla con Escape o icona X
- Nome aggiornato in tempo reale nel frontend

## Test Match / Amichevoli
- Avversari caricati dalla stessa lega + serie corrente del team utente
- Endpoint: GET `/api/teams/league/:league/series/:series`
- Filtro esclude il team dell'utente
- Dopo promozione/retrocessione, gli avversari si aggiornano automaticamente

## Dati
- Store Zustand: walletAddress, team, players
- API: `/api/matches`, `/api/teams`, `/api/teams/league/:league/series/:series`
- API: `PATCH /api/teams/:id/name` per rinominare team
- API: `/api/team/:id/players` per statistiche avversario (preview confronto)
- Simulazione batch: `POST /api/simulate-day`
- Salvataggio risultato: incluso nella simulazione batch

## Interazioni
- Connect wallet → navigazione a /login
- Play League Match → simula giornata + mostra risultato + invalida cache
- Tutte le card navigano alla rispettiva pagina
- Click nome team → modalità edit inline
- Click gara in Recent Results → apre Match Detail
- Scroll Recent Results → visualizza tutte le gare passate
