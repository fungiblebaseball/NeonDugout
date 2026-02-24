# PAGE_DEFENSE.md (/defense)

## File
`client/src/pages/DefensePage.tsx`

## Descrizione
Pagina di configurazione tattica difensiva. Contiene 3 sezioni: posizionamento interni, posizionamento esterni e strategia difensiva globale (RPS).

## Sezioni

### 1. Infield Position (3 opzioni, scelta esclusiva)
Posizionamento degli interni. Countera specifici Attack Style avversari.

| Posizione | Counter vs | Effetto |
|-----------|-----------|---------|
| **Short** | Bunt | -12% 1B, +10% GO |
| **Neutral** | Hit & Run | -8% 1B, +6% GO |
| **Deep** | Swing on Sight | -5% 1B, +5% GO |

### 2. Outfield Position (3 opzioni, scelta esclusiva)
Posizionamento degli esterni. Countera specifici Attack Style avversari.

| Posizione | Counter vs | Effetto |
|-----------|-----------|---------|
| **Short** | Bunt | -5% 1B, +4% FO |
| **Neutral** | Hit & Run | -4% 1B |
| **Deep** | Swing on Sight | -8% HR, -6% XBH, +8% FO |

### 3. Defense Setup (3 opzioni, scelta esclusiva)
Matchup RPS contro Offensive Attack dell'avversario. Determina successo rubate, extra base, esecuzione small ball.

| Defense \ Offense | Aggressive | Balanced | Conservative |
|---|---|---|---|
| **Aggressive** | Defense wins | Offense wins (slight) | Defense wins |
| **Balanced** | Tie | Tie | Tie |
| **Protective** | Offense wins | Defense wins | Tie |

### Save Button
Salva tutte le scelte in un unico POST.

## Dati
- Store: team
- API: `GET /api/tactics/:teamId` / `POST /api/tactics`
- Campi salvati: `infieldPosition` (short | neutral | deep), `outfieldPosition` (short | neutral | deep), `defenseSetup` (aggressive | balanced | protective)
- Campi preservati nel POST: `attackStyle`, `batterApproach`, `offensiveAttack`, `pitcherStyle`

## Note
- Infield e Outfield Position sono counter diretti dell'Attack Style avversario (rock-paper-scissors posizionale)
- Defense Setup è matchup RPS indipendente contro Offensive Attack avversario
- **Pitcher Style** (velocity/movement/command) è configurato nella pagina **Pitchers** (/pitchers), non qui
- Tutti i modificatori sono moltiplicativi sulla tabella probabilità in `shared/calculations/probability.ts`
