# CURRENT_STATE.md
Ultimo aggiornamento: 22 febbraio 2026  
Versione: 0.3 (Fase 2/B completata - Dati Lega Mock)

## Milestone completate
- [x] Fase 0: Setup Replit + ambiente base (Vite + React + TS + wallet adapter mock)
- [x] Fase 1: Autenticazione wallet (mock tramite Zustand) + firma messaggio base
- [x] Fase 2: Struttura base UI mobile-first (nav a scomparsa, theme rétro)
- [x] Fase 2/B: Mock Dati Globali (Gironi A/B, Calendario round-robin, allocazione utente in Div B)
- [ ] Fase 3: Integrazione API server Contabo (health check + dummy endpoint)
- [ ] Fase 4: Modello base DB + schema Prisma (leagues, teams, players, games)
- [ ] Fase 5: Programma Anchor MVP (token SPL + escrow semplice)
- [ ] Fase 6: Calcoli core client-side (matchup_rating + simulate at-bat pure functions)
- [ ] Fase 7: Batch processor server-side (simulazione giornaliera mock)
- [ ] Fase 8: Lock durante processing + UX messaggio
- [ ] Fase 9: Storico partite granulare + API stats base
- [ ] Fase 10: MVP giocabile (crea account → lineup → preview → risultati mock)

## Stato attuale complessivo (da aggiornare manualmente dopo ogni milestone)
- Fase corrente: Fase 2/B completata (Lega globale generata client-side, round-robin, store aggiornato)
- Repo Replit: /
- Server Contabo: /
- Programma Anchor: /
- Ultima modifica significativa: Generazione round robin (Berger table) e assegnazione utente a division B.
- Problemi aperti noti: I giocatori mock per ora sono calcolati localmente e associati pseudo-casualmente al Team tramite Index. (Adeguato per la fase Client Mock).
- Prossima azione: Sviluppare visualizzazione calendario o passare a simulazione (Fase 6).

## Progress % stimato (qualitativo)
- Visione & spec: 100%
- Architettura & stack: 90%
- Codice effettivo: 25%
- Testing: 0%
- Deploy/test Seeker: 0%
