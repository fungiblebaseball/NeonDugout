# TOURNAMENT_STRUCTURE.md
Ultimo aggiornamento: 22 febbraio 2026  
Versione: 1.0 (struttura mock iniziale per MVP)

## Scopo del file
Definisce la struttura di base del torneo / leghe / gironi in modo leggibile e modificabile.  
Serve come "single source of truth" per la generazione dati mock nella fase 2/B.  
Non contiene logica di codice, solo dati descrittivi e regole semplici.

## Livello gerarchico attuale (MVP)
- Leghe: inizialmente 2 lega principali ("esempio nomi casuali tipo fantascienza anni 50/70 e Baseball League")
- Gironi / Serie: 2 gironi mock ("A" e "B")
- Squadre per girone: 10
- Totale squadre mock: 20
- Giocatori per squadra: 20 (totale 400 giocatori mock)
- Alla registrazione di un nuovo giocatore tramite firma wallet e creazione account gli viene assegnato il controllo di una squadra non gestita da utenti del girone.
- Se un girone è pieno (tutte squadre con ownerPubkey non-null) → crea girone C (opzionale, non per MVP)

## Regole di creazione gironi
- Girone A: livello alto (Vedremo se le squadre più forti manterranno il livello)
- Girone B: livello basso (assegnazione iniziale utenti nuovi, vedremo se possono promuovere al livello Girone A)
- Se un girone è pieno (tutte squadre con ownerPubkey non-null) → crea girone C (opzionale, non per MVP)

## Nomi gironi mock (modificabili)
- Girone A: "Neon Apex Division"
- Girone B: "Chrome Street Division"

## Nomi squadre mock di esempio, trova nomi random mixati con questo flavour (10 per girone – espandibili)
Girone A (più "premium"):
1. Neon Vortex Rays
2. Volt City Thunder
3. Chrome Ionizers
4. Acid Palm Bombers
5. Roxy Quantum Hawks
6. Jax Plasma Kings
7. Luna Cyber Sox
8. Blitz Neon Knights
9. Echo Pulse Giants
10. Flux Mirage Crushers

Girone B (più "street"):
1. Rusty Neon Rebels
2. Chrome Alley Outlaws
3. Volt Trash Pandas
4. Acid Drop Dusters
5. Roxy Street Sharks
6. Jax Backlot Bandits
7. Luna Midnight Misfits
8. Blitz Scrapyard Dogs
9. Echo Junkyard Jokers
10. Flux Shadow Stingers

## Regole generazione giocatori (per squadra)
- 20 giocatori per squadra
- Posizioni approssimative (distribuzione suggerita):
  - 8 Position Players (OF/IF)
  - 4 Catchers / Utility
  - 5 Pitchers (3 starter, 2 reliever)
  - 3 Extra (bench / multi-role)
- Attributi (1–100, distribuzione realistica):
  - Media ~55–60
  - 1–2 "star" per squadra (80+ in 2–3 attributi)
  - 3–4 "scarsi" (sotto 40)
  - Batter: POW, CON, SPD, EYE
  - Pitcher: VEL, CTL, MOV, STA
- Nomi flavor: mix cognome + aggettivo rétro-neon (es. "Jax Voltstrike", "Roxy Acidbat", "Luna Neonpitch")

## Calendario base (regole)
- Formato: round-robin (andata + ritorno)
- Giornate totali: 14 (5 andata + 1 Riposo/allenamento + 1Evento Amichevole Sfida + 5 ritorno + 1 Playoff Promozione Retrocessione Scontro diretto  + 1 Inter League Super Series)
- Partite per giornata per girone: 5 (10 squadre → tutti giocano)
- Orario simulato: tutte le partite si giocano alle 00:00 CET (batch giornaliero)
- Struttura dati suggerita per calendario:
  [
    { day: 1, date: "2026-03-01", matches: [{home: "teamId1", away: "teamId2"}, ...] },
    ...
  ]

## Classifica & Stats (regole base)
- Classica Scorer Baseball Avg PV num Gare Perse etc.
- Tie-breaker: head-to-head → differenza runs → runs segnati
- Stats da tracciare per MVP:
  Squadra: W-L-D, Runs Scored/Allowed, GB (games back)
  Giocatore: AVG, HR, RBI, SO, H 2H 3H, SB, KK, BB, Media arrivi in base, Tutto.  (batter); ERA, WHIP, K/9, Count Strike/Ball, BB, K, all playas myst be recorded  (pitcher)

## Modifiche future possibili (da aggiornare qui)
- Aggiungere girone C/D/E quando girone B pieno
- Introduzione tornei intergirone / playoff
- Eventi speciali (Allenamento, Torneo Intergirone)
- Stagione divisa in blocchi (55 andata + 1 Riposo/allenamento + 1Evento Amichevole Sfida + 5 ritorno + 1 Playoff Promozione Retrocessione Scontro diretto  + 1 Inter League Super Series)

Fine file – mantienilo semplice e leggibile.
