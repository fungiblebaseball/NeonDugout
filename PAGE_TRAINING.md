# Training Page (/training)

## File
`client/src/pages/TrainingPage.tsx`

## Descrizione
Hub centrale per il sistema di allenamento. Presenta 3 minigame come card interattive.

## Sezioni
1. **Header** — "TRAINING CENTER" con icona Dumbbell, stile Orbitron ambra
2. **Player Selector** — Dropdown per selezionare il giocatore da allenare (dal roster del team)
3. **Minigame Cards** — 3 card, ognuna con:
   - Icona e nome del minigame
   - Breve descrizione
   - Best score personale (se disponibile)
   - Attributi che può potenziare
   - Pulsante "PLAY" per avviare il minigame

## Minigame
- **Eye Drill** (/training/eye-drill) — Reazione: tap ⚾ il più velocemente possibile, 10 round → EYE boost
- **Batting Practice** (/training/batting) — Timing: swing nella sweet spot, 10 lanci → CON/POW boost
- **Pitch Control** (/training/pitch-control) — Precisione: tap zona corretta nella griglia 3x3, 10 round → CTL boost

## Flusso per minigame
Start screen → Gameplay (10 round) → Result screen (score, ranking globale, reward attributo)

## Dati
- API: `GET /api/training/rankings/:gameType` — classifica globale
- API: `GET /api/training/history/:gameType` — storico personale
- API: `POST /api/training/result` — salvataggio risultato + boost

## Navigazione
- Accessibile da: Home (card TRAINING CENTER), Bottom nav (icona Train/Dumbbell)
- Ogni minigame ha pulsante Back per tornare al hub
