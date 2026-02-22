# Schedule Page (/schedule)

## File
`client/src/pages/SchedulePage.tsx`

## Descrizione
Calendario completo della divisione dell'utente con tutte le giornate e risultati.

## Sezioni
1. **Header** — "Schedule" + nome divisione
2. **Stats Cards** — 3 box:
   - Record (W-L)
   - Partite giocate
   - Partite rimanenti
3. **Next Match Card** — Prossima partita utente evidenziata con VS
4. **Full Schedule** — 5 giornate andata + 2 giornate torneo intergirone 5 giornate ritorno internvallate da 2 giornate torneo scontro diretto playoff playout prime 2 girone basso VS ultime 2 girone alto quando finisce la stagione i gironi saranno creati promuovendo le squadre vincitrici ai playoff al girone superiore della loro lega e le ultime 2 sconfitte dai playout finiranno nel girone inferiore, ciascuna con:
   - Day number + data
   - Tutte le partite del giorno (5 per giornata)
   - Partite utente evidenziate in cyan
   - Risultati (score + FINAL) per partite giocate
   - "00:00 CET" per partite non giocate
   - ** BOTTONE MOSTRA PREVIEW** Che mostra pagina anteprima lineup delle due squadre con lanciatori partenti e Lineup attualmente salvato. 
   - ** BOTTONE MOSTRA GARA, dove possibile aprire la pagina con la sintesi dell'esito della gara recuperando dati come lineup del momento e statistiche di squadra
   
    

## Dati
- Store: team
- API: `GET /api/matches/:division`, `GET /api/teams/:division`

## Note
- 90 partite totali per divisione (round-robin 10 teams, 18 giornate)
- Le partite dell'utente sono evidenziate con background cyan
