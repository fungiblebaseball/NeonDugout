# CHANGELOG.md
Tutte le modifiche significative approvate vanno registrate qui in ordine cronologico inverso (più recente in alto).  
Formato:  
- [Data] – [Versione / Milestone] – Descrizione breve  
  • Dettaglio 1 (perché + impatto)  
  • Dettaglio 2 (file modificati)  
  • Trade-off / note (se rilevanti)

## Unreleased / In planning
- nulla ancora

## v0.8 – 22 febbraio 2026 – Standings, Player Detail, League Play
- **StandingsPage** (client/src/pages/StandingsPage.tsx):
  * Classifica divisionale con W/L/PCT/RF/RA calcolata da risultati match
  * Switch tra divisioni (Neon Apex / Chrome Street)
  * Divisione e team utente evidenziati con ★ e bordo cyan
  * Bottone "Match Preview" espandibile con formazioni affiancate
  * Top 9 giocatori per overall, cliccabili (link a /player/:id)
  * Confronto stat-by-stat con barre (POW, CON, SPD, etc.)
  * Overall medio squadre a confronto
- **PlayerDetailPage** (client/src/pages/PlayerDetailPage.tsx):
  * Carta giocatore con spazio immagine (placeholder per future NFT art)
  * Nome, posizioni, overall rating, BAT avg, PITCH avg
  * 9 barre attributi colorate per fascia (rosso→cyan)
  * Career averages grid (OVR, BAT, PITCH, DEF, SPD, STA)
- **Home aggiornata**:
  * Bottone "NEXT LEAGUE GAME" con simulazione campionato manuale
  * Risultato inline dopo simulazione (score + nomi team)
  * Card STANDINGS aggiunta con link a /standings
  * Schedule e Standings in grid 2x1 (erano col-span-2)
- **API nuove**:
  * `GET /api/matches` — tutte le partite (per classifica cross-divisione)
  * `GET /api/player/:id` — dettaglio giocatore singolo
  * `POST /api/matches/:id/result` — salva risultato gara giocata
- **Navigation** aggiornata a 7 items: + Rank (Standings)
- **File MD per pagina**: 9 file PAGE_*.md in root per ogni pagina
- Files modificati: `server/routes.ts`, `server/storage.ts`, `client/src/pages/Home.tsx`, `client/src/pages/StandingsPage.tsx` (new), `client/src/pages/PlayerDetailPage.tsx` (new), `client/src/components/Navigation.tsx`, `client/src/App.tsx`

## v0.7 – 22 febbraio 2026 – Schedule + Pitcher Roles rework
- **Pitcher Roles rework** (PitchersPage.tsx):
  * Schema: aggiunto campo `roles` JSONB a `pitcher_rotations` (`{ sp, r1, closer, nextSp }`)
  * UI: 4 ruoli con select dedicati: SP (Starting Pitcher), R1 (Rilievo 1), C (Closer), 2P (Next Starter auto-rotato)
  * Ogni ruolo mostra stats VEL/CTL/MOV/STA/DEF del lanciatore assegnato
  * Bullpen section per lanciatori non assegnati a ruoli
  * Switch conditions (pitches, innings, BB, ER) applicate allo SP
- **Lineup integration** (LineupPage.tsx):
  * Posizione P rinominata visivamente in "SP" — mostra dinamicamente il pitcher dal pitching staff
  * SP non editabile dal Lineup (impostato via Pitching Staff page)
  * Bench ora filtra i lanciatori (gestiti in pagina separata)
- **SchedulePage** (client/src/pages/SchedulePage.tsx):
  * Calendario completo divisione utente (90 partite, 18 giornate round-robin)
  * Card "NEXT MATCH" evidenziata con avversario, data, giorno
  * Record W-L, partite giocate, rimanenti
  * Ogni giornata espansa con tutte le partite del girone, partite utente evidenziate
  * Risultati (score + FINAL) per partite giocate
- **Navigation** aggiornata a 6 items: Hub, Lineup, Pitch, ATK, DEF, Sched
- **Home** dashboard: card SCHEDULE ora attiva con link a /schedule (non più disabled)
- Files modificati: `shared/schema.ts`, `server/routes.ts`, `client/src/pages/PitchersPage.tsx`, `client/src/pages/LineupPage.tsx`, `client/src/pages/SchedulePage.tsx`, `client/src/pages/Home.tsx`, `client/src/components/Navigation.tsx`, `client/src/App.tsx`

