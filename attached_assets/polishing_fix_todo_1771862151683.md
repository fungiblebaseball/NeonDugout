polishing_fix_todo.md – 

Elenco razionalizzato delle richieste (v1)1. 

1. Match Detail Page (Pagina dettaglio partita)
Aggiungere statistiche di fielding avanzate
→ Aggiungere: PO (Putouts), DP (Double Plays eseguiti), media difensiva in millesimi (es. .987)
Aggiungere sintesi testuale della gara in stile Play-by-Play (non pitch-by-pitch)
→ Breve narrazione cronologica degli eventi principali (senza flavour AI)
Rimuovere / sostituire tutte le flavour phrases generate da AI
→ Sostituire con frasi fattuali abbreviate del tipo:
• Giocatore X ha realizzato il maggior numero di fuoricampo
• Lanciatore Y ha totalizzato il maggior numero di strikeout
• Lanciatore Z ha concesso il maggior numero di basi per ball
• Giocatore W ha rubato il maggior numero di basi
• Giocatore V ha totalizzato il maggior numero di valide
• Giocatore U ha subito il maggior numero di strikeout

2. Pitcher Page (Pagina lanciatori)
Aggiungere per ogni lanciatore partente / rilievo / closer:  
statistiche carriera  
statistiche stagione corrente  
statistiche ultima gara disputata

Aggiungere sezione “Tattica di lancio”
→ Scelta selezionabile di pitching tactic per ogni lanciatore (partente, rilievo, closer)
Regola closer switch
→ Se il closer non termina la gara (per condizioni di switch), il lanciatore successivo (posizione bullpen) subentra e lancia fino alla fine della partita
Correggere grafica
→ Allineare lo stile grafico della riga Bullpen con le altre righe della pagina (coerenza visiva)

3. Line-up Manager (Gestione formazione)
Migliorare visualizzazione righe giocatori
→ Ordinare / raggruppare i dati in sezioni chiare:
• Attacco
• Difesa
• Lanciatore (quando applicabile)
→ Obiettivo: valutazione complessiva del giocatore a colpo d’occhio
Rendere cliccabile la foto del giocatore
→ Clic → apre Player Card del giocatore selezionato
Mostrare nella sezione Line-up
→ AWG (media battuta?) attacco stagionale e carriera del giocatore
Migliorare resa grafica del DH
→ Integrare meglio il Designated Hitter nella griglia visiva (coerenza e leggibilità)
Obiettivo dichiarato: pagina deve fornire molte informazioni perché è cruciale per il polish finale della squadra

4. Schedule (Calendario)
Correggere comportamento default
→ Deve sempre caricare di default lo schedule del girone / lega attuale del team utente
→ Attualmente non si aggiorna dopo promozione/retrocessione → fix necessario
→ Numero Season Progressivo
Rendere cliccabili le gare future
→ Ogni partita non ancora disputata deve essere cliccabile → anteprima / dettaglio
Aggiungere possibilità di visualizzazione
→ Caricare e visualizzare anche calendari di altre squadre (negli altri gironi / leghe)

5. Standings (Classifiche)
Default
→ Mostrare sempre la classifica del girone attuale dell’utente (verifica dinamica appartenenza dopo promozioni/retrocessioni)
Aggiungere funzionalità storiche
→ Possibilità di navigare a ritroso:
• storico gare
• storico ranking
• storico schedule
Aggiungere grafici di andamento
→ Andamento stagionale del team
→ Totali carriera del team
Requisito di sistema
→ Mantenere in memoria / database: numero stagione, statistiche cumulative, gare giocate → per calcolare medie carriera giocatori

6. Home Screen (Schermata principale)
Sempre visibili
• Next Game (prossima partita)
• Blocco preview del prossimo incontro con grafico confronto settori attacco difesa lancio
Navigazione risultati recenti
→ Possibilità di scorrere indietro → visualizzare esito ultima gara e gare precedenti
→ Ogni gara deve essere cliccabile → apre dettaglio match
Nome team
→ Sempre aggiornato con il nome assegnato dall’utente
→ Aggiungere possibilità di modificare il nome del team
Test match / amichevoli
→ Devono poter essere organizzati solo contro squadre della stessa lega/serie/girone attuale
→ Attualmente mostra solo girone di iscrizione originario → correggere

7. Player Card (Scheda giocatore)
Riorganizzare attributi
→ Dividere chiaramente in tre sezioni:
• Attacco
• Difesa
• Lanciatore (quando applicabile)
Medie carriera
→ Devono essere calcolate dinamicamente pescando dalle partite di campionato giocate fino all’ultima gara
→ almeno 2 Mostrano sia media stagione che media carriera complessiva
Navigazione all’interno delle schede
→ Quando apro una Player Card, devo poter scorrere con frecce destra e sinistra:
• tutti i giocatori del line-up battitore
• poi i lanciatori in ordine: SP → R1 → Closer → Bullpen → (eventuale) lanciatore prossima gara
• Ricominciare il giro dal primo

8. Generazione nomi (SID / sistema di creazione)
→ New Season: 
• Genera una nuova Stagione senza cancellare lo storico di quella vecchia.
• I dati globali delle gare disputate e le statistiche vita del team e i giocatori. 
• Genera Sempre una Lega in più rispetto alle massime occupate dai giocatori user registrati in quel momento.
• Le Squadre prime e seconde nella serie massima di una lega farà playoff playout con la squadra penultima e ultima dell'ultima serie della lega successiva.
→ Nomi giocatori
• Rendere più variabili e realistici
• Usare librerie / liste dedicate se necessario
• Includere sia nomi maschili che femminili
→Nomi squadre
• Rendere più variabili
• Usare librerie / generatori se necessario

9. Regola generale flavour text (ripetuta in più punti)Vietato usare AI per generare frasi descrittive colorite  
Sostituire ovunque con menzioni fattuali dei primati negativi/positivi:
• Giocatore con più HR
• Giocatore con più BB ricevute
• Giocatore con più valide
• Lanciatore con più BB concessi
• Lanciatore con più K subiti / effettuati

