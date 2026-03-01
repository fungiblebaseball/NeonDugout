# PIANIFICAZIONE_TATTICA.md — v1.17.0

## Obiettivo

Aggiungere la meccanica Stolen Base (rubata) alla simulazione, migrare i modificatori Attack Style (Layer 2) e Defense Counter (Layer 2b) da hardcoded a coefficienti DB, aggiungere la colonna `tac_st` (steal) alla tabella coefficienti, ridisegnare le pagine Attack e Defense con valori dinamici da API, aggiornare Admin UI e tutta la documentazione.

---

## Algoritmo Stolen Base — 2 Fasi

### Condizioni Preliminari (Gate)

- Corridore in 1a o 2a base (rubata di casa dalla 3a VIETATA)
- Meno di 2 out (con 2 out: VIETATO)
- Esito at-bat = SO o BB (palla in mano al catcher, non in play)

### Fase 1 — Probabilità di TENTATIVO

```
attemptProb = 0.15                          // base 15%
  + (runner.spd - 60) / 300                 // velocisti tentano di più
  - (pitcher.ctl - 50) / 400               // lanciatore attento scoraggia
  + tac_st_mod                              // coefficiente tac_st dai layer tattici
```

- `tac_st_mod` = somma dei coefficienti `tac_st` dai layer tattici attivi / 100
  - Layer contribuenti: `attack_style`, `offensive_attack`, `defense_counter_infield`, `defense_counter_outfield`
  - Esempio: attack_style/hit_and_run ha tac_st=15, defense_counter_infield/short ha tac_st=-8 → tac_st_mod = (15 + 0 - 8 + 0) / 100 = +0.07
- Clamp: `[0.02, 0.35]` — tra 2% e 35% per at-bat
- Se roll < attemptProb → il corridore tenta la rubata
- Se più corridori in base, si valuta il più avanzato (2a prima di 1a); un solo tentativo per at-bat

### Fase 2 — Probabilità di RIUSCITA

```
successProb = 0.50
  + (runner.spd * 0.4 + runner.eye * 0.3 + runner.sta * 0.3
   - catcher.def * 0.4 - catcher.eye * 0.3 - catcher.sta * 0.3) / 150
```

- Puro confronto corridore vs catcher — NESSUNA influenza tattica
- Clamp: `[0.25, 0.90]`
- Se roll < successProb → SAFE (corridore avanza 1 base)
- Se roll >= successProb → OUT (caught stealing, corridore eliminato, +1 out)

### Statistiche Attese

- ~1-4 tentativi per partita (realistico)
- Tasso di successo tipico: 60-75% (dipende da matchup giocatori)

---

## Schema Modifiche DB

### Tabella `tactic_coefficients` — Nuova colonna

| Colonna | Tipo | Default | Descrizione |
|---------|------|---------|-------------|
| `tac_st` | integer | 0 | Modificatore probabilità tentativo rubata |

### Nuovi Layer (righe da aggiungere)

| Layer | tacticValue | hr | xbh | single | bb | so | go | fo | tac_st |
|-------|-------------|-----|-----|--------|-----|-----|-----|-----|--------|
| `attack_style` | bunt | -20 | -20 | 15 | 0 | 0 | 10 | 0 | 10 |
| `attack_style` | hit_and_run | -25 | -15 | 15 | 0 | 5 | 0 | 0 | 15 |
| `attack_style` | swing_on_sight | 15 | 20 | 0 | 0 | 20 | 0 | 10 | -10 |
| `defense_counter_infield` | short | 0 | 0 | -12 | 0 | 0 | 10 | 0 | -8 |
| `defense_counter_infield` | deep | 0 | 0 | -5 | 0 | 0 | 5 | 0 | 5 |
| `defense_counter_outfield` | short | 0 | 0 | -5 | 0 | 0 | 0 | 4 | -5 |
| `defense_counter_outfield` | deep | -8 | -6 | 0 | 0 | 0 | 0 | 8 | 3 |

I valori hr/xbh/single/etc. sono ricavati dagli attuali `ATTACK_MODIFIERS` e `getDefenseCounterBonus()` hardcoded (convertiti da decimale a intero percentuale).

### Layer Esistenti — aggiunta tac_st

| Layer | tacticValue | tac_st (nuovo) |
|-------|-------------|----------------|
| `batter_approach` | power / contact / patient | 0 |
| `pitcher_style` | velocity / movement / command | 0 |
| `offensive_attack` | aggressive | 12 |
| `offensive_attack` | balanced | 0 |
| `offensive_attack` | conservative | -8 |
| `defense_setup` | aggressive | -6 |
| `defense_setup` | balanced | 0 |
| `defense_setup` | protective | 4 |

