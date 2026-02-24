# PAGE_ATTACK.md (/attack)

## File
`client/src/pages/AttackPage.tsx`

## Descrizione
Pagina di configurazione tattica offensiva. Contiene 3 sezioni indipendenti che influenzano la simulazione at-bat tramite modificatori probabilistici e matchup RPS.

## Sezioni

### 1. Attack Style (4 opzioni, scelta esclusiva)
Modificatori moltiplicativi applicati direttamente alla tabella probabilità esiti at-bat.

| Stile | Effetto |
|-------|---------|
| **Bunt** | +15% 1B, -20% XBH, -20% HR, +10% GO |
| **Hit & Run** | +15% 1B, -15% XBH, -25% HR, +5% SO |
| **Neutral** | Nessun modificatore (base pura) |
| **Swing on Sight** | +20% XBH, +15% HR, +20% SO, +10% FO |

Counter-strategy: l'avversario può contrastare con Infield/Outfield Position (vedi PAGE_DEFENSE.md).

### 2. Batter Approach (3 opzioni, scelta esclusiva)
Matchup RPS contro Pitcher Style dell'avversario. Determina bias sull'esito base at-bat.

| Batter \ Pitcher | Velocity | Movement | Command |
|---|---|---|---|
| **Power** | Tie | Win | Lose |
| **Contact** | Lose | Tie | Win |
| **Patient** | Win | Lose | Tie |

"Win" = bias favorevole al battitore, "Lose" = bias favorevole al lanciatore.

### 3. Offensive Attack (3 opzioni, scelta esclusiva)
Matchup RPS contro Defense Setup dell'avversario. Determina successo rubate, extra base su hit, esecuzione small ball.

| Offense \ Defense | Aggressive | Balanced | Protective |
|---|---|---|---|
| **Aggressive** | Lose | Tie | Win |
| **Balanced** | Win | Tie | Lose |
| **Conservative** | Lose | Tie | Tie |

### Save Button
Salva tutte e 3 le scelte in un unico POST.

## Dati
- Store: team
- API: `GET /api/tactics/:teamId` / `POST /api/tactics`
- Campi salvati: `attackStyle` (bunt | hit_and_run | neutral | swing_on_sight), `batterApproach` (power | contact | patient), `offensiveAttack` (aggressive | balanced | conservative)
- Campi Defense preservati nel POST: `infieldPosition`, `outfieldPosition`, `pitcherStyle`, `defenseSetup`

## Note
- I 3 sistemi sono indipendenti e cumulativi: Attack Style modifica probabilità base, Batter Approach e Offensive Attack aggiungono bias RPS
- Tutti i modificatori sono moltiplicativi sulla tabella probabilità in `shared/calculations/probability.ts`
- Il campo `pitcherStyle` è salvato qui ma configurato nella pagina Defense (o viceversa, a seconda del layout futuro)
