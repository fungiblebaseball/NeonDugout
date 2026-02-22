# Attack Page (/attack)

## File
`client/src/pages/AttackPage.tsx`

## Descrizione
Scelta della strategia offensiva della squadra.

## Sezioni
1. **Header** — Titolo "Attack Strategy"
2. **Strategy Selection** — 4 opzioni:
   - Bunt — Strategia conservativa, sacrifici
   - Hit-and-Run — Combinata corsa + battuta
   - Neutral — Bilanciata
   - Swing-on-Sight — Aggressiva, massima potenza
3. **Save Button**

## Dati
- Store: team
- API: `GET/POST /api/tactics`
- Campo: `attackStyle` (text)

## Note
- La strategia influenza il motore di simulazione (tabelle probabilità)
