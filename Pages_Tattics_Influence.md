# Pages_Tattics_Influence.md — Dove e Come Agiscono le Tattiche nella Simulazione

## Panoramica

Le tattiche influenzano gli esiti degli at-bat tramite coefficienti moltiplicativi applicati alla tabella di probabilita' base. NON modificano gli attributi dei giocatori — modificano solo le probabilita' degli esiti dopo il calcolo del matchup rating.

---

## File e Funzioni Coinvolte

### 1. `shared/calculations/probability.ts`
Funzione principale: `getOutcomeProbabilities(matchupRating, tactics, opponentTactics, activePitcherStyle, coefficients)`

Flusso:
1. `interpolateBrackets(matchupRating)` → probabilita' base dalla PROBABILITY_TABLE
2. Layer 1: `evaluateRpsBilateral(batterApproach, pitcherStyle, coefficients)` → Win/Tie/Lose.
   - Se Win: applica coefficienti dell'attaccante.
   - Se Lose: applica coefficienti del difensore.
3. Layer 2: `applyModifiers(probs, ATTACK_MODIFIERS[attackStyle])` → modificatori diretti hardcoded (Bunt, Hit&Run, SOS).
4. Layer 2b: `getDefenseCounterBonus(attackStyle, infieldPos, outfieldPos)` → counter posizionale hardcoded.
5. Layer 3: `evaluateRpsBilateral(offensiveAttack, defenseSetup, coefficients)` → Win/Tie/Lose.
   - Se Win: applica coefficienti dell'offesa.
   - Se Lose: applica coefficienti della difesa.
6. Normalizzazione: somma a 1.0

### 2. `shared/calculations/simulate.ts`
Funzione: `simulateHalfInning()` → per ogni at-bat:
- Valuta tattica attiva: `evaluateActiveTactic(schedule, gameState)` basandosi su Inning, K, Run e Hit.
- Passa tattiche attive a `simulateAtBat()` → `rollOutcome()` → `getOutcomeProbabilities()`.
- Tracking del `gameState`: gestisce le statistiche cumulative necessarie per lo switch (cumulativeK, cumulativeRuns, cumulativeHits).

### 3. `server/simulation.ts`
Funzione: `simulateMatchDay(day)`:
- Carica `tactic_coefficients` dal DB (una volta per batch)
- Per ogni match: carica tactics del team, passa a simulateGame nel SimConfig
- `buildTactics()`: mappa record DB → TacticsModifiers + schedules

### 4. `client/src/pages/AttackPage.tsx`
UI per configurare:
- 3 sezioni: Batter Approach, Offensive Strategy, Offensive Attack
- 3 box per sezione: Primaria/Secondaria/Opzionale con condizioni switch

### 5. `client/src/pages/AdminPage.tsx`
UI per tuning coefficienti:
- 4 sotto-sezioni: Batter Approach, Pitcher Style, Offensive Attack, Defense Setup
- Tabella editabile: 3 righe × 7 colonne per sotto-sezione

---

## Ordine di Applicazione Coefficienti

```
PROBABILITY_TABLE[bracket]     ← attributi giocatore (immutabili)
        │
        ▼
   Layer 1: Batter vs Pitcher  ← RPS bilateral (coefficienti per-tattica da DB)
        │
        ▼
   Layer 2: Attack Style        ← modificatori diretti (hardcoded)
   Layer 2b: Defense Counter    ← counter posizionale (hardcoded)
        │
        ▼
   Layer 3: Offense vs Defense  ← RPS bilateral (coefficienti per-tattica da DB)
        │
        ▼
   Normalizzazione (somma = 1.0)
        │
        ▼
   Roll esito (HR/XBH/1B/BB/SO/GO/FO)
```

---

## Cascata al Cambio Tattica/Lanciatore

### Cambio Lanciatore (SP → R1 → Closer)
1. Il `pitcherStyle` cambia (dal pitcherConfig del nuovo lanciatore)
2. Layer 1 viene ricalcolato: nuova matrice RPS con nuovo stile
3. Layer 2 e 3: invariati (non dipendono dal lanciatore)
4. Il ricalcolo avviene PRIMA del prossimo at-bat

### Cambio Tattica (condizione switch)
1. `evaluateActiveTactic()` controlla condizioni prima di ogni at-bat
2. Se la tattica primaria non e' piu' valida → passa alla secondaria
3. Se la secondaria non e' piu' valida → passa all'opzionale
4. Solo il layer interessato viene ricalcolato

### Cosa NON cambia
- Gli attributi dei giocatori (POW, CON, VEL, CTL, etc.) sono gia' aggregati con i bonus training
- Il matchup_rating e' calcolato con gli attributi aggregati
- La PROBABILITY_TABLE base non cambia
- I coefficienti tattici operano SOLO come moltiplicatori sulle probabilita' gia' calcolate

---

## Schema Coefficienti

I coefficienti sono salvati nella tabella `tactic_coefficients` nel database:
- 12 righe totali (3 batter_approach + 3 pitcher_style + 3 offensive_attack + 3 defense_setup)
- Ogni riga ha 7 valori interi (hr, xbh, single, bb, so, go, fo) che rappresentano percentuali
- Caricati dal server all'inizio del match day, passati alla simulazione
- Modificabili dall'admin nella pagina /admin
- Applicati come: `prob * (1 + coefficiente/100)`

---

## Tactic Schedules

3 campi JSONB nella tabella `tactics`:
- `batterApproachSchedule`
- `attackStyleSchedule`
- `offensiveAttackSchedule`

Ogni schedule ha 3 slot:
```
{
  primary: { value: "contact", conditions: { maxInning: 5 } },
  secondary: { value: "power", conditions: { maxInning: 8 } },
  optional: { value: "patient", conditions: {} }
}
```

Valutazione prima di ogni at-bat:
- Se TUTTE le condizioni del primary sono soddisfatte → usa primary
- Altrimenti se TUTTE le condizioni del secondary sono soddisfatte → usa secondary
- Altrimenti → usa optional (nessuna condizione, sempre valido)
