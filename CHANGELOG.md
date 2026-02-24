# CHANGELOG.md
Tutte le modifiche significative approvate vanno registrate qui in ordine cronologico inverso (più recente in alto).  
Formato:  
- [Data] – [Versione / Milestone] – Descrizione breve  
  • Dettaglio 1 (perché + impatto)  
  • Dettaglio 2 (file modificati)  
  • Trade-off / note (se rilevanti)

## v1.4.6 – 24 febbraio 2026 – Standings Snapshot con Classifiche Finali
- **Campi classifica in team_snapshots** (shared/schema.ts):
  * Aggiunti `wins`, `losses`, `runsFor`, `runsAgainst` alla tabella `team_snapshots`
  * I risultati finali vengono fotografati una sola volta a fine season, zero ricalcoli futuri
- **Calcolo W/L/RF/RA in createTeamSnapshots** (server/storage.ts):
  * Una singola query sulle partite giocate della season calcola W/L/RF/RA per ogni team
  * I dati vengono salvati direttamente nello snapshot — archiviazione pura, costo minimo
- **StandingsPage storico funzionale** (StandingsPage.tsx):
  * Per season passate: classifica letta direttamente dallo snapshot (nessun ricalcolo)
  * W/L/PCT/RF/RA visibili correttamente nella navigazione storica
- Files modificati: `shared/schema.ts`, `server/storage.ts`, `client/src/pages/StandingsPage.tsx`

## v1.4.5 – 24 febbraio 2026 – DH Rule Fix nella Simulazione
- **Regola DH nel motore di simulazione** (shared/calculations/simulate.ts):
  * Con DH attivo: 8 posizioni + DH = 9 battitori, pitcher mai in battuta
  * Senza DH: 8 posizioni + SP = 9 battitori, SP batte fino alla sostituzione
  * Sostituzioni pitcher (SP→R1→Closer): il rilievo prende lo slot di battuta del predecessore (solo senza DH)
  * Nuovo sistema `batterIds[]` per tracciare chi batte ad ogni evento → statistiche corrette anche dopo sostituzioni
- **buildLineupFromSaved() aggiornata** (server/simulation.ts):
  * Rileva DH dal fieldPositions, costruisce lineup di 9 battitori nel modo corretto
  * Passa `homeHasDH`/`awayHasDH` al SimConfig
- **SimulationPage aggiornata** (SimulationPage.tsx):
  * Filtra i pitcher dal batting order quando DH attivo
  * Passa i flag DH alla simulazione exhibition
- Files modificati: `shared/calculations/simulate.ts`, `client/src/lib/calculations/simulate.ts`, `server/simulation.ts`, `client/src/pages/SimulationPage.tsx`

## v1.4.4 – 23 febbraio 2026 – Season History & Team Snapshots
- **Tabella team_snapshots** (shared/schema.ts, server/storage.ts):
  * Nuova tabella `team_snapshots` (teamId, seasonId, name, division, league, series, primaryColor, ownerWallet)
  * Salva lo stato dei team ad ogni fine season prima della promozione/retrocessione
  * Metodi `createTeamSnapshots(seasonId)` e `getTeamSnapshots(seasonId)` in storage
- **Snapshot automatico in generateNewSeason** (server/season.ts):
  * Prima di aggiornare i team alla nuova season, crea snapshot con il seasonId corrente
  * Preserva la composizione divisioni/serie di ogni season passata
- **Endpoint /api/team-snapshots** (server/routes.ts):
  * `GET /api/team-snapshots?season=N` restituisce gli snapshot dei team per la season richiesta
- **Standings storico** (StandingsPage.tsx):
  * Per season passate: carica team snapshot dal nuovo endpoint
  * Bottoni divisione/serie funzionano identicamente alla season corrente
  * Fallback automatico se la divisione selezionata non esiste nella season visualizzata
  * Sezione "MATCH RESULTS" con lista partite giocate cliccabili → Match Detail
  * Match Preview nascosto per season passate
- Files modificati: `shared/schema.ts`, `server/storage.ts`, `server/season.ts`, `server/routes.ts`, `client/src/pages/StandingsPage.tsx`

## v1.4.3 – 23 febbraio 2026 – Dynamic Season Labels & History Navigation
- **Season dinamica in Schedule** (SchedulePage.tsx):
  * Titolo "{division} — Season N" ora usa il seasonId corrente da `/api/season`
  * Rimosso "Season 1" hardcoded
- **Season dinamica in Standings + navigazione storico** (StandingsPage.tsx):
  * Titolo "Season N — League Overview" dinamico
  * Selettore con frecce ◀ ▶ per navigare tra season passate e corrente
  * Standings e divisioni filtrate per seasonId selezionato
  * Match preview nascosto quando si visualizza una season passata
