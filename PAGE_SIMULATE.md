# Simulation Page (/simulate)

## File
`client/src/pages/SimulationPage.tsx`

## Descrizione
Partita amichevole/exhibition per testare la formazione contro avversari della stessa lega e serie.

## Sezioni
1. **Header** — "Test Match" + nome team
2. **Opponent Selection** — Lista avversari della stessa lega/serie + bottone Random Opponent
3. **Game Result** — Dopo simulazione:
   - Scoreboard (team home vs away con punteggio)
   - Linescore inning per inning (R/H/E)
   - Game Report — Testi flavor generati dal motore
   - Batter Stats — Tabella battitori (AB, H, HR, RBI, BB, SO, AVG)
   - Pitcher Stats — Card per ogni lanciatore usato (IP, SO, ER, H, BB, PC)
   - MVP — Player of the Game
   - Play Log — Accordion collassabile con log inning-per-inning (at-bat + pitcher changes + pitcher tactics change)
4. **New Match Button** — Reset per nuova simulazione

## Dati
- Store: team, players
- API: `GET /api/teams/league/:league/series/:series` (avversari stessa lega/serie)
- API: `GET /api/team/:id/players` (roster avversario)
- API: `GET /api/lineup/:teamId`, `GET /api/pitcher-rotation/:teamId`, `GET /api/tactics/:teamId` (configurazioni salvate)
- Motore: `simulateGame()` da `shared/calculations/simulate.ts`

## Meccaniche
- **DH Rule**: con DH attivo → 8 posizioni + DH = 9 battitori, pitcher non batte. Senza DH → 8 posizioni + SP = 9 battitori, SP batte.
- **Pitcher Chain**: SP → R1 → Closer (sostituzione automatica basata su soglie configurabili per pitchCount, innings, BB, ER)
- **Tattiche RPS**: le 7 tattiche salvate (attackStyle, infieldPosition, outfieldPosition, batterApproach, pitcherStyle, offensiveAttack, defenseSetup) vengono usate per entrambe le squadre
- **PlayI/PlayO**: direzione battuta basata su matchup rating → errore valutato su difensori specifici

## Note
- Risultati exhibition NON salvati nel database (non influenzano classifica)
- Play log generato ma non persistito (solo in memoria per la sessione corrente)
- Lineup/rotation/tactics caricati da DB per entrambe le squadre
- Se un team non ha configurazione salvata, usa defaults (lineup auto-generato, rotation base, tattiche neutral)
