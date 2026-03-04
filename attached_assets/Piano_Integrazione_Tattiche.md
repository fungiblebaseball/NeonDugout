# Piano Integrazione Tattiche v1.14.0 - COMPLETED

## Status: COMPLETED (28 Febbraio 2026)
Tutte le fasi dell'integrazione sono state completate con successo. Il sistema ora gestisce coefficienti dinamici caricati da database, meccaniche RPS bilaterali Win/Tie/Lose e switch delle tattiche in-game tramite schedule temporali.

### Obiettivo
Trasformare il sistema tattico da coefficienti generici statici a coefficienti per-tattica dinamici con meccanica Win/Tie/Lose bilateral, tattiche cambiabili in-game (3 box temporali) e tuning admin.

---

## 1. Ordine Confronti Tattici (per ogni at-bat)

```
AT-BAT FLOW:
  1. Calcolo matchup_rating (attributi batter vs pitcher + fatigue + home advantage)
  2. Selezione probability bracket dalla PROBABILITY_TABLE
  3. Layer 1: BATTER APPROACH vs PITCHER STYLE (RPS bilateral)
  4. Layer 2: ATTACK STYLE + DEFENSE COUNTER (modificatori diretti + counter posizionale)
  5. Layer 3: OFFENSIVE ATTACK vs DEFENSE SETUP (RPS bilateral)
  6. Normalizzazione probabilità → roll esito
```

---

## 2. Meccanica Win/Tie/Lose Bilateral

Per ogni confronto RPS:
- **Win attaccante**: i coefficienti della tattica attaccante SI applicano, quelli del difensore NO
- **Win difensore**: i coefficienti della tattica difensore SI applicano, quelli dell'attaccante NO
- **Tie**: NESSUN coefficiente per nessuno (annullamento reciproco)

Questo vale per Layer 1 (Batter vs Pitcher) e Layer 3 (Offense vs Defense).
Il Layer 2 (Attack Style) usa modificatori diretti + counter (non RPS bilateral).

---

## 3. Tabelle Coefficienti Per-Tattica

### Layer 1 — Batter Approach (coefficienti attaccante)

| Approach | HR | XBH | 1B | BB | SO | GO | FO |
|----------|-----|------|------|------|------|------|------|
| **Power** | +12% | +10% | 0 | 0 | 0 | -5% | -5% |
| **Contact** | 0 | +5% | +12% | +5% | -10% | 0 | 0 |
| **Patient** | 0 | +6% | +8% | +10% | -8% | -4% | 0 |

Logica:
- Power: palle lunghe, meno outs su campo
- Contact: singoli sicuri, meno strikeout
- Patient: disciplina (BB), baseball sicuro, meno K

### Layer 1 — Pitcher Style (coefficienti difensore)

| Style | HR | XBH | 1B | BB | SO | GO | FO |
|-------|-----|------|------|------|------|------|------|
| **Velocity** | -8% | -6% | 0 | 0 | +12% | 0 | +5% |
| **Movement** | -5% | -8% | -4% | 0 | +5% | +10% | +5% |
| **Command** | -6% | -5% | -5% | -8% | +8% | +6% | +6% |

Logica:
- Velocity: domina con K puri
- Movement: battute deboli (groundout, flyout)
- Command: meno basi gratuite, outs distribuiti

### Layer 2 — Attack Style (modificatori diretti, non RPS)

| Stile | HR | XBH | 1B | BB | SO | GO | FO |
|-------|-----|------|------|------|------|------|------|
| **Bunt** | -20% | -20% | +15% | 0 | 0 | +10% | 0 |
| **Hit & Run** | -25% | -15% | +15% | 0 | +5% | 0 | 0 |
| **Neutral** | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Swing on Sight** | +15% | +20% | 0 | 0 | +20% | 0 | +10% |

### Layer 2 — Defense Counter (infield/outfield position vs attack style)

| Counter | Effetto |
|---------|---------|
| Infield Short vs Bunt | -12% 1B, +10% GO |
| Infield Neutral vs Hit & Run | -8% 1B, +6% GO |
| Infield Deep vs Swing on Sight | -5% 1B, +5% GO |
| Outfield Short vs Bunt | -5% 1B, +4% FO |
| Outfield Neutral vs Hit & Run | -4% 1B |
| Outfield Deep vs Swing on Sight | -8% HR, -6% XBH, +8% FO |