## v0.6 – 22 febbraio 2026 – Fase 6 completata (Simulazione core client-side)
- Implementato motore di simulazione partita in `client/src/lib/calculations/`:
  • `matchup.ts` – matchupRating (formula da MECHANICS_SPEC v0.2-beta), teamDefenseAvg, gidpChance, errorChance
  • `probability.ts` – tabella probabilità esiti a 7 fasce (very_negative..very_positive), rollOutcome con distribuzione cumulativa
  • `simulate.ts` – simulateAtBat (conteggio pitches realistico ~3-5 per PA), simulateGame completo con 9+ innings, base running, GIDP, error
  • `rng.ts` – SeededRNG (LCG) per riproducibilità test, con seed opzionale e fallback a timestamp
  • `flavor.ts` – generatore flavor text ironici rétro per HR, SO, BB, GIDP, Error, close/blowout games, MVP
  • `types.ts` – tipi puri (SimPlayer, SimTeam, AtBatResult, BoxScore, GameResult, etc.)
- Creata pagina `/simulate` (SimulationPage.tsx) con:
  • Selezione avversario dal girone (pick o random)
  • Box score tabellare inning-per-inning (R-H-E)
  • Batter stats dettagliati (AB, H, HR, RBI, BB, SO, AVG)
  • Pitcher stats (IP, H, ER, BB, SO, PC)
  • Flavor texts rétro-ironici (3-5 per partita)
  • MVP del match (auto-calcolato da stats)
- Aggiunto bottone "TEST MATCH" nella dashboard Home con gradiente cyan-pink
- Aggiunta rotta /simulate in App.tsx

## v0.5 – 22 febbraio 2026 – Full-stack + 4 nuove pagine gestione
- Migrazione da MemStorage a PostgreSQL con Drizzle ORM
  • Schema: users, teams, players, matches, lineups, pitcher_rotations, tactics
  • Seed automatico: 20 team, 400 giocatori, calendario round-robin completo
- Creato `server/db.ts`, `server/seed.ts`, `server/storage.ts` (DatabaseStorage)
- 10 API endpoints in `server/routes.ts` (auth/connect, teams, players, lineup, pitcher-rotation, tactics)
- Zustand store riscritto per chiamare API backend (non più mock locale)
- 4 nuove pagine:
  • LineupPage – field positions + batting order drag
  • PitchersPage – rotation order + sliders condizioni switch (max pitches/innings/BB/ER)
  • AttackPage – 4 strategie offensive (bunt, hit&run, neutral, swing-on-sight)
  • DefensePage – infield/outfield positioning (short/neutral/deep)
- Navigation bottom bar aggiornata a 5 items (Hub, Lineup, Pitch, ATK, DEF)
- Creato BACKEND_PREREQUISITES.md per deploy su Contabo

## v0.4 – 22 febbraio 2026 – Aesthetic Guide & TOURNAMENT_STRUCTURE base
- Creato `TOURNAMENT_STRUCTURE.md` in root per tenere traccia delle direttive dei gironi mock e round-robin.
- Modificata `mockData.ts` per far sì che la promozione tra girone A e B sia puramente basata sui risultati, rimuovendo la logica hardcoded che sbilanciava forzatamente il girone A per permettere che sia meritocratica. (Nota: l'utente verrà sempre assegnato alla Division B inizialmente).
- Creato il file `AESTHETIC_GUIDE.md` con palette colori e font precisi per consolidare la direzione artistica Retro Cyberpunk.
- Aggiornato `PRODUCT_VISION.md` per referenziare la nuova guida estetica.
- Aggiornato `index.html` importando i font richiesti dalla guida: Orbitron, VT323, e Press Start 2P.
- Riscritto `index.css` per utilizzare nativamente i colori hex e le variabili esatte descritte nella `AESTHETIC_GUIDE.md`.

## v0.3 – 22 febbraio 2026 – Fase 2/B completata (Mock League + Dati Globali)
- Espansi i tipi `types.ts` per supportare `League`, `Division`, `MatchDay`, `Match`.
- Riscritto il generatore dati in `mockData.ts` seguendo il documento TOURNAMENT_STRUCTURE.
  • Genera Girone A e Girone B (10 team ciascuno) con attributi più alti per il girone A tramite `gaussianRand`.
  • Genera un calendario round-robin per divisioni a 10 team (andata/ritorno) tramite Berger table.
- Modificato lo store `Zustand` (`store.ts`) per mantenere la lega globale e non solo un team.
  • Al primo login, l'utente "occupa" la prima squadra libera nel girone B (Chrome Street Division).
- Aggiunta in UI la divisione di appartenenza della propria squadra.

## v0.2 – 22 febbraio 2026 – Fase 1 & 2 completate (Mock UI)
- Aggiunto `useGameStore` (Zustand) con persistenza per wallet e lineup.
- Implementata generazione mock team & players.
- Creata Dashboard `Home.tsx` con aesthetic neon 80s/90s.
- Creata schermata `LineupPage.tsx` per gestione starter 9.

## v0.1 – 22 febbraio 2026 – Fondazione documentazione & architettura
- Approvati PRODUCT_VISION.md e specifiche iniziali.
