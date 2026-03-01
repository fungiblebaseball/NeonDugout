# PAGE_DEFENSE.md (/defense)

## File
`client/src/pages/DefensePage.tsx`

## Descrizione
Pagina di configurazione tattica difensiva. Contiene 3 sezioni: posizionamento interni, posizionamento esterni e strategia difensiva globale (RPS).

## Sezioni

### 1. Infield Position (3 opzioni, scelta esclusiva)
Posizionamento degli interni. Countera specifici Attack Style avversari annullandosi a aritmeticamente a vicenda possonocessere + o - positivi o negativi configurabili da admin

Coefficienti dinamici caricati da DB (`defense_counter_infield` layer). Badge colorati mostrano valori reali incluso **STEAL** (tac_st).

| Posizione | Coefficienti (da DB) |
|-----------|---------|
| **Short** | 1B:-12 GO:+10 STEAL:-8 |
| **Neutral** | Nessun modificatore |
| **Deep** | 1B:-5 GO:+5 STEAL:+5 |

### 2. Outfield Position (3 opzioni, scelta esclusiva)
Posizionamento degli esterni. Coefficienti dinamici da DB (`defense_counter_outfield` layer).

| Posizione | Coefficienti (da DB) |
|-----------|---------|
| **Short** | 1B:-5 FO:+4 STEAL:-5 |
| **Neutral** | Nessun modificatore |
| **Deep** | HR:-8 XBH:-6 FO:+8 STEAL:+3 |

I valori sopra sono i default seedati; modificabili dall'admin.

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
