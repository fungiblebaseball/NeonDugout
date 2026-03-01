# Steal_mechanic.md — Meccanica Rubata (Stolen Base)

## Panoramica

La rubata (stolen base) è una meccanica post-at-bat che permette a un corridore in base di tentare di avanzare durante l'azione. Il sistema è a 2 fasi: prima si determina se il corridore tenta, poi se riesce.

## Condizioni Gate

Il tentativo di rubata viene valutato SOLO se:
- L'esito dell'at-bat è **SO** (strikeout) o **BB** (walk) — la palla è in mano al catcher
- C'è un corridore in **1a** o **2a** base (rubata di casa dalla 3a VIETATA)
- Meno di **2 out** prima del play (con 2 out: VIETATO)
- La partita non è già terminata (outs dopo play < 3)

Se più corridori sono in base, si valuta il più avanzato (2a prima di 1a). Un solo tentativo per at-bat.

## Fase 1 — Probabilità di TENTATIVO

```
attemptProb = 0.15
  + (runner.spd - 60) / 300
  - (pitcher.ctl - 50) / 400
  + tac_st_mod
```

### Componenti:
- **Base**: 15% di probabilità per ogni at-bat valido
- **Velocità corridore**: corridori veloci (spd > 60) tentano più spesso
- **Controllo lanciatore**: lanciatori con buon controllo (ctl > 50) scoraggiano tentativi
- **tac_st_mod**: somma dei coefficienti `tac_st` dai layer tattici attivi, divisa per 100

### Clamp: `[0.02, 0.35]`
Minimo 2%, massimo 35% per at-bat.

### tac_st_mod — Influenza Tattica sul Tentativo

I layer che contribuiscono al `tac_st_mod`:
| Layer | Lato | Esempio |
|-------|------|---------|
| `attack_style` | Attaccante | hit_and_run: +15 |
| `offensive_attack` | Attaccante | aggressive: +12 |
| `defense_counter_infield` | Difensore | short: -8 |
| `defense_counter_outfield` | Difensore | short: -5 |
| `defense_setup` | Difensore | aggressive: -6 |

Formula: `tac_st_mod = somma(tac_st dei layer attivi) / 100`

Esempio: attack_style/hit_and_run (+15) + defense_counter_infield/short (-8) = tac_st_mod = +0.07

## Fase 2 — Probabilità di RIUSCITA

```
successProb = 0.50
  + (runner.spd * 0.4 + runner.eye * 0.3 + runner.sta * 0.3
   - catcher.def * 0.4 - catcher.eye * 0.3 - catcher.sta * 0.3) / 150
```

### Confronto puro corridore vs catcher
- **Runner**: SPD (40%), EYE (30%), STA (30%)
- **Catcher**: DEF (40%), EYE (30%), STA (30%)
- **NESSUNA influenza tattica** nella fase di riuscita

### Clamp: `[0.25, 0.90]`
Minimo 25%, massimo 90% di successo.

### Esiti:
- **SAFE** (roll < successProb): corridore avanza 1 base (1a→2a, 2a→3a)
- **OUT** (roll >= successProb): caught stealing, corridore eliminato, +1 out

## Statistiche Attese

- ~1-4 tentativi per partita (realistico rispetto a statistiche MLB)
- Tasso di successo tipico: 60-75% (dipende da matchup corridore/catcher)
- Hit & Run + corridore veloce: fino a 35% di tentativo, ~80% successo
- Difesa posizionata short + catcher forte: ~5% tentativo, ~40% successo

## Play Log

Il tentativo di rubata genera un `PlayLogEntry` di tipo `stolen_base`:
- `runnerId`, `runnerName`: identificativo del corridore
- `fromBase`, `toBase`: basi di partenza e arrivo ('1B'→'2B', '2B'→'3B')
- `success`: booleano (safe/out)
- `catcherName`: nome del catcher avversario

## File Coinvolti

- `shared/calculations/probability.ts`: `getStealTacStMod()` per calcolo tac_st_mod
- `shared/calculations/simulate.ts`: logica stolen base in `simulateHalfInning()`
- `shared/calculations/types.ts`: tipo `stolen_base` in PlayLogEntry
- `client/src/pages/MatchDetailPage.tsx`: rendering play log (verde safe, rosso out)
- `client/src/pages/PlayLogPage.tsx`: rendering play log dedicato
