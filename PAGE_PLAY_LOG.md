# PAGE_PLAY_LOG.md (/play-log)

## File
`client/src/pages/PlayLogPage.tsx`

## Descrizione
Pagina dedicata ai registri play-by-play delle partite di lega del team dell'utente. Permette di esplorare i log dettagliati inning-per-inning, con selettore giornata e accordion per ogni match.

## Sezioni
1. **Header** — Titolo "Play Log" + sottotitolo "Play-by-play records — current season" + bottone back → Home
2. **Day Selector** — Griglia bottoni per ogni giornata giocata (Day 1, Day 2, ...)
3. **Match Accordions** — Per ogni match della giornata selezionata che ha play log:
   - Header: giornata (D1, D2...), nome team casa vs ospite, punteggio
   - Contenuto espandibile: log inning-per-inning diviso per half (▲ top / ▼ bottom)
   - Ogni evento at-bat: outs, batter vs pitcher, conteggio (B-S, pitches), esito colorato, difensore coinvolto, direzione (IF/OF), punti segnati
   - Ogni cambio lanciatore: vecchio → nuovo con ruolo e motivazione
   - Link "Full Match Report →" al fondo

## Colori esiti
- Verde: hit (HR, 3B, 2B, 1B)
- Giallo: walk (BB)
- Rosso: out (SO, GO, FO, GIDP)
- Arancione: errore (ERR)
- Viola: cambio lanciatore

## Dati
- Store: `team` (per filtrare partite del proprio team)
- API: `GET /api/matches` (tutte le partite)
- API: `GET /api/teams` (nomi team)
- API: `GET /api/match-details/:matchId` (per ogni match della giornata selezionata)
- Filtro: solo partite giocate (`played === true`) del team dell'utente

## Note
- I play log sono disponibili solo per la season corrente (vengono cancellati a generazione nuova season)
- Il selettore giornata mostra solo le giornate effettivamente giocate
- Se una partita non ha play log (partite pre-v1.6.0), viene mostrato messaggio "No play log available"
- La pagina è raggiungibile dal Hub (card "PLAY LOG" con icona ScrollText verde)
