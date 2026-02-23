# PAGE_DEFENSE.md (/defense)

File
`client/src/pages/DefensePage.tsx`

### Descrizione Scopo del file
Questo documento definisce il layout e la struttura della pagina di impostazione della difesa. Serve come riferimento per gli sviluppatori e i designer per garantire la coerenza dell'interfaccia utente.
Sezioni
Header — Titolo "Defense Setup"
Defense Setup — 3 opzioni (scelta esclusiva):
- Aggressive     → infield in + quick to plate / pickoff heavy
                 (forte vs bunt, weak grounder, aggressive runners)
- Balanced       → standard positioning + delivery media
                 (neutro, baseline per tutti gli esiti)
- Protective     → deep/gaps + slow/deceptive holds
                 (forte vs fly/line drive/extra base, balanced runners)

Save Button

Dati
Store: team
API: `GET/POST /api/tactics`
Campo: `defenseSetup` (string: "Aggressive" | "Balanced" | "Protective")

Note
La scelta Defense Setup influenza:
- probabilità errori e outs su grounder/bunt/fly
- successo/insuccesso tentativi di rubata
- avanzamenti corridori su extra base hit
Sostituisce le precedenti impostazioni separate infieldPosition/outfieldPosition.