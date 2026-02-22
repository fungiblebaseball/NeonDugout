# Schedule Page (/schedule)

## File
`client/src/pages/SchedulePage.tsx`

## Descrizione
Calendario completo della divisione dell'utente con tutte le giornate e risultati. Le gare giocate sono cliccabili per aprire il report completo.

## Sezioni
1. **Header** — "Schedule" + nome divisione
2. **Stats Cards** — 3 box:
   - Record (W-L)
   - Partite giocate
   - Partite rimanenti
3. **Next Match Card** — Prossima partita utente evidenziata con VS
4. **Full Schedule** — 18 giornate, ciascuna con:
   - Day number + data
   - Tutte le partite del giorno (5 per giornata)
   - Partite utente evidenziate in cyan
   - Risultati (score) per partite giocate con icona "VIEW" cliccabile → naviga a /match/:id
   - "00:00 CET" per partite non giocate

## Dati
- Store: team
- API: `GET /api/matches/:division`, `GET /api/teams/:division`

## Navigazione
- Partite giocate: cliccabili → `/match/:id` (Match Report con box score, statistiche, MVP)
- Partite non giocate: non cliccabili

## Note
- 90 partite totali per divisione (round-robin 10 teams, 18 giornate)
- Le partite dell'utente sono evidenziate con background cyan
- L'icona FileText + "VIEW" appare solo sulle gare giocate
