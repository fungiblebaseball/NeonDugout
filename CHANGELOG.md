# CHANGELOG.md
Tutte le modifiche significative approvate vanno registrate qui in ordine cronologico inverso (più recente in alto).  
Formato:  
- [Data] – [Versione / Milestone] – Descrizione breve  
  • Dettaglio 1 (perché + impatto)  
  • Dettaglio 2 (file modificati)  
  • Trade-off / note (se rilevanti)

## Unreleased / In planning
- nulla ancora

## v0.2 – 22 febbraio 2026 – Fase 1 & 2 completate (Mock UI)
- Aggiunto `useGameStore` (Zustand) con persistenza per wallet e lineup.
  • Permette di lavorare in locale mantenendo i dati utente.
- Implementata generazione mock team & players.
- Creata Dashboard `Home.tsx` con aesthetic neon 80s/90s.
- Creata schermata `LineupPage.tsx` per gestione starter 9.
- Implementata navigazione base (Bottom Nav).
- Aggiornato `index.css` con colori tema (Cyan/Pink) ed `index.html` con font `Orbitron`.

## v0.1 – 22 febbraio 2026 – Fondazione documentazione & architettura
- Approvati PRODUCT_VISION.md v1.0
- Approvati MECHANICS_SPEC.md v0.2-beta
- Approvati TECH_STACK.md v1.3 (architettura generica server-centrica)
- Creati CURRENT_STATE.md e CHANGELOG.md come template
- Decisa transizione a approccio hybrid (client preview + server verità + Anchor on-chain)
