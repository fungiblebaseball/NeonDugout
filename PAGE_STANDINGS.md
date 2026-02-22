# Standings Page (/standings)

## File
`client/src/pages/StandingsPage.tsx`

## Descrizione
Classifica divisionale con possibilità di vedere tutti i gironi e anteprima partita.

## Sezioni
1. **Header** — "Standings" + info stagione
2. **Division Switcher** — Toggle tra divisioni (Neon Apex / Chrome Street)
   - Divisione utente contrassegnata con ★
   - Tab attiva evidenziata con colore appropriato
3. **Standings Table** — Classifica completa:
   - Posizione (#)
   - Nome team (utente evidenziato con ★ e bordo cyan)
   - W (vittorie), L (sconfitte)
   - PCT (percentuale vittorie)
   - RF (runs for), RA (runs against)
4. **Match Preview** — Espandibile (solo divisione utente):
   - Header con giorno e data
   - Formazioni affiancate (top 9 giocatori per overall)
   - Ogni giocatore cliccabile (link a /player/:id)
   - Overall rating medio (YOUR OVR vs OPP OVR)
   - Confronto attributi (bar chart per ogni stat: POW, CON, SPD, etc.)

## Dati
- API: `GET /api/teams` (tutte), `GET /api/matches` (tutte)
- API: `GET /api/team/:id/players` (per preview)

## Note
- Classifica calcolata client-side dai risultati match
- Ordinamento per PCT, poi differenziale runs
- Preview disponibile solo per prossima partita nella divisione utente