### Layer 3 — Offensive Attack (coefficienti attaccante)

| Approach | HR | XBH | 1B | BB | SO | GO | FO |
|----------|-----|------|------|------|------|------|------|
| **Aggressive** | +5% | +8% | 0 | 0 | 0 | -6% | -4% |
| **Balanced** | 0 | +4% | +6% | +4% | -4% | -4% | 0 |
| **Conservative** | 0 | 0 | +8% | +6% | -6% | 0 | +4% |

### Layer 3 — Defense Setup (coefficienti difensore)

| Setup | HR | XBH | 1B | BB | SO | GO | FO |
|-------|-----|------|------|------|------|------|------|
| **Aggressive** | -6% | -5% | -4% | 0 | +8% | +8% | 0 |
| **Balanced** | -3% | -3% | 0 | 0 | +4% | +4% | +4% |
| **Protective** | -8% | -6% | 0 | +4% | 0 | 0 | +10% |

---

## 4. Matrice RPS

### Batter Approach vs Pitcher Style

| Batter \ Pitcher | Velocity | Movement | Command |
|---|---|---|---|
| **Power** | Tie | Batter wins | Pitcher wins |
| **Contact** | Pitcher wins | Tie | Batter wins |
| **Patient** | Batter wins | Pitcher wins | Tie |

### Offensive Attack vs Defense Setup

| Offense \ Defense | Aggressive | Balanced | Protective |
|---|---|---|---|
| **Aggressive** | Defense wins | Tie | Offense wins |
| **Balanced** | Offense wins | Tie | Defense wins |
| **Conservative** | Defense wins | Tie | Tie |

---

## 5. Tactic Schedules — 3 Box Temporali

Ogni tattica (Batter Approach, Attack Style, Offensive Attack) ha 3 configurazioni:

| Box | Nome | Descrizione |
|-----|------|-------------|
| 1 | **Tattica Primaria** | Attiva dall'inizio gara |
| 2 | **Tattica Secondaria** | Attiva quando scatta condizione 1 |
| 3 | **Tattica Opzionale** | Attiva quando scatta condizione 2 |

### Condizioni di Switch
- **Fino a Inning ≤ X** (1-9): la tattica resta attiva fino all'inning X
- **Fino a K subiti ≤ X** (1-20): resta attiva finche' i K subiti dal team sono ≤ X
- **Fino a Run subiti ≤ X** (0-10): resta attiva finche' i run subiti sono ≤ X
- **Fino a Hit subiti ≤ X** (1-20): resta attiva finche' gli hit subiti sono ≤ X

### Logica di valutazione (prima di ogni at-bat):
```
function evaluateActiveTactic(schedule, gameState):
  if ALL condizioni primaria soddisfatte:
    return primaria.value
  else if ALL condizioni secondaria soddisfatte:
    return secondaria.value
  else:
    return opzionale.value
```

Le condizioni definiscono QUANDO la tattica e' attiva (non quando scatta).
Quando TUTTE le condizioni della primaria sono violate, si passa alla secondaria.
Quando TUTTE le condizioni della secondaria sono violate, si passa all'opzionale.

---

## 6. Cascata al Cambio Lanciatore/Tattica

Quando cambia un lanciatore (SP→R1→Closer):
1. Il `pitcherStyle` attivo cambia (dal pitcherConfig del nuovo lanciatore)
2. Si ricalcola il Layer 1 (Batter Approach vs NUOVO Pitcher Style)
3. I Layer 2 e 3 rimangono invariati (non dipendono dal lanciatore)

Quando cambia una tattica (condizione switch):
1. Si rivaluta quale tattica e' attiva per quel layer
2. Si ricalcolano i coefficienti di quel layer
3. Gli altri layer rimangono invariati

IMPORTANTE: gli attributi dei giocatori (POW, CON, VEL, CTL, etc.) gia' aggregati con i bonus training NON vengono mai modificati dalle tattiche. Le tattiche influenzano SOLO i coefficienti moltiplicativi sulle probabilita' esito.

