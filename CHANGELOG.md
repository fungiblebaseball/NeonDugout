# CHANGELOG.md
Tutte le modifiche significative approvate vanno registrate qui in ordine cronologico inverso (più recente in alto).  
Formato:  
- [Data] – [Versione / Milestone] – Descrizione breve  
  • Dettaglio 1 (perché + impatto)  
  • Dettaglio 2 (file modificati)  
  • Trade-off / note (se rilevanti)

## Unreleased / In planning
- nulla ancora

## v0.4 – 22 febbraio 2026 – Aesthetic Guide & TOURNAMENT_STRUCTURE base
- Creato `TOURNAMENT_STRUCTURE.md` in root per tenere traccia delle direttive dei gironi mock e round-robin.
- Modificata `mockData.ts` per far sì che la promozione tra girone A e B sia puramente basata sui risultati, rimuovendo la logica hardcoded che sbilanciava forzatamente il girone A per permettere che sia meritocratica. (Nota: l'utente verrà sempre assegnato alla Division B inizialmente).
- Creato il file `AESTHETIC_GUIDE.md` con palette colori e font precisi per consolidare la direzione artistica Retro Cyberpunk.
- Aggiornato `PRODUCT_VISION.md` per referenziare la nuova guida estetica.
- Aggiornato `index.html` importando i font richiesti dalla guida: Orbitron, VT323, e Press Start 2P.
- Riscritto `index.css` per utilizzare nativamente i colori hex e le variabili esatte descritte nella `AESTHETIC_GUIDE.md`.

## v0.3 – 22 febbraio 2026 – Fase 2/B completata (Mock League + Dati Globali)
- Espansi i tipi `types.ts` per supportare `League`, `Division`, `MatchDay`, `Match`.
- Riscritto il generatore dati in `mockData.ts` seguendo il documento TOURNAMENT_STRUCTURE.
  • Genera Girone A e Girone B (10 team ciascuno) con attributi più alti per il girone A tramite `gaussianRand`.
  • Genera un calendario round-robin per divisioni a 10 team (andata/ritorno) tramite Berger table.
- Modificato lo store `Zustand` (`store.ts`) per mantenere la lega globale e non solo un team.
  • Al primo login, l'utente "occupa" la prima squadra libera nel girone B (Chrome Street Division).
- Aggiunta in UI la divisione di appartenenza della propria squadra.

## v0.2 – 22 febbraio 2026 – Fase 1 & 2 completate (Mock UI)
- Aggiunto `useGameStore` (Zustand) con persistenza per wallet e lineup.
- Implementata generazione mock team & players.
- Creata Dashboard `Home.tsx` con aesthetic neon 80s/90s.
- Creata schermata `LineupPage.tsx` per gestione starter 9.

## v0.1 – 22 febbraio 2026 – Fondazione documentazione & architettura
- Approvati PRODUCT_VISION.md e specifiche iniziali.
