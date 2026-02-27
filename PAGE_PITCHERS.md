# Pitchers Page (/pitchers)

## File
`client/src/pages/PitchersPage.tsx`

## Descrizione
Gestione staff lanciatori con assegnazione ruoli e condizioni di sostituzione.

## Sezioni
1. **Header** — Titolo "Pitching Staff"
2. **Role Assignments** — 4 BOX ruoli con dropdown:
   - SP (Starting Pitcher) — Partente corrente
   - R1 (Relief 1) — Primo rilievo quando SP viene sostituito
   - C (Closer) — Chiusore (9° inning / situazioni di salvataggio)
   - 2P (Next Starter) — Prossimo partente (auto-rotato dopo la garia)
   - Bullpen — Lanciatori non assegnati a ruoli
3. **Stats Display** — Per ogni ruolo assegnato mostra VEL/CTL/MOV/STA/DEF 
4. **Stats Season** - Per ogni ruolo vedo anche statistiche ERA.
5. **Switch Conditions** — Ogni box ruolo lanciatore ha uno Slider selettore a vista collassabile in modo da poter determinare regole per ogni lanciatore e programmare la gara in modo granulare:
   - Max Pitches (60-130)
   - Max Innings (3-9)
   - Max BB (1-8)
   - Max ER (1-8)

6. **RPS Batter vs Pitcher** — Ogni box ruolo lanciatore ha una sezione tattoca che lo riguarda, selettore a vista collassabile in modo da poter determinare approcci di lancio.
   
| | Velocity | Movement | Command |
|---|----------|----------|---------|
| Power | Tie | Win | Lose |
| Contact | Lose | Tie | Win |
| Patient | Win | Lose | Tie |

7. **Save Button**

## Dati
- Store: team, players
- API: `GET/POST /api/pitcher-rotation`
- Schema: `roles` JSONB `{ sp, r1, closer, nextSp }`

## Note
- Solo giocatori con posizione "P" appaiono nei dropdown ruoli
- Lo SP selezionato qui appare automaticamente nel Lineup come posizione SP
- Ogni volta che dirante la gara si cambia lanciatore si devono ricalcolare i buffs e perks imposti dalla nuova tattica e come questa influisce sugli esiti degli altri buffs e perks di battuta, attacco e difesa. 
- ASSICURATI CHE APPAIANO ANCHE LE STATISCICHE DEI LANCIATORI DI RILIEVO A FINE GARA.
