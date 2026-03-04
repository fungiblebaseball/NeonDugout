# Lineup Page (/lineup)

## File
`client/src/pages/LineupPage.tsx`

## Descrizione
Gestione formazione di campo e ordine battuta per la squadra dell'utente.

## Sezioni
1. **Header** — Titolo "Lineup", nome team
2. **Field Positions** — 9 posizioni (SP, C, 1B, 2B, 3B, SS, LF, CF, RF)
   - SP mostrato dinamicamente dal pitching staff (read-only)
   - Ogni giocatore cliccabile (link a /player/:id)
   - Le altre posizioni hanno dropdown per selezionare giocatori nel campo del nome nel roster
3. **Batting Order** — Lista 1-9 con possibilità di riordinare ogni riga 
4. **Bench** — Giocatori non assegnati (esclusi i lanciatori)
5. **Save Button** — Salva formazione su DB
6. **Player Button** ogni riga di Ogni giocatore cliccabile (link a /player/:id) ed è ben popolata di dati.  mostra attributi usati per Attacco, per Difesa, per Lancio. in tre sezioni ben distinte tra loro ognuna abbreviata ma con possibilità di leggere nome attributo per esteso se si clicca sopra. 
l'ordine nella riga è il seguente: Ruolo (come ora fissa e non modificare), Foto giocatore ( Cliccabile apre pagina player detail), Nome giocatore, 3 BOX con gli attributi che influiscono nel calcolo della gara rispettivamente per ATTACCO, DIFESA, LANCIO .

## Dati
- Store: team, players
- API: `GET /api/lineup/:teamId`, `POST /api/lineup`
- API: `GET /api/pitcher-rotation/:teamId` (per leggere SP)

## Note
- La posizione SP nel lineup è read-only, gestita dalla pagina Pitchers
- I lanciatori sono filtrati dalla bench (gestiti separatamente)
