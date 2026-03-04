# Player Detail Page (/player/:id)

## File
`client/src/pages/PlayerDetailPage.tsx`

## Descrizione
Carta giocatore dettagliata con tutti gli attributi e statistiche di carriera.

## Sezioni
1. **Header** — "Player Card" + ID giocatore + nome team, freccia Back
2. **Player Card** — Box principale con:
   - Spazio foto/immagine (placeholder con icona User + "PHOTO SLOT")
   - Nome giocatore in grande
   - Posizioni (badge con label estesa)
   - Overall rating (media 9 attributi)
   - BAT AVG (media pow/con/spd/eye)
   - PITCH AVG (media vel/ctl/mov/sta)
3. **Attribute Bars** — 9 attributi con:
   - Label (POWER, CONTACT, SPEED, EYE, VELOCITY, CONTROL, MOVEMENT, STAMINA, DEFENSE)
   - Barra progresso colorata (rosso < 35, arancione < 50, giallo < 65, verde < 80, cyan >= 80)
   - Overlay ambra sulla porzione boost (se presente `_add > 0`)
   - Valore numerico formato "base + add = total" (es. "72 + 3 = 75")
   - Overall e medie calcolate su totale (base + add)
4. **Career Averages** — Grid 3x2:
   - OVR, BAT, PITCH
   - DEF, SPD, STA
   - Nota "Season 1 — No prior history"

## Dati
- API: `GET /api/player/:id`
- API: `GET /api/teams` (per nome team)

## Navigazione
- Accessibile da: Match Preview (StandingsPage), Match Report (MatchDetailPage), Lineup, Pitchers
- Bottone Back naviga alla pagina precedente

## Note
- Career averages attuali = valori correnti (Season 1, nessun storico)
- Spazio immagine predisposto per future integrazioni (NFT art, generated cards)
