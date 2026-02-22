# Match Detail Page (/match/:id)

## File
`client/src/pages/MatchDetailPage.tsx`

## Descrizione
Report completo di una gara giocata con tutti i dettagli statistici, lineup schierati, box score e testi narrativi.

## Sezioni
1. **Header** — "Match Report" + Day + Data, freccia Back → Schedule
2. **Scoreboard** — Team home vs away con punteggio finale grande, badge FINAL
3. **Linescore** — Tabella inning per inning con R/H/E per entrambe le squadre
4. **Game Report** — Testi flavor generati durante la simulazione (narrativa della gara)
5. **Batter Stats** — Due tabelle (home e away) con:
   - Nome giocatore (cliccabile → /player/:id)
   - AB, H, HR, RBI, BB, SO, AVG
6. **Pitcher Stats** — Due card (home e away) con:
   - Nome lanciatore (cliccabile → /player/:id)
   - IP, SO, ER, H, BB, PC (Pitch Count)
7. **MVP** — Player of the Game con motivazione
8. **Navigation Buttons** — Link a Schedule e Standings

## Dati
- API: `GET /api/match-details/:matchId` (boxScore, flavorTexts, mvp, lineup, batters, pitcher)
- API: `GET /api/matches` (per info gara base: day, date, teams, score)
- API: `GET /api/teams` (per nomi squadre)

## Navigazione
- Back → /schedule
- Nomi giocatori (battitori e lanciatori) → /player/:id
- Bottoni navigazione → /schedule, /standings

## Note
- I dettagli vengono salvati nel DB al momento della simulazione della gara (sia da Home che dal batch processor)
- Include lineup esatti schierati quel giorno (playerIds + pitcherId per entrambe le squadre)
- Accessibile da: Schedule (gare giocate), Home (dopo simulazione)