- **Game Day label in Home** (Home.tsx):
  * Titolo box partita: "GAME DAY X" (campionato) / "INTERLEAGUE" / "PLAYOFF"
  * Sottotitolo: "Season N — vs {avversario}" al posto di "Day X — vs ..."
  * Query `current-season` invalidata al cambio stagione
- Files modificati: `client/src/pages/SchedulePage.tsx`, `client/src/pages/StandingsPage.tsx`, `client/src/pages/Home.tsx`

## v1.4.2 – 23 febbraio 2026 – User Placement Fix
- **Assegnamento nuovi utenti invertito** (server/storage.ts):
  * `getUnownedTeam()` ora assegna nella lega più alta e serie più alta disponibile (desc)
  * Ordine: L5E → L5D → ... → L5A → L4E → ... → L1A (scalabile su N leghe × N serie)
  * Prima era ascendente (L1A → L1B → ...), ora parte dall'ultima serie dell'ultima lega
  * Preparato per scaling futuro a 5 leghe × 5 gironi
- Files modificati: `server/storage.ts`

## v1.4.1 – 23 febbraio 2026 – Home Page Enhancements
- **Team Rename inline** (Home.tsx, routes.ts, storage.ts):
  * Icona matita accanto al nome team nell'header
  * Click → campo input editabile, conferma con Enter/Check, annulla con Escape/X
  * Nuovo endpoint `PATCH /api/teams/:id/name` con validazione 1-30 caratteri
  * Aggiornamento immediato nello store Zustand + invalidazione cache
- **Next Game Sector Preview** (Home.tsx):
  * Grafico confronto barre ATK/DEF/PIT tra team utente e prossimo avversario
  * ATK = media (pow + con + spd + eye) roster, DEF = media (def), PIT = media (vel + ctl + mov + sta)
  * Fetch roster avversario via `/api/team/:id/players`
  * Barre sovrapposte cyan (utente) / pink (avversario) con valori numerici
- **FINAL SCORE sempre visibile** (Home.tsx):
  * Blocco FINAL SCORE ora persistente: mostra sempre l'ultima gara giocata dall'utente
  * Si aggiorna quando si preme Play Day (lastResult dallo state locale ha priorità)
  * Fallback ai dati API (recentResults[0]) per persistenza tra sessioni
  * Link "VIEW MATCH REPORT" sempre disponibile
- **Recent Results scrollabili** (Home.tsx):
  * Rimosso limite a 3 risultati, ora mostra tutte le gare disputate
  * Container con `max-h-40 overflow-y-auto` per scroll verticale
  * Aggiunto numero giornata (D1, D2...) per ogni risultato
  * Ogni gara cliccabile → apre dettaglio match
- **Fix Test Match per lega/serie corrente** (SimulationPage.tsx):
  * Cambiato fetch avversari da `/api/teams/:division` a `/api/teams/league/:league/series/:series`
  * Dopo promozione/retrocessione, avversari si aggiornano automaticamente alla lega/serie corrente
  * Nuovo endpoint `GET /api/teams/league/:league/series/:series` (routes.ts, storage.ts)
- **Header aggiornato**: mostra Lega — Serie — Divisione (non più solo Division)
- **Test Match card**: testo aggiornato "Exhibition vs L1 Serie A rival" con lega/serie dinamica
- Files modificati: `client/src/pages/Home.tsx`, `client/src/pages/SimulationPage.tsx`, `server/routes.ts`, `server/storage.ts`, `PAGE_HOME.md`

## v1.4.0 – 23 febbraio 2026 – New Season & Dynamic Leagues
- **Sistema Nuova Stagione** (server/season.ts):
  * `generateNewSeason()` con supporto dinamico N leghe e N serie per lega
  * Preservazione storico: match e risultati delle stagioni precedenti mantenuti (seasonId incrementale)
  * Calendario rigenerato: regular (giorni 1-10), interleague (11-12), playoff (13-14) per ogni lega
  * Interleague scheduling dinamico tra serie adiacenti (A↔B, B↔C, ...)
  * Playoff placeholders con seeding dinamico (ultimi 2 vs primi 2 delle serie)
- **Promozione/Retrocessione cross-lega** (server/season.ts):
  * `applyPromotionRelegation()` gestisce sia intra-lega (swap serie) che cross-lega (swap lega)
  * Cross-league promotion: 1°/2° di lower league Serie A vs ultimi 2 di upper league bottom series (giorni 13-14)
  * Vincitori promossi nella lega superiore, perdenti retrocessi nella lega inferiore
  * Validazione: controlla appartenenza lega prima di muovere i team
  * `updateTeamLeague()` aggiorna league + series + division atomicamente
