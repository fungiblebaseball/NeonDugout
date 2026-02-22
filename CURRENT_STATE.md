# CURRENT_STATE.md
Ultimo aggiornamento: 22 febbraio 2026  
Versione: 0.6 (Fase 6 completata - Simulazione core client-side)

## Milestone completate
- [x] Fase 0: Setup Replit + ambiente base (Vite + React + TS + wallet adapter mock)
- [x] Fase 1: Autenticazione wallet (mock tramite Zustand) + firma messaggio base
- [x] Fase 2: Struttura base UI mobile-first (nav a scomparsa, theme rétro)
- [x] Fase 2/B: Mock Dati Globali (Gironi A/B, Calendario round-robin, allocazione utente in Div B)
- [x] Fase 4: Modello base DB + schema Drizzle (users, teams, players, matches, lineups, pitcher_rotations, tactics)
- [x] Fase 4/B: Full-stack API (Express routes + DatabaseStorage + seed 20 team, 400 giocatori, calendario round-robin)
- [x] Fase 4/C: Pagine gestione squadra (Lineup, Pitchers, Attack, Defense) con persistenza DB
- [x] Fase 6: Calcoli core client-side (matchup_rating, simulateAtBat, simulateInning, simulateGame)
- [ ] Fase 3: Integrazione API server Contabo (health check + endpoint; doc BACKEND_PREREQUISITES.md pronta)
- [ ] Fase 5: Programma Anchor MVP (token SPL + escrow semplice)
- [ ] Fase 7: Batch processor server-side (simulazione giornaliera mock)
- [ ] Fase 8: Lock durante processing + UX messaggio
- [ ] Fase 9: Storico partite granulare + API stats base
- [ ] Fase 10: MVP giocabile (crea account → lineup → preview → risultati mock)

## Stato attuale complessivo
- Fase corrente: Fase 6 completata (simulazione partita exhibition funzionante client-side)
- Backend: Express + Drizzle + PostgreSQL su Replit, 7 tabelle, 10 API endpoints
- Frontend: 7 pagine (Home, Lineup, Pitchers, Attack, Defense, Simulate, 404)
- Simulazione: motore pure-function in lib/calculations/ (matchup_rating, at-bat con conteggio pitches, 7-bracket probability table, base running, GIDP, error, flavor text generator)
- Repo Replit: /
- Server Contabo: non ancora configurato (doc pronta)
- Programma Anchor: /
- Ultima modifica significativa: Implementazione completa simulazione partita con box score, batter/pitcher stats, MVP, flavor texts.
- Problemi aperti noti: Simulazione è client-side (exhibition mode). Il batch processor server-side per le partite ufficiali del calendario è ancora da implementare (Fase 7).
- Prossima azione: Batch processor server-side o deploy su Contabo.

## Progress % stimato (qualitativo)
- Visione & spec: 100%
- Architettura & stack: 95%
- Codice effettivo: 45%
- Testing: 5% (simulazione testabile manualmente)
- Deploy/test Seeker: 0%
