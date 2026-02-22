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
   - Valore numerico
4. **Career Averages** — Grid 3x2:
   - OVR, BAT, PITCH
   - DEF, SPD, STA
   - Nota "Season 1 — No prior history"
5. **Bottone confronta con apertura menù lista giocatori disponibili per affiancamento scheda giocatore con attributi e statistiche e bottone ritorna per chiudere affiancamento

## Dati
- API: `GET /api/player/:id`
- API: `GET /api/teams` (per nome team)

## Note
- Accessibile cliccando su giocatore nell'anteprima match (StandingsPage)
- Bottone Back naviga a /standings
- Career averages attuali = valori correnti (Season 1, nessun storico)
- Spazio immagine predisposto per future integrazioni (NFT art, generated cards)
