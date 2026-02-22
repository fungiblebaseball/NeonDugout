# Simulation Page (/simulate)

## File
`client/src/pages/SimulationPage.tsx`

## Descrizione
Partita amichevole/exhibition per testare la formazione contro avversari della divisione.

## Sezioni
1. **Header** — "Test Match" + nome team
2. **Opponent Selection** — Lista avversari divisione + bottone Random Opponent
3. **Game Result** — Dopo simulazione:
   - Scoreboard (team home vs away con punteggio)
   - Linescore inning per inning (R/H/E)
   - Game Report — Testi flavor generati dal motore
   - Batter Stats — Tabella battitori (AB, H, HR, RBI, BB, SO, AVG)
   - Pitcher Stats — Card lanciatore (IP, SO, ER, H, BB, PC)
   - MVP — Player of the Game
4. **New Match Button** — Reset per nuova simulazione

## Dati
- Store: team, players
- API: `GET /api/teams/:division`, `GET /api/team/:id/players`
- Motore: `simulateGame()`, `resetRng()` (client-side pure functions)

## Note
- Risultati exhibition NON salvati nel database (non influenzano classifica)
- Il motore usa matchupRating, probability tables, defense-based errors