---

## Flusso Coefficienti Aggiornato

```
PROBABILITY_TABLE[bracket]     ← attributi giocatore (immutabili)
        │
        ▼
   Layer 1: Batter vs Pitcher  ← RPS bilateral (coefficienti per-tattica da DB)
        │                         [batter_approach / pitcher_style]
        ▼
   Layer 2: Attack Style        ← modificatori diretti da DB (coefficienti per-tattica)
        │                         [attack_style: bunt, hit_and_run, swing_on_sight]
        │                         neutral = nessun modificatore
        ▼
   Layer 2b: Defense Counter    ← modificatori diretti da DB (coefficienti per-tattica)
        │                         [defense_counter_infield: short, deep]
        │                         [defense_counter_outfield: short, deep]
        │                         neutral = nessun modificatore
        ▼
   Layer 3: Offense vs Defense  ← RPS bilateral (coefficienti per-tattica da DB)
        │                         [offensive_attack / defense_setup]
        ▼
   Normalizzazione (somma = 1.0)
        │
        ▼
   Roll esito (HR/XBH/1B/BB/SO/GO/FO)
        │
        ▼
   Post-roll: Stolen Base check ← tac_st da tutti i layer sopra
        │                         (solo se SO/BB + corridore in base + <2 out)
        │                         Fase 1: tentativo (tac_st influenza)
        │                         Fase 2: riuscita (confronto corridore/catcher puro)
        ▼
   Avanzamento basi / scoring
```

---

## Task di Implementazione

### T001: DB Schema — colonna `tac_st` + nuovi layer + migration
- **Blocked By**: []
- **File**: shared/schema.ts, server/storage.ts, shared/calculations/probability.ts
- **Dettagli**:
  - Aggiungere colonna `tac_st` (integer, default 0) a `tactic_coefficients` in schema.ts
  - Aggiungere `tac_st` a `TacticCoefficientRow` in probability.ts
  - Aggiornare `seedDefaultTacticCoefficients()` in storage.ts: aggiungere righe per `attack_style`, `defense_counter_infield`, `defense_counter_outfield` con valori dalla tabella sopra; aggiungere `tac_st` a tutti i seed esistenti
  - Aggiornare `updateTacticCoefficient()` per gestire campo `tac_st`
  - Eseguire db:push
- **Accettazione**: DB ha colonna tac_st; nuovi layer seedati; query funzionanti

### T002: Meccanica Stolen Base nel motore di simulazione
- **Blocked By**: [T001]
- **File**: shared/calculations/types.ts, shared/calculations/simulate.ts, client/src/lib/calculations/types.ts, client/src/lib/calculations/simulate.ts
- **Dettagli**:
  - Aggiungere tipo PlayLogEntry `stolen_base` con: runnerId, runnerName, fromBase, toBase, success, catcherName
  - In `simulateHalfInning()`, DOPO la risoluzione dell'at-bat:
    - Gate: esito SO o BB + corridore in 1a o 2a + outs < 2
    - Fase 1: calcolo attemptProb con formula + tac_st_mod da coefficienti attivi
    - Fase 2: se tentativo, calcolo successProb (confronto corridore/catcher puro)
    - Aggiornare basi e out di conseguenza
    - Push PlayLogEntry `stolen_base`
  - Trovare il catcher dalla defenseLineup (posizione 'C')
  - Sincronizzare shared/ e client/src/lib/calculations/
- **Accettazione**: Rubate avvengono nella simulazione; ~1-4 per partita; log nel play log

### T003: Sostituire Attack Style e Defense Counter hardcoded con coefficienti DB
- **Blocked By**: [T001]
- **File**: shared/calculations/probability.ts, client/src/lib/calculations/probability.ts
- **Dettagli**:
  - Rimuovere costante `ATTACK_MODIFIERS` hardcoded
  - Rimuovere funzione `getDefenseCounterBonus()` hardcoded
  - In `getOutcomeProbabilities()`:
    - Layer 2: leggere coefficienti `attack_style/{attackStyle}` da array coefficients e applicare (skip se neutral)
    - Layer 2b: leggere `defense_counter_infield/{infieldPos}` e `defense_counter_outfield/{outfieldPos}` e applicare (skip se neutral)
  - Mantenere fallback hardcoded quando coefficients non è fornito (retrocompatibilità)
  - Sincronizzare shared/ e client/
