# Pitchers Page (/pitchers)

## File
`client/src/pages/PitchersPage.tsx`

## Descrizione
Gestione staff lanciatori con assegnazione ruoli e condizioni di sostituzione.

## Sezioni
1. **Header** — Titolo "Pitching Staff"
2. **Role Assignments** — 4 ruoli con dropdown:
   - SP (Starting Pitcher) — Partente corrente
   - R1 (Relief 1) — Primo rilievo quando SP viene sostituito
   - C (Closer) — Chiusore (9° inning / situazioni di salvataggio)
   - 2P (Next Starter) — Prossimo partente (auto-rotato dopo la gara)
3. **Stats Display** — Per ogni ruolo assegnato mostra VEL/CTL/MOV/STA/DEF 
4. **Bullpen** — Lanciatori non assegnati a ruoli
5. **Switch Conditions** — Slider per SP R1 C Separatamente in modo da poter determinare ogni lanciatore :
   - Max Pitches (60-130)
   - Max Innings (3-9)
   - Max BB (1-8)
   - Max ER (1-8)
6. **Save Button**

## Dati
- Store: team, players
- API: `GET/POST /api/pitcher-rotation`
- Schema: `roles` JSONB `{ sp, r1, closer, nextSp }`

## Note
- Solo giocatori con posizione "P" appaiono nei dropdown ruoli
- Lo SP selezionato qui appare automaticamente nel Lineup come posizione SP
