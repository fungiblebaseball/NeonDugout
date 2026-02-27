# Pitchers Page (/pitchers)

## File
`client/src/pages/PitchersPage.tsx`

## Descrizione
Gestione staff lanciatori con assegnazione ruoli, condizioni di sostituzione per-pitcher e tattica di lancio per-pitcher. Ogni ruolo ha le sue regole e il suo stile RPS configurabili individualmente.

## Sezioni
1. **Header** — Titolo "Pitching Staff" + nome team
2. **Pitcher Sequence** — 5 card collassabili nella sequenza:
   - **SP** (Starting Pitcher) — Partente gara corrente
   - **R1** (Relief 1) — Primo rilievo quando SP viene sostituito
   - **C** (Closer) — Chiusura / salvataggio
   - **BP** (Bullpen) — Lanciatori non assegnati a ruoli (non collassabile)
   - **2P** (Next Starter) — Prossimo partente (auto-rotato dopo la gara)

3. **Ogni Card Ruolo (SP, R1, C)** contiene:
   - **Header**: badge ruolo + dropdown selezione pitcher + freccia collassa/espandi
   - **Stats Inline**: VEL/CTL/MOV/STA/DEF + stats stagionali (W/L, ERA, IP, SO, WHIP, GS)
   - **Riepilogo**: mini badge con stile pitcher attivo + condizioni in formato compatto (P:100 IP:7 BB:4 ER:4)
   - **Body Collassabile** (toggle click su card):
     - **Switch Conditions** — 4 slider UNIFORMI per ogni ruolo:
       - Pitch Count: 10-100
       - Innings Pitched: 0-9
       - Base on Balls (BB): 1-10
       - Earned Runs (ER): 1-10
     - **Pitcher Style (RPS)** — 3 opzioni per-pitcher:
       - Velocity (beats Contact, loses to Patient)
       - Movement (beats Patient, loses to Power)
       - Command (beats Power, loses to Contact)

4. **Card 2P** — Solo dropdown + stats (nessuna condizione/tattica)

5. **Bullpen** — Griglia lanciatori non assegnati con mini stats

6. **Save Button** — "SAVE PITCHING STAFF"

## Matrice RPS Batter vs Pitcher Style

| Batter \ Pitcher | Velocity | Movement | Command |
|---|----------|----------|---------|
| **Power** | Tie | Batter wins | Pitcher wins |
| **Contact** | Pitcher wins | Tie | Batter wins |
| **Patient** | Batter wins | Pitcher wins | Tie |

## Dati
- Store: team, players
- API: `GET/POST /api/pitcher-rotation`
- Schema: `roles` JSONB `{ sp, r1, closer, nextSp }`, `pitcherConfigs` JSONB `{ sp: PitcherRoleConfig, r1: PitcherRoleConfig, closer: PitcherRoleConfig }`
- `PitcherRoleConfig`: `{ maxPitches, maxInnings, maxBb, maxEr, pitcherStyle }`

## Note
- Solo giocatori con posizione "P" appaiono nei dropdown ruoli
- Lo SP selezionato qui appare automaticamente nel Lineup come posizione SP
- Il `pitcherStyle` e' PER-PITCHER (salvato in pitcherConfigs JSONB nella tabella pitcher_rotations), NON e' piu' globale nella tabella tactics
- Ogni volta che durante la gara si cambia lanciatore, la simulazione ricalcola i coefficienti RPS usando lo stile del NUOVO lanciatore attivo
- Le statistiche dei lanciatori di rilievo appaiono nei dettagli gara (homePitchers/awayPitchers array)
- Range uniformi per tutti i ruoli: Pitch Count 10-100, Innings Pitched 0-9, BB 1-10, ER 1-10