- **Accettazione**: Layer 2 e 2b leggono da DB; neutral non applica modificatori; risultati simulazione nello stesso range

### T004: Admin UI — nuovi layer + colonna tac_st
- **Blocked By**: [T001]
- **File**: client/src/pages/AdminPage.tsx, server/routes.ts, server/storage.ts
- **Dettagli**:
  - In AdminPage `TacticCoefficientsCard`: aggiungere colonna `tac_st` alla tabella editabile per TUTTI i layer
  - Aggiungere sezioni per: "Attack Style" (bunt, hit_and_run, swing_on_sight), "Defense Counter Infield" (short, deep), "Defense Counter Outfield" (short, deep)
  - Route PUT accetta campo `tac_st` nel body
  - `updateTacticCoefficient` gestisce `tac_st`
- **Accettazione**: Admin vede e modifica tutti i layer incluso tac_st; salvataggio persistente

### T005: Redesign pagina Attack — coefficienti dinamici per Attack Style
- **Blocked By**: [T001, T003]
- **File**: client/src/pages/AttackPage.tsx
- **Dettagli**:
  - Sezione Attack Style: mostrare badge dinamici dai coefficienti DB (attack_style layer) incluso `tac_st`
  - Descrizione ed effetti da DB, non hardcoded
  - `refetchOnMount: 'always'` sulla query coefficienti
- **Accettazione**: Attack Style mostra valori reali da DB incluso tac_st

### T006: Redesign pagina Defense — coefficienti dinamici per posizionamento
- **Blocked By**: [T001, T003]
- **File**: client/src/pages/DefensePage.tsx
- **Dettagli**:
  - Fetch coefficienti da `/api/tactic-coefficients`
  - Infield Position: badge dinamici da `defense_counter_infield` (short, deep) incluso `tac_st`
  - Outfield Position: badge dinamici da `defense_counter_outfield` (short, deep) incluso `tac_st`
  - Defense Setup: badge dinamici da `defense_setup` layer
  - Descrizioni ed effetti da DB
  - `refetchOnMount: 'always'` sulla query coefficienti
- **Accettazione**: Posizionamento mostra valori reali da DB incluso tac_st

### T007: Rendering play log per eventi stolen_base
- **Blocked By**: [T002]
- **File**: client/src/pages/MatchDetailPage.tsx, client/src/pages/PlayLogPage.tsx
- **Dettagli**:
  - Rendering per `stolen_base` PlayLogEntry
  - Nome corridore, base rubata, esito safe/out
  - Stile distinto: verde per safe, rosso per caught stealing
  - Aggiungere `stolen_base` all'interfaccia locale PlayLogEntry
- **Accettazione**: Tentativi rubata visibili nel play log con indicazione safe/out

### T008: Documentazione
- **Blocked By**: [T001, T002, T003, T004, T005, T006, T007]
- **File**: Steal_mechanic.md, Pages_Tattics_Influence.md, PAGE_ATTACK.md, PAGE_DEFENSE.md, MECHANICS_SPEC.md, CHANGELOG.md, replit.md
- **Dettagli**:
  - Creare `Steal_mechanic.md`: documentazione completa della meccanica (condizioni, formula 2 fasi, influenza tattica, clamp, AI threshold)
  - Aggiornare `Pages_Tattics_Influence.md`: Layer 2 e 2b ora da DB; tac_st nel flusso; nuovi layer
  - Aggiornare `PAGE_ATTACK.md`: coefficienti dinamici per Attack Style incluso tac_st
  - Aggiornare `PAGE_DEFENSE.md`: coefficienti dinamici per posizionamento incluso tac_st
  - Aggiornare `MECHANICS_SPEC.md`: marcare Stolen Base come IMPLEMENTATO, formula aggiornata
  - Aggiornare `CHANGELOG.md`: entry v1.17.0
  - Aggiornare `replit.md`: version bump
- **Accettazione**: Tutti i doc aggiornati; Steal_mechanic.md creato; CHANGELOG completo

---

## Dipendenze tra Task

```
T001 (DB schema)
  ├── T002 (stolen base engine)
  │     └── T007 (play log rendering)
  ├── T003 (DB coefficients replace hardcoded)
  │     ├── T005 (attack page redesign)
  │     └── T006 (defense page redesign)
  └── T004 (admin UI)
              │
              ▼
         T008 (documentazione) ← aspetta tutto
```

T002, T003, T004 possono partire in parallelo dopo T001.
T005, T006 partono dopo T003.
T007 parte dopo T002.
T008 è l'ultimo.
