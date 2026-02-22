# Home Page (/)

## File
`client/src/pages/Home.tsx`

## Descrizione
Dashboard principale del manager. Punto di ingresso dopo il wallet connect.

## Sezioni
1. **Wallet Connect** — Schermata pre-auth con bottone connessione (mock wallet per dev)
2. **Header** — Nome team, divisione, bottone disconnect
3. **Owner Registry** — Mostra wallet address
4. **Grid Navigazione** — 6 card (2 colonne):
   - LINEUP — Formazione e batting order
   - PITCHERS — Rotazione lanciatori e ruoli
   - ATTACK — Strategia offensiva
   - DEFENSE — Posizionamento difensivo
   - SCHEDULE — Calendario e risultati
   - STANDINGS — Classifica e anteprima partita
5. **Test Match** — Link a simulazione exhibition (col-span-2)
6. **Next League Game** — Bottone per giocare prossima giornata di campionato. Simula la gara, salva risultato e dettagli completi (box score, statistiche giocatori, lineup schierati) nel DB. Mostra risultato inline con link "VIEW MATCH REPORT" per aprire il report completo.
7. **MATCH RESULTS** — Sintesi risultato ultima gara con link navigabile alla pagina dettaglio /match/:id

## Dati
- Store Zustand: walletAddress, team, players
- API: `/api/matches/:division`, `/api/teams/:division`
- Simulazione: `simulateGame()` dal motore client-side
- Salvataggio risultato: `POST /api/matches/:id/result` (con payload `details` contenente boxScore, flavorTexts, mvp, lineup, batters, pitcher)

## Interazioni
- Connect wallet → POST `/api/auth/connect`
- Play League Match → simula + salva risultato + salva dettagli + invalida cache
- View Match Report → naviga a `/match/:matchId`
- Tutte le card navigano alla rispettiva pagina
