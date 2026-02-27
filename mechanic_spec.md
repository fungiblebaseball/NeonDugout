# Simulation Mechanics Specification — Neon Dugout

## At-Bat Flow

### Fase 1 — Conteggio lanci (`simulatePitchCount`)
Per ogni at-bat si simula una sequenza di lanci. Ogni lancio può essere:
- **Strike** — probabilità influenzata dal matchup rating (MR)
- **Ball** — probabilità influenzata dal MR
- **Foul** — conta come strike fino a 2 strikes, poi neutro

Esiti finali del conteggio:
- 3 strikes → **SO** (Strikeout), battitore eliminato
- 4 balls → **BB** (Base Ball), battitore in 1ª base
- Altrimenti → palla "in play", si passa alla Fase 2

### Fase 2 — Esito battuta (`rollOutcome`)
Il matchup rating + tattiche determinano le probabilità di ogni esito dalla tabella:
- **HR** (Home Run), **3B** (Triplo), **2B** (Doppio), **1B** (Singolo) → battute valide
- **GO** / **FO** → palla in gioco verso la difesa (passa alla Fase 3)

La tabella ha 7 fasce (very_negative → very_positive) basate sul MR.
Modificatori tattici (attacco, difesa, RPS battitore/lanciatore, RPS offesa/difesa) vengono applicati/.

### Fase 3 — Direzione e risoluzione difensiva (PlayI / PlayO)

Quando l'esito è GO o FO, si determina la **direzione della palla**:

**PlayI (palla agli interni):**
- Probabilità = clamp(0.65 - MR/100, 0.25, 0.85)
- MR negativo (lanciatore domina) → alta probabilità PlayI
- Difensori coinvolti: **1B + un interno random** (SS, 2B, 3B)

**PlayO (palla agli esterni):**
- Probabilità = 1 - PlayI
- MR positivo (battitore domina) → alta probabilità PlayO
- Difensore coinvolto: **un esterno random** (LF, CF, RF)

### Fase 3a — Errore
L'errore viene valutato sulla qualità difensiva dei difensori coinvolti:
- PlayI: media difensiva di 1B + interno random
- PlayO: difesa del singolo esterno
- Formula: `errorChance(defRating) = 0.02 + 0.08 / (1 + e^(0.08 * (def - 50)))`
- Se errore → **ERR**: battitore salvo, corridori avanzano 1 base, corridore in 3B segna

### Fase 3b — Risoluzione (se nessun errore)
- PlayI → **GO** (Ground Out)
- PlayO → **FO** (Fly Out)

## Regole Runner Advancement

### GO (Ground Out)
- Battitore eliminato (+1 out)
- Corridori presenti avanzano 1 base
- **Basi piene** → GIDP (doppio gioco): battitore + corridore 1B eliminati (+2 out), nessun punto
- Corridore in 3B segna solo se non produce il 3° out

### FO (Fly Out)
- Battitore eliminato (+1 out)
- Corridori NON avanzano
- **Eccezione sacrifice fly**: corridore in 3B segna punto se il FO non è il 3° out

### HR (Home Run)
- Tutti i corridori + battitore segnano punto

### 3B (Triplo)
- Tutti i corridori segnano, battitore in 3ª base

### 2B (Doppio)
- Corridore in 3B segna, corridore in 2B segna
- Corridore in 1B: segna se velocità sufficiente (prob = 0.6 + spd/200),valuta come opportunità di rubata, altrimenti avanza in 3B

### 1B (Singolo)
- Corridore in 3B segna
- Corridore in 2B: segna se velocità sufficiente (prob = 0.55 + spd/200), altrimenti avanza in 3B
- Corridore in 1B avanza in 2B

### BB (Base Ball)
- Battitore in 1B, corridori spinti avanti
- Basi piene: corridore in 3B segna punto forzato

### ERR (Errore)
- Battitore salvo in 1B
- Corridori avanzano 1 base
- Corridore in 3B segna

## Matchup Rating

`MR = batterScore - pitcherScore`
ma deve essere influenzato da tattica lanciatore vs battitore.
Implementare e marcare come implementato. 

- batterScore = pow×0.25 + con×0.30 + eye×0.20 + spd×0.15
- pitcherScore = vel×0.30 + ctl×0.25 + mov×0.25 + fatiguePenalty
- fatiguePenalty = (inning > 5) ? (inning - 5) × (100 - sta) × 0.04 : 0
- Home advantage: +8 al MR per la squadra di casa

## Pitcher Substitution (v1.13.0 — per-pitcher configs)

Valutata prima di ogni at-bat. Catena: SP → R1 → Closer.
Ogni ruolo ha le stesse 4 condizioni configurabili individualmente tramite `pitcherConfigs` JSONB in `pitcher_rotations`.

