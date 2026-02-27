# PAGE_ATTACK.md (/attack)

## File
`client/src/pages/AttackPage.tsx`

## Descrizione
Pagina di configurazione tattica offensiva. Contiene 3 sezioni indipendenti che influenzano la simulazione at-bat tramite modificatori probabilistici e matchup RPS.

## Sezioni

### 1. Batter Approach (3 opzioni, 3 box temporali)
Configurazione del Batter Approach con 3 slot (Primary, Secondary, Optional) e condizioni di switch. Matchup RPS contro Pitcher Style dell'avversario.
"Win" = si applicano i coefficienti del battitore, "Lose" = si applicano i coefficienti del lanciatore, "Tie" = nessun coefficiente.

| Batter \ Pitcher | Velocity | Movement | Command |
|---|---|---|---|
| **Power** | Tie | Win | Lose |
| **Contact** | Lose | Tie | Win |
| **Patient** | Win | Lose | Tie |

### 2. Offensive Strategy (Attack Style) (4 opzioni, 3 box temporali)
Modificatori diretti applicati alla tabella probabilità, contrastati dalle posizioni difensive (Infield/Outfield). 3 slot (Primary, Secondary, Optional) con condizioni di switch.

| Stile | Effetto Base |
|-------|---------|
| **Bunt** | +15% 1B, -20% XBH, -20% HR, +10% GO |
| **Hit & Run** | +15% 1B, -15% XBH, -25% HR, +5% SO |
| **Neutral** | Nessun modificatore |
| **Swing on Sight** | +20% XBH, +15% HR, +20% SO, +10% FO |

### 3. Offensive Attack (3 opzioni, 3 box temporali)
Configurazione dell'Offensive Attack con 3 slot e condizioni di switch. Matchup RPS contro Defense Setup dell'avversario.
"Win" = si applicano i coefficienti dell'offesa, "Lose" = si applicano i coefficienti della difesa, "Tie" = nessun coefficiente.

| Offense \ Defense | Aggressive | Balanced | Protective |
|---|---|---|---|
| **Aggressive** | Lose | Tie | Win |
| **Balanced** | Win | Tie | Lose |
| **Conservative** | Lose | Tie | Tie |

## Tactic Schedules (Box Temporali)
Ogni sezione ha 3 box (Primaria, Secondaria, Opzionale) con cursori per le condizioni di switch:
- **Max Inning**: Inning massimo di validità (1-9)
- **Max Strikeouts**: K subiti massimi (1-20)
- **Max Runs Allowed**: Run subiti massimi (0-10)
- **Max Hits Allowed**: Hit subiti massimi (1-20)

## Dati
- Store: team
- API: `GET /api/tactics/:teamId` / `POST /api/tactics`
- Campi salvati: `batterApproachSchedule`, `attackStyleSchedule`, `offensiveAttackSchedule` (JSONB)
- Campi Defense preservati: `infieldPosition`, `outfieldPosition`, `defenseSetup`

## Note
- I 3 sistemi sono indipendenti e cumulativi: Attack Style modifica probabilità base, Batter Approach e Offensive Attack aggiungono bias RPS
- Tutti i modificatori sono moltiplicativi sulla tabella probabilità in `shared/calculations/probability.ts`
- Il campo `pitcherStyle` è salvato qui ma configurato nella pagina Defense (o viceversa, a seconda del layout futuro)
