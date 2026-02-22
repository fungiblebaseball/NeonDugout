# Defense Page (/defense)

## File
`client/src/pages/DefensePage.tsx`

## Descrizione
Impostazione del posizionamento difensivo (infield + outfield).

## Sezioni
1. **Header** — Titolo "Defense Formation"
2. **Infield Position** — 3 opzioni:
   - Short (in) — Più vicini, migliore difesa contro bunts
   - Neutral — Standard
   - Deep (back) — Più lontani, migliore range
3. **Outfield Position** — 3 opzioni:
   - Short — Gioco corto
   - Neutral — Standard
   - Deep — Profondità, previene extra-basi
4. **Save Button**

## Dati
- Store: team
- API: `GET/POST /api/tactics`
- Campi: `infieldPosition`, `outfieldPosition` (text)

## Note
- Il posizionamento difensivo influenza il calcolo degli errori nel motore di simulazione