**Range uniformi per tutti i ruoli (SP, R1, Closer):**
- pitchCount ≥ maxPitches (10-100)
- inningsPitched ≥ maxInnings (0-9)
- bbAllowed ≥ maxBb (1-10)
- erAllowed ≥ maxEr (1-10)

**Default:**
- SP: { maxPitches: 100, maxInnings: 7, maxBb: 4, maxEr: 4 }
- R1: { maxPitches: 40, maxInnings: 9, maxBb: 4, maxEr: 3 }
- Closer: { maxPitches: 30, maxInnings: 9, maxBb: 4, maxEr: 2 }

Al cambio lanciatore, il pitcherStyle attivo viene aggiornato con lo stile del nuovo pitcher (ricalcolo RPS).

## Tactics System (RPS + Coefficients System v1.14.0)

Le tattiche operano su 3 layer sequenziali applicando coefficienti moltiplicativi alla tabella probabilità.

### Tactic Switching (Schedules)
Ogni team definisce uno schedule (Primary/Secondary/Optional) per:
- `batterApproach`
- `attackStyle`
- `offensiveAttack`

Il sistema valuta quale slot è attivo prima di ogni at-bat basandosi su:
- Inning corrente
- Strikeout subiti (cumulative)
- Run subiti (cumulative)
- Hit subiti (cumulative)

### Meccanica Win/Tie/Lose Bilateral
Per i layer RPS (1 e 3):
- **Win**: Si applicano solo i coefficienti della tattica del vincitore.
- **Lose**: Si applicano solo i coefficienti della tattica del perdente (spesso penalità o bias difensivo).
- **Tie**: Nessun coefficiente applicato (annullamento).

### Layer 1: Batter Approach vs Pitcher Style (RPS)
Il `pitcherStyle` è determinato dal lanciatore attivo.

| Batter \ Pitcher | Velocity | Movement | Command |
|---|---|---|---|
| **Power** | Tie | Batter wins | Pitcher wins |
| **Contact** | Pitcher wins | Tie | Batter wins |
| **Patient** | Batter wins | Pitcher wins | Tie |

### Layer 2: Attack Style + Defense Counter
Modificatori diretti (Attack Style) contrastati dalle posizioni difensive.
- **Attack Styles**: Bunt, Hit & Run, Neutral, Swing on Sight.
- **Defense Counter**: Infield/Outfield Short/Neutral/Deep.

### Layer 3: Offensive Attack vs Defense Setup (RPS)

| Offense \ Defense | Aggressive | Balanced | Protective |
|---|---|---|---|
| **Aggressive** | Defense wins | Tie | Offense wins |
| **Balanced** | Offense wins | Tie | Defense wins |
| **Conservative** | Defense wins | Tie | Tie |

### Coefficienti (Tuning Admin)
Tutti i coefficienti (HR, XBH, 1B, BB, SO, GO, FO) per i 12 tipi di tattica (4 layer x 3 valori) sono configurabili via API Admin e salvati nella tabella `tactic_coefficients`.

## DH Rule

- Con DH attivo: 8 posizioni di campo + DH = 9 battitori, pitcher mai in battuta
- Senza DH: 8 posizioni + SP = 9 battitori, SP batte fino alla sostituzione
- Sostituzioni pitcher (SP→R1→Closer): il rilievo prende lo slot di battuta del predecessore (solo senza DH)

## Play Log

### Struttura
Array di `PlayLogEntry` salvato nel campo `play_log` JSONB di `match_details`.

### Tipi di evento
1. **at_bat** — ogni turno di battuta completato
   - inning, half (top/bottom), outs, batterId, batterName, pitcherId, pitcherName
   - count: balls, strikes, pitches totali
   - outcome: HR/3B/2B/1B/BB/SO/GO/FO/ERR/GIDP
   - fielderName, fielderPosition, playDirection (infield/outfield) — dal sistema PlayI/PlayO
   - basesBefore, basesAfter: stato basi prima e dopo
   - runsScored, outsAdded

2. **pitcher_change** — sostituzione lanciatore
   - inning, half, outs
   - oldPitcherName → newPitcherName, newPitcherRole (R1/Closer)
   - changeReason: motivo con valore effettivo vs soglia (es. "Pitch count: 102/100")

### Lifecycle
- Generato durante simulateGame() in `shared/calculations/simulate.ts`
- Salvato in DB per partite di lega (simulateMatchDay) e via API (POST /api/matches/:id/result)
- Exhibition: generato ma non persistito
- Pulizia: a generazione nuova season, play_log → null sui match_details della season precedente