- **Dynamic League Expansion potenziata** (server/expansion.ts):
  * `ensureExtraLeague()` garantisce sempre una lega vuota oltre la più alta occupata
  * Chiamato pre-assign (auth/verify quando nessun team libero), post-assign, e dopo new-season
  * Supporto serie multiple per lega (A, B, C, ...)
- **Batch Simulation server-side** (server/simulation.ts, server/routes.ts):
  * `POST /api/simulate-day` simula tutte le partite di una giornata per tutti i gironi
  * Usa lineup, rotazione lanciatori e tattiche salvate da DB per ogni team
  * Salva risultati + match details (box score, batter stats, pitcher stats, MVP, flavor text)
  * `POST /api/update-playoff-matchups` aggiorna seeding playoff dinamicamente
- **Playoff Matchup Updates** (server/routes.ts):
  * Seeding dinamico: ultimi N e primi N dalla classifica (non più indici hardcoded 9°/10°)
  * Supporta serie con numero variabile di team
- **Placement utente corretto** (server/storage.ts):
  * `getUnownedTeam()` ordina per: numero lega più basso → serie alfabeticamente più bassa (L1A → L1B → L2A → ...)
- Files modificati: `server/season.ts`, `server/expansion.ts`, `server/simulation.ts`, `server/routes.ts`, `server/storage.ts`, `replit.md`

## v1.3.0 – 23 febbraio 2026 – Strategic Polishing
- **RPS Tactics rework** (shared/calculations/probability.ts):
  * Sistema tattico è un LAYER di buff/debuff, non sostituisce le meccaniche base
  * Modificatori moltiplicativi applicati alla tabella probabilità di base
  * Interplay rock-paper-scissors: short counters bunt, neutral counters H&R, deep counters swing-on-sight
- **Flavor text fattuali** (shared/calculations/flavor.ts → server-side):
  * Rimossi flavor text ironici/inventati, sostituiti con descrizioni fattuali degli eventi partita
  * Generazione basata su eventi reali della simulazione (HR, SO, BB, etc.)
- **Season Stats tracking** (server/expansion.ts, shared/schema.ts):
  * Tabella `player_season_stats` per tracciamento statistiche per stagione
  * Accumulazione stats con `?? 0` defaults per prevenire NaN
  * Career averages calcolate da storico multi-stagione
- **Nomi giocatori espansi**: pool di nomi e cognomi ampliato per maggiore varietà
- **Risultati recenti in Home** (Home.tsx):
  * Sezione "Recent Results" con ultime gare disputate dall'utente
  * Badge W/L colorati, nome avversario, punteggio
- **Player names cliccabili** (LineupPage, PitchersPage, PlayerDetailPage):
  * Nomi giocatori ora cliccabili in tutte le pagine → link a /player/:id
  * PlayerDetailPage potenziata con career averages e statistiche stagionali
- **Calcoli condivisi**: motore simulazione spostato in `shared/calculations/` per riuso client+server
- Files modificati: `shared/calculations/probability.ts`, `shared/calculations/flavor.ts`, `shared/calculations/simulate.ts`, `client/src/pages/Home.tsx`, `client/src/pages/LineupPage.tsx`, `client/src/pages/PitchersPage.tsx`, `client/src/pages/PlayerDetailPage.tsx`, `server/expansion.ts`, `replit.md`

## v1.2.0 – 22 febbraio 2026 – Wallet Authentication & Dynamic League Expansion
- **Autenticazione Solana wallet** (server/auth.ts, server/routes.ts, LoginPage.tsx, store.ts):
  * Flow challenge/verify: POST /api/auth/challenge → nonce, POST /api/auth/verify → JWT + user + team
  * Verifica firma ed25519 con tweetnacl, nonce TTL 5 minuti
  * JWT sessions con scadenza 7 giorni, restore sessione via GET /api/auth/me
  * JWT_SECRET obbligatorio in produzione (fail fast)
- **LoginPage** (client/src/pages/LoginPage.tsx):
  * Selezione wallet: Phantom, Solflare, Backpack, Seeker (auto-detect via Wallet Standard)
  * UI cyberpunk con feedback stato (connessione, firma, verifica, errore)
  * Redirect automatico a Home dopo login
- **WalletProvider** (client/src/components/WalletProvider.tsx):
  * Wrapper @solana/wallet-adapter-react con PhantomWalletAdapter, SolflareWalletAdapter, BackpackWalletAdapter
  * Seeker rilevato automaticamente tramite Wallet Standard
