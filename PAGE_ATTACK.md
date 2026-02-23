# Page_Attack.md  (/defence)

## File
`client/src/pages/AttackPage.tsx`
## Descrizione
Scelta della strategia offensiva / base running.

##Sezioni
Header — Titolo "Offensive Attack"
Offensive Attack — 3 opzioni (scelta esclusiva):
- Aggressive     → big leads, steal frequente, extra base sempre, hit&run aggressivi
- Balanced       → jump standard, steal in situazioni favorevoli, avanza su hit sicuri
- Conservative   → lead piccolo, delayed steal, hit&run solo con conteggio buono

Save Button

## Dati
Store: team
API: `GET/POST /api/tactics`
Campo: `offensiveAttack` (string: "Aggressive" | "Balanced" | "Conservative")

## Note
La tattica Offensive Attack interagisce con Defense Setup dell'avversario per determinare:
- probabilità successo rubata
- probabilità extra base su hit
- esecuzione bunt / hit&run
- rischio caught stealing / pickoff

Sostituisce le precedenti opzioni Bunt / Hit-and-Run / Neutral / Swing-on-Sight.