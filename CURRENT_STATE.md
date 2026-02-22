# CURRENT_STATE.md
Ultimo aggiornamento: 22 febbraio 2026  
Versione: 0.8 (Standings + Player Detail + League Play)

## Milestone completate
- [x] Fase 0: Setup Replit + ambiente base (Vite + React + TS + wallet adapter mock)
- [x] Fase 1: Autenticazione wallet (mock tramite Zustand) + firma messaggio base
- [x] Fase 2: Struttura base UI mobile-first (nav a scomparsa, theme rétro)
- [x] Fase 2/B: Mock Dati Globali — COMPLETATA e superata
- [x] Fase 4: Modello base DB + schema Drizzle (users, teams, players, matches, lineups, pitcher_rotations, tactics)
- [x] Fase 4/B: Full-stack API (Express routes + DatabaseStorage + seed 20 team, 400 giocatori, calendario round-robin)
- [x] Fase 4/C: Pagine gestione squadra (Lineup, Pitchers, Attack, Defense) con persistenza DB
- [x] Fase 4/D: Rework Pitcher Roles (SP, R1, C, 2P) con integrazione dinamica nel Lineup
- [x] Fase 4/E: SchedulePage — calendario divisione completo con 90 partite su 18 giornate
- [x] Fase 4/F: StandingsPage — classifica divisionale con switch gironi + anteprima partita
- [x] Fase 4/G: PlayerDetailPage — carta giocatore con attributi + career averages
- [x] Fase 4/H: Play Next League Match — simulazione manuale gara campionato da Home
- [x] Fase 6: Calcoli core client-side (matchup_rating, simulateAtBat, simulateInning, simulateGame)
- [ ] Fase 3: Integrazione API server Contabo
- [ ] Fase 5: Programma Anchor MVP (token SPL + escrow semplice)
- [ ] Fase 7: Batch processor server-side (simulazione giornaliera 00:00 CET)
- [ ] Fase 8: Lock durante processing + UX messaggio
- [ ] Fase 9: Storico partite granulare + API stats base
- [ ] Fase 10: MVP giocabile (crea account -> lineup -> preview -> risultati)

## Stato attuale complessivo
- Fase corrente: v0.8
- Backend: Express + Drizzle + PostgreSQL su Replit, 7 tabelle, 13+ API endpoints
- Frontend: 11 pagine (Home, Lineup, Pitchers, Attack, Defense, Simulate, Schedule, Standings, PlayerDetail, 404)
- Navigation: 7 items bottom bar (Hub, Lineup, Pitch, ATK, DEF, Sched, Rank)
- Classifica: calcolata client-side, switch divisioni, match preview con formazioni
- Dettaglio giocatore: carta con attributi, barre colorate, career averages
- Liga play: simulazione manuale gara campionato con salvataggio risultato
- Documentazione: 9 file PAGE_*.md per ogni pagina

## Progress % stimato (qualitativo)
- Visione & spec: 100%
- Architettura & stack: 95%
- Codice effettivo: 60%
- Testing: 5%
- Deploy/test Seeker: 0%
