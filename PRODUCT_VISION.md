# PRODUCT_VISION.md
Ultimo aggiornamento: febbraio 2026  
Versione: 1.0 (bozza iniziale)

## Nome del prodotto
Gridiron Ghosts

## Visione in una frase
Un gioco manager testuale ultra-leggero di baseball fantasy completamente on-chain friendly, progettato per girare nativamente sul Solana Seeker mobile, con zero licenze reali, estetica cartoon anni '80, vibe anni '90 e atmosfera rétro-futuristica anni '60, che premia strategia, personalizzazione e ownership tramite NFT leggeri.

## Principi fondamentali (non negoziabili senza consenso esplicito scritto)
1. Zero licenze MLB/NPB reali  
   → Tutti i nomi di giocatori, squadre, stadi, città, loghi, uniformi sono 100% inventati.  
   → Nessun riferimento diretto o indiretto a giocatori/storico reali (nemmeno easter egg ambigui).

2. Target primario: Solana Seeker mobile phone  
   → UI/UX mobile-first, portrait mode predominante  
   → Pubblicazione esclusiva (almeno inizialmente) sul Solana dApp Store del Seeker  
   → Prestazioni leggere: < 50 MB install, avvio < 3 sec, refresh lineup/esito < 1 sec

3. Gioco puramente testuale + statistico  
   → Nessuna grafica 3D, nessuna animazione complessa, nessun replay visivo  
   → Esito partita = calcolo probabilistico/deterministico client-side basato su coefficienti configurabili dall’utente  
   → Output: testo descrittivo flavor + box score classico + statistiche aggregate

4. Estetica e flavor NON negoziabili  
   - Vedi il file dedicato `AESTHETIC_GUIDE.md` per specifiche esatte su colori, tipografia e UI pattern.
   - Grafica generale → cartoon anni '80 (linee spesse, colori saturi, ombre piatte alla Miami Vice / Thundercats)  
   - Uniformi e stile giocatori → moda streetwear / sportswear anni '90 (cappellini al contrario, pantaloni larghi, maglie oversize, catene, scarpe chunky)  
   - Stadi e ambientazione → architettura brutalista / mid-century modern / Googie anni '60 (forme atomiche, insegne al neon, curve sinuose, colori pastello accesi)  
   - Nomi squadre / città / giocatori → mix tra vibe cyber-noir, retro-futurista, surf-punk, nomi che suonano cool ma assurdi (es. Neon Vortex Rays, Chrome City Ionizers, players tipo “Jax Neonstrike”, “Roxy Voltbat”)  
   - Testi flavor → brevi, ironici, con slang anni '90 e riferimenti pop rétro (senza violare copyright)

5. Web3 & ownership (livello MVP → evoluzione futura)
   - Autenticazione → firma messaggio con wallet Solana (nessun login email/social)
   - Squadra principale → NFT “Team Brand / Owner Pass” (1 per utente, trasferibile)
   - Giocatori → inizialmente “resident” nell’app (non NFT al lancio), legati al wallet proprietario
   - Futuro (post-MVP) → minting selettivo di giocatori rari / leggendari per aftermarket
   - Staking leggero → possibile stake di SOL o token in-game per boost temporanei (es. “Training Camp” +5% a un coefficiente per 7 giorni)

6. Monetizzazione (leggera e non pay-to-win)
   - Acquisto token in-app con SOL (tramite Jupiter o swap diretto)
   - Token spesi per: cosmetici squadra, boost allenamento temporanei, slot lineup extra, reroll casualità minore
   - NO paywall per giocare partite o progredire nel ranking base
   - Obiettivo: feeling “arcade premium” ma accessibile

7. Filosofia di gameplay
   - Profondità strategica tramite configurazione coefficienti (non solo scegliere i migliori giocatori)  
   - “Manager’s mind” → il vero skill è bilanciare trade-off tra power/contact/speed/pitching control/resistenza  
   - Partita singola ≈ 30–90 secondi di caricamento + lettura flavor  
   - Stagione / league → asincrona, turn-based, con calendari generati deterministicamente
   - Tattiche pre-partita RPS
   - Il giocatore sceglie 4 tattiche (Batter Approach, Pitcher Style, Defense Setup, Offensive Attack) che creano matchup pietra-carta-forbice con le scelte dell'avversario.
   - Lo skill del manager sta nel prevedere e contrastare le tattiche avversarie, modificando probabilità senza alterare drasticamente i rating dei giocatori.

## Vincoli di budget / sviluppo
- Sviluppo principale su Replit + Replit AI Agent/Ghostwriter  
- Team = 1 persona (tu) + AI come co-sviluppatore  
- Tempo realistico per MVP: 4–10 settimane (dipende da ore/giorno)  
- Priorità: meccaniche core funzionanti > polish estetico > features avanzate

## Successo percepito (KPI qualitativi – non numerici)
- Un utente medio dice: “È come Football Manager ma baseball, rétro, veloce e con wallet in 30 secondi”  
- Sensazione di ownership anche senza mintare subito (giocatori “sentiti miei”)  
- Divertimento nel tweakare lineup e vedere come cambiano davvero gli esiti  
- Estetica che fa dire “questo non sembra un gioco web3 generico”

Fine visione – v1.0