---

## 7. Schema DB

### Tabella `tactic_coefficients` (nuova)
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | serial PK | |
| layer | text | batter_approach, pitcher_style, offensive_attack, defense_setup |
| tactic_value | text | power, contact, patient, velocity, movement, command, aggressive, balanced, conservative, protective |
| hr | integer | Coefficiente HR (percentuale, es. 12 = +12%) |
| xbh | integer | Coefficiente XBH |
| single | integer | Coefficiente 1B |
| bb | integer | Coefficiente BB |
| so | integer | Coefficiente SO |
| go | integer | Coefficiente GO |
| fo | integer | Coefficiente FO |

Unique constraint: (layer, tactic_value)
12 righe totali (3 batter + 3 pitcher + 3 offense + 3 defense)

### Campi aggiunti a tabella `tactics`
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| batter_approach_schedule | jsonb | { primary: TacticSlot, secondary: TacticSlot, optional: TacticSlot } |
| attack_style_schedule | jsonb | { primary: TacticSlot, secondary: TacticSlot, optional: TacticSlot } |
| offensive_attack_schedule | jsonb | { primary: TacticSlot, secondary: TacticSlot, optional: TacticSlot } |

TacticSlot = { value: string, conditions: { maxInning?: number, maxStrikeouts?: number, maxRunsAllowed?: number, maxHitsAllowed?: number } }

### Admin Tuning
Pagina Admin: sezione "TACTIC COEFFICIENTS" con tabella editabile per tutti i 12 set di coefficienti.
4 sotto-sezioni (Batter Approach, Pitcher Style, Offensive Attack, Defense Setup), ognuna con 3 righe × 7 colonne.
Valori: -30 a +30 (percentuale). Reset ai default con conferma.

---

## 8. Esempio Completo At-Bat

Scenario: Inning 3, battitore con approach "Patient" (primaria attiva), lanciatore con stile "Velocity".

```
1. matchup_rating = batterScore - pitcherScore + homeAdvantage = +12
   → bracket: "slight_pos"
   → base probs: HR=7%, XBH=8%, 1B=19%, BB=9%, SO=14%, GO=22%, FO=21%

2. Layer 1: Patient vs Velocity → Patient WINS
   → Coefficienti Patient applicati: 1B+8%, BB+10%, SO-8%, GO-4%
   → Coefficienti Velocity NON applicati (perde)
   → probs dopo L1: HR=7%, XBH=8.48%, 1B=20.52%, BB=9.9%, SO=12.88%, GO=21.12%, FO=21%

3. Layer 2: Attack Style "Neutral" + Defense Counter
   → Neutral = nessun modificatore
   → probs invariate

4. Layer 3: Offensive Attack "Balanced" vs Defense Setup "Protective"
   → Balanced perde vs Protective → Protective WINS
   → Coefficienti Protective applicati: HR-8%, XBH-6%, BB+4%, FO+10%
   → Coefficienti Balanced NON applicati
   → probs dopo L3: HR=6.44%, XBH=7.97%, 1B=20.52%, BB=10.30%, SO=12.88%, GO=21.12%, FO=23.10%

5. Normalizzazione → roll esito
```

---

## 9. File Coinvolti

| File | Modifiche |
|------|-----------|
| shared/schema.ts | Tabella tactic_coefficients, campi schedule in tactics |
| shared/calculations/probability.ts | Coefficienti per-tattica, Win/Tie/Lose bilateral, nuovo ordine |
| shared/calculations/simulate.ts | TacticSchedule, evaluateActiveTactic, ricalcolo cascata |
| server/simulation.ts | Caricamento coefficienti DB, tactic schedules |
| server/routes.ts | API admin coefficienti, API tactic schedules |
| server/storage.ts | CRUD tactic_coefficients, upsertTactics schedule |
| server/seed.ts | Seed 12 righe coefficienti default |
| client/src/pages/AdminPage.tsx | Sezione tuning coefficienti |
| client/src/pages/AttackPage.tsx | 3 box temporali per tattica |
| client/src/pages/SimulationPage.tsx | Exhibition con nuovi coefficienti |
| client/src/lib/calculations/* | Sync da shared/ |
