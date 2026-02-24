# Simulation Mechanics Specification — Gridiron Ghosts

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
Modificatori tattici (attacco, difesa, RPS battitore/lanciatore, RPS offesa/difesa) vengono applicati in modo moltiplicativo.

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
- Corridore in 1B: segna se velocità sufficiente (prob = 0.6 + spd/200), altrimenti avanza in 3B

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

- batterScore = pow×0.25 + con×0.30 + eye×0.20 + spd×0.15
- pitcherScore = vel×0.30 + ctl×0.25 + mov×0.25 + fatiguePenalty
- fatiguePenalty = (inning > 5) ? (inning - 5) × (100 - sta) × 0.04 : 0
- Home advantage: +8 al MR per la squadra di casa

## Pitcher Substitution

Valutata prima di ogni at-bat. Catena: SP → R1 → Closer.

**SP esce se:**
- pitchCount ≥ maxPitches (50-150)
- inningsPitched ≥ maxInnings (1-9)
- bbAllowed ≥ maxBb (1-10)
- erAllowed ≥ maxEr (1-10)

**R1 esce se:**
- pitchCount ≥ r1MaxPitches (15-80)
- erAllowed ≥ r1MaxEr (1-6)

**Closer esce se:**
- pitchCount ≥ closerMaxPitches (10-60)
- erAllowed ≥ closerMaxEr (1-5)

## Tactics System (RPS Layer)

### Attack Style (4 stili)
| Stile | Effetto |
|-------|---------|
| Bunt | +15% 1B, -20% XBH, -20% HR, +10% GO |
| Hit & Run | +15% 1B, -15% XBH, -25% HR, +5% SO |
| Neutral | Nessun modificatore |
| Swing on Sight | +20% XBH, +15% HR, +20% SO, +10% FO |

### Defense Positioning Counter
- Infield short countra bunt (-12% 1B, +10% GO)
- Infield neutral countra hit & run (-8% 1B, +6% GO)
- Infield deep countra swing on sight (-5% 1B, +5% GO)
- Outfield deep countra power (-8% HR, -6% XBH, +8% FO)

### RPS Batter vs Pitcher
| | Velocity | Movement | Command |
|---|----------|----------|---------|
| Power | Tie | Win | Lose |
| Contact | Lose | Tie | Win |
| Patient | Win | Lose | Tie |

### RPS Offense vs Defense
| | Aggressive | Balanced | Protective |
|---|------------|----------|------------|
| Aggressive | Lose | Tie | Win |
| Balanced | Win | Tie | Lose |
| Conservative | Lose | Tie | Tie |
