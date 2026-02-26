# Home Page (/)

## File
`client/src/pages/Home.tsx`

## Descrizione
Dashboard principale del manager. Punto di ingresso dopo il wallet connect. Esalta le peculiarità dell'app: training, token economy, strategia e ownership Web3.

## Sezioni
1. **Wallet Connect** — Schermata pre-auth con bottone connessione (mock wallet per dev)
2. **Header** — Logo, nome team (editabile inline, testo text-2xl), lega/serie/divisione, bottone disconnect
3. **Final Score** — Box ultima gara giocata col-span-2, subito dopo header:
   - Nomi squadre, punteggio in stile Press Start 2P
   - Bottone "VIEW MATCH REPORT"
   - Persistente tra sessioni (fallback su recentResults[0])
4. **Training Center** — Box con bordo glitter amber, SEMPRE VISIBILE (non collapsible):
   - Header con icona Dumbbell e titolo "TRAINING CENTER"
   - Griglia 3 colonne con mini card per ogni minigame
   - Descrizioni attributi DINAMICHE: caricate dalla configurazione admin (`GET /api/training-configs`)
   - Eye Drill (icona Eye) → `/training/eye-drill` — "Reaction · {admin config attrs}"
   - Batting Practice (icona Target) → `/training/batting` — "Swing · {admin config attrs}"
   - Pitch Control (icona Crosshair) → `/training/pitch-control` — "Accuracy · {admin config attrs}"
   - Fallback a valori default se config non caricata
   - Struttura pronta per espansione: con >3 giochi le righe overflow diventano scrollabili
5. **Token Balance** — Box con saldo token corrente, bottone CLAIM (con firma wallet) o countdown prossimo claim
6. **Pitchers & Lineup** — Riga compatta con due bottoni link secondari (PITCHERS primo, LINEUP secondo)
7. **Attack & Defense** — Due card tattiche affiancate
8. **Game Day Info** (read-only) — Blocco informativo:
   - GAME DAY: mostra giorno, avversario, sector preview (ATK/DEF/PIT)
   - SEASON COMPLETE: mostra stato fine stagione
   - Nessun bottone di simulazione — match auto-simulati a mezzanotte CET
   - Testo informativo: "Next match auto-simulated at 00:00 CET" / "Admin will start next season"
9. **Navigation Cards** — TEST MATCH, PLAY LOG, MY TEAM, SCHEDULE, STANDINGS
10. **Recent Results** — Lista scrollabile di tutte le gare disputate dall'utente
11. **Owner Registry** — Mostra wallet address, posizionato in fondo alla pagina

## Token Claim Flow
1. Utente clicca "CLAIM X TOKENS"
2. Frontend richiede challenge: POST /api/tokens/claim-challenge
3. Wallet firma il messaggio
4. Frontend invia firma: POST /api/tokens/claim → token accreditati
5. Bottone disabilitato con countdown se intervallo non trascorso

## Modifica Nome Team
- Icona matita accanto al nome team nell'header
- Click → campo input inline editabile
- Conferma con Enter o icona check → PATCH `/api/teams/:id/name`
- Annulla con Escape o icona X

## Dati
- Store Zustand: walletAddress, team, players, token
- API: `/api/matches`, `/api/teams`, `/api/season`
- API: `/api/training-configs` — configurazioni training pubbliche per label dinamiche
- API: `/api/tokens/balance` — saldo e stato claim
- API: `POST /api/tokens/claim-challenge` + `POST /api/tokens/claim` — flusso claim
- API: `PATCH /api/teams/:id/name` per rinominare team
- API: `/api/team/:id/players` per statistiche avversario

## Interazioni
- Connect wallet → navigazione a /login
- Claim tokens → firma wallet → accredito
- Tutte le card navigano alla rispettiva pagina
- Click nome team → modalità edit inline
