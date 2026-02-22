# Lineup Page (/lineup)

## File
`client/src/pages/LineupPage.tsx`

## Descrizione
Gestione formazione di campo e ordine battuta per la squadra dell'utente.

## Sezioni
1. **Header** — Titolo "Lineup", nome team
2. **Field Positions** — 9 posizioni (SP, C, 1B, 2B, 3B, SS, LF, CF, RF)
   - SP mostrato dinamicamente dal pitching staff (read-only)
   - Le altre posizioni hanno dropdown per selezionare giocatori
3. **Batting Order** — Lista 1-9 con possibilità di riordinare
4. **Bench** — Giocatori non assegnati (esclusi i lanciatori)
5. **Save Button** — Salva formazione su DB
6. **Player Button** ogni riga col nome giocatore è cliccabile per aprire carta giocatore. 

## Dati
- Store: team, players
- API: `GET /api/lineup/:teamId`, `POST /api/lineup`
- API: `GET /api/pitcher-rotation/:teamId` (per leggere SP)

## Note
- La posizione SP nel lineup è read-only, gestita dalla pagina Pitchers
- I lanciatori sono filtrati dalla bench (gestiti separatamente)