- **Dynamic League Expansion** (server/expansion.ts):
  * Trigger automatico quando tutti i team hanno un owner e un nuovo utente si registra
  * Crea nuova lega (L3, L4, ...) con SerieA + SerieB (10 team ciascuna)
  * Genera 400 giocatori (20 per team) con distribuzione gaussiana attributi
  * Crea calendario 14 giorni completo (regular + interleague + playoff)
  * Errore 503 esplicito se espansione fallisce (nessuno stato inconsistente)
- **Store aggiornato** (client/src/lib/store.ts):
  * loginWithSignature: firma challenge → verifica → salva JWT
  * restoreSession: ripristino sessione da JWT salvato
  * disconnectWallet: logout con pulizia token
  * JWT token persistito in localStorage
- **Routing aggiornato** (client/src/App.tsx):
  * Aggiunta rotta /login con LoginPage
  * Home redirect a /login se non autenticato
  * Session restore automatico al caricamento app
- **Buffer polyfill** (client/src/main.tsx): compatibilità browser per @solana/web3.js
- Files modificati: `server/auth.ts` (new), `server/expansion.ts` (new), `server/routes.ts`, `shared/schema.ts`, `client/src/components/WalletProvider.tsx` (new), `client/src/pages/LoginPage.tsx` (new), `client/src/lib/store.ts`, `client/src/App.tsx`, `client/src/main.tsx`, `client/src/pages/Home.tsx`
- Dipendenze aggiunte: `@solana/wallet-adapter-react`, `@solana/wallet-adapter-base`, `@solana/wallet-adapter-phantom`, `@solana/wallet-adapter-solflare`, `@solana/wallet-adapter-backpack`, `@solana/web3.js`, `jsonwebtoken`, `tweetnacl`, `uuid`

## v1.0 – 22 febbraio 2026 – Tactical Gameplay Engine
- **Pitcher Switch Conditions estese** (PitchersPage.tsx, schema.ts):
  * Aggiunti campi R1: r1MaxPitches (15-80), r1MaxEr (1-6)
  * Aggiunti campi Closer: closerMaxPitches (10-60), closerMaxEr (1-5)
  * Slider separati per SP, R1, Closer nella UI
  * Schema `pitcher_rotations` aggiornato con 4 nuove colonne
- **Lineup Manager potenziato** (LineupPage.tsx):
  * SP ora movibile nel batting order (prima era fisso)
  * Aggiunto toggle DH come alternativa a SP che batte
- **Attack Tactics con modificatori numerici** (AttackPage.tsx, probability.ts):
  * Bunt: +15% singles, -20% XBH, -20% HR, +10% ground outs
  * Hit & Run: +15% singles, -15% XBH, -25% HR, +5% strikeouts
  * Neutral: nessun modificatore (base pura)
  * Swing on Sight: +20% XBH, +15% HR, +20% SO, +10% fly outs
  * UI allineata ai coefficienti reali in probability.ts
- **Defense Counter-Strategy** (DefensePage.tsx, probability.ts):
  * Infield Short counters Bunt: -12% singles, +10% GO
  * Infield Neutral counters H&R: -8% singles, +6% GO
  * Infield Deep counters SoS: -5% singles, +5% GO
  * Outfield Short counters Bunt: -5% singles, +4% FO
  * Outfield Neutral counters H&R: -4% singles
  * Outfield Deep counters SoS: -8% HR, -6% XBH, +8% FO
  * Effetti numerici ora visibili nella UI
- **Simulazione Engine rewrite** (simulate.ts):
  * Usa lineup/roster/tattiche salvate da DB (non più auto-generate)
  * Sostituzione lanciatori a catena: SP → R1 → Closer
  * Tracking pitch count, innings, BB, ER per ogni lanciatore
  * Condizioni di sostituzione configurabili per ruolo
  * TacticsModifiers applicati alla tabella probabilità
- **Match Preview aggiornata** (StandingsPage.tsx):
  * Mostra lineup salvati con posizioni e batting order
  * Griglia separata per pitcher roster (SP/R1/Closer/2P)
- **Home.tsx**: fetch e uso config salvate per entrambe le squadre (lineup, rotation, tactics)
- Files modificati: `shared/schema.ts`, `server/routes.ts`, `client/src/pages/Home.tsx`, `client/src/pages/SimulationPage.tsx`, `client/src/pages/LineupPage.tsx`, `client/src/pages/PitchersPage.tsx`, `client/src/pages/AttackPage.tsx`, `client/src/pages/DefensePage.tsx`, `client/src/pages/StandingsPage.tsx`, `client/src/lib/calculations/simulate.ts`, `client/src/lib/calculations/probability.ts`, `client/src/lib/calculations/types.ts`

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
