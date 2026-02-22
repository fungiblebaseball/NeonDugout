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
6. **Next League Game** — Bottone per giocare prossima partita di campionato con risultato inline (col-span-2)

## Dati
- Store Zustand: walletAddress, team, players
- API: `/api/matches/:division`, `/api/teams/:division`
- Simulazione: `simulateGame()` dal motore client-side
- Salvataggio risultato: `POST /api/matches/:id/result`

## Interazioni
- Connect wallet → POST `/api/auth/connect`
- Play League Match → simula + salva risultato + invalida cache
- Tutte le card navigano alla rispettiva pagina
