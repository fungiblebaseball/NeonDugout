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
1. Start screen → Gameplay (10 round) → Result screen (score, ranking globale, reward info)
2. Se score >= minScoreForReward: risultato salvato con `confirmed = false`, boost NON ancora applicato
3. Pulsante "CERTIFY TRAINING" → wallet firma challenge message
4. Firma inviata a `POST /api/training/confirm` → verifica, applica boost, marca `confirmed = true`
5. Roster ricaricato automaticamente (invalidate queries)
6. Se utente rifiuta firma: boost non applicato, messaggio "Training not certified"

## Target del Boost (configurabile da admin)
- **Random**: boost applicato a 1 giocatore casuale del roster
- **Role**: boost applicato a 1 giocatore casuale con posizione specifica (es. solo P, solo SS)
- **Team**: boost applicato a TUTTI i giocatori del roster
- Tutti gli attributi configurati vengono applicati contemporaneamente (non uno random)

## Cap Stagionale
- `maxBoostPerSeason` conta solo i risultati confermati (`confirmed = true`)
- Risultati non confermati (firma rifiutata) non consumano il cap

## Dati
- API: `GET /api/training/rankings/:gameType` — classifica globale
- API: `GET /api/training/history/:gameType` — storico personale
- API: `POST /api/training/result` — salvataggio risultato (boost differito fino a conferma wallet)
- API: `POST /api/training/confirm` — conferma con firma wallet, applica boost (auth richiesta)
- API: `GET /api/training-configs` — configurazioni pubbliche per label dinamiche

## Navigazione
- Accessibile da: Home (card TRAINING CENTER), Bottom nav (icona Train/Dumbbell)
- Ogni minigame ha pulsante Back per tornare al hub
