# CURRENT_STATE.md
Ultimo aggiornamento: 22 febbraio 2026  
Versione: 0.7 (Schedule + Pitcher Roles rework)

## Milestone completate
- [x] Fase 0: Setup Replit + ambiente base (Vite + React + TS + wallet adapter mock)
- [x] Fase 1: Autenticazione wallet (mock tramite Zustand) + firma messaggio base
- [x] Fase 2: Struttura base UI mobile-first (nav a scomparsa, theme rétro)
- [x] Fase 2/B: Mock Dati Globali (Gironi A/B, Calendario round-robin, allocazione utente in Div B) — COMPLETATA e superata: dati ora in PostgreSQL reale, non mock client-side
- [x] Fase 4: Modello base DB + schema Drizzle (users, teams, players, matches, lineups, pitcher_rotations, tactics)
- [x] Fase 4/B: Full-stack API (Express routes + DatabaseStorage + seed 20 team, 400 giocatori, calendario round-robin)
- [x] Fase 4/C: Pagine gestione squadra (Lineup, Pitchers, Attack, Defense) con persistenza DB
- [x] Fase 4/D: Rework Pitcher Roles (SP, R1, C, 2P) con integrazione dinamica nel Lineup
- [x] Fase 4/E: SchedulePage — calendario divisione completo con 90 partite su 18 giornate
- [x] Fase 6: Calcoli core client-side (matchup_rating, simulateAtBat, simulateInning, simulateGame)
- [ ] Fase 3: Integrazione API server Contabo (health check + endpoint; doc BACKEND_PREREQUISITES.md pronta)
- [ ] Fase 5: Programma Anchor MVP (token SPL + escrow semplice)
- [ ] Fase 7: Batch processor server-side (simulazione giornaliera 00:00 CET)
- [ ] Fase 8: Lock durante processing + UX messaggio
- [ ] Fase 9: Storico partite granulare + API stats base
- [ ] Fase 10: MVP giocabile (crea account -> lineup -> preview -> risultati)

## Stato attuale complessivo
- Fase corrente: v0.7 (gestione completa squadra + schedule visualizzabile)
- Backend: Express + Drizzle + PostgreSQL su Replit, 7 tabelle, 10+ API endpoints
- Frontend: 9 pagine (Home, Lineup, Pitchers, Attack, Defense, Simulate, Schedule, 404)
- Navigation: 6 items bottom bar (Hub, Lineup, Pitch, ATK, DEF, Sched)
- Pitcher staff: ruoli SP/R1/C/2P con select e stats, switch conditions per SP
- Lineup: P mostra SP dinamicamente dal pitching staff, non editabile direttamente
- Schedule: 90 partite per division (18 giornate round-robin), card prossima partita, record W-L
- Simulazione: motore pure-function client-side (matchup_rating, probability table, defense-based errors)
- Repo Replit: /
- Server Contabo: non ancora configurato
- Programma Anchor: /
- Prossima azione: Batch processor server-side (Fase 7) o standings/classifica

## Progress % stimato (qualitativo)
- Visione & spec: 100%
- Architettura & stack: 95%
- Codice effettivo: 52%
- Testing: 5%
- Deploy/test Seeker: 0%
