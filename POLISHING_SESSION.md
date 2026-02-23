# POLISHING_SESSION.md
Sessione di fix & polish — Gridiron Ghosts v1.2.0 → v1.3.0  
Inizio: 23 febbraio 2026

---

## Analisi discrepanze docs vs codice

### 1. Sistema tattiche — DISALLINEAMENTO MAGGIORE
- **MECHANICS_SPEC v0.3** definisce 4 categorie RPS: Batter Approach, Pitcher Style, Defense Setup, Offensive Attack
- **PAGE_ATTACK.md** descrive Offensive Attack (Aggressive/Balanced/Conservative) — nel codice NON esiste, AttackPage usa ancora bunt/hit_and_run/neutral/swing_on_sight
- **PAGE_DEFENSE.md** descrive Defense Setup (Aggressive/Balanced/Protective) — nel codice NON esiste, DefensePage usa ancora infield/outfield short/neutral/deep
- **Schema `tactics`** ha solo: attackStyle, infieldPosition, outfieldPosition (vecchi campi)
- **Batter Approach e Pitcher Style**: completamente assenti dal codice
- **DECISIONE**: il nuovo sistema RPS si AFFIANCA al vecchio come layer di buff/debuff. Non sostituisce le funzioni di confronto esistenti.

### 2. Flavor text
- **Codice attuale**: flavor.ts genera frasi colorate AI-style ("Crushes a moonshot!")
- **Richiesta**: sostituire con menzioni fattuali dei primati (più HR, più K, più BB, etc.)
- **AESTHETIC_GUIDE.md**: descrive ancora flavor ironici anni '90 — va aggiornato per riflettere la nuova regola

### 3. Storico stagionale / Career stats
- **Nessuna tabella** per statistiche cumulative giocatori per stagione
- Career averages in PlayerCard calcolate staticamente dagli attributi, non dalle partite giocate
- Nessun tracking season number progressivo

### 4. Generazione nomi
- Nomi attualmente hardcoded con varietà limitata
- Servono nomi maschili + femminili, più variabili e realistici
- Nomi squadre monotoni — servono generatori più creativi

### 5. UI pages — gap multipli
- **PitchersPage**: manca stats carriera/stagione/ultima gara, pitching tactic, closer chain incompleta, bullpen style incoerente
- **MatchDetailPage**: manca fielding stats (PO, DP, AVG difensiva), play-by-play fattuale
- **LineupPage**: manca raggruppamento stats attacco/difesa/lancio, foto non cliccabili, niente AVG battuta
- **PlayerCard**: attributi non divisi in sezioni, career averages statiche, niente navigazione frecce
- **Schedule**: non si aggiorna dopo promozione/retrocessione, gare future non cliccabili, niente calendari altre squadre
- **Standings**: niente storico, niente grafici andamento, divisione non dinamica post-promozione
- **Home**: niente preview match con confronto settori, niente risultati recenti scorrevoli, niente rename team, test match mostra girone sbagliato

---

## Piano d'azione prioritizzato

### FASE A — Fondamenta schema (propedeutica a tutto)
1. Estendere tabella `tactics` con 4 nuovi campi RPS: `batter_approach`, `pitcher_style`, `offensive_attack`, `defense_setup`
2. I campi vecchi (attackStyle, infieldPosition, outfieldPosition) restano — coesistenza
3. Aggiornare API GET/POST /api/tactics per leggere/scrivere i nuovi campi
4. Push schema senza perdere dati

### FASE B — Layer RPS nel motore + UI Attack/Defense
1. Creare modulo `rpsModifiers.ts` con matrici matchup da MECHANICS_SPEC v0.3
2. Integrare buff/debuff RPS nel flusso di simulazione (simulate.ts) ACCANTO ai modificatori esistenti
3. Aggiungere sezione "Offensive Attack" (3 opzioni) nell'AttackPage — sotto la sezione esistente
4. Aggiungere sezione "Defense Setup" (3 opzioni) nella DefensePage — sotto le sezioni infield/outfield

### FASE C — Batter Approach + Pitcher Style
1. Aggiungere sezione "Batter Approach" (Power/Contact/Patient) nell'AttackPage
2. Aggiungere sezione "Pitcher Style" (Velocity/Movement/Command) nel PitchersPage
3. Salvare tramite API tactics con i nuovi campi

### FASE D — Flavor text fattuale
1. Riscrivere flavor.ts: sostituire tutte le frasi AI con menzioni fattuali dei primati
2. Aggiornare MatchDetailPage per usare il nuovo formato
3. Aggiornare SimulationPage
4. Aggiornare AESTHETIC_GUIDE.md per riflettere la nuova regola

### FASE E — Infrastruttura storico stagionale
1. Creare tabella `player_season_stats` (player_id, season_id, stats cumulative)
2. Accumulare stats dopo ogni partita di campionato
3. API per career averages calcolate da partite reali
4. Season number tracking progressivo

### FASE F — Miglioramenti pagine (dipende da E per career stats)
1. **PitchersPage**: stats carriera/stagione/ultima gara, closer chain fix (bullpen dopo closer), stile bullpen coerente
2. **MatchDetailPage**: fielding stats (PO, DP, AVG difensiva), play-by-play cronologico fattuale
3. **LineupPage**: raggruppamento sezioni attacco/difesa/lancio, foto cliccabili → PlayerCard, AVG battuta stagione+carriera, DH grafica migliorata
4. **PlayerCard**: 3 sezioni attributi (Attacco/Difesa/Lanciatore), medie stagione+carriera da partite reali, navigazione frecce sinistra/destra nel lineup

### FASE G — Fix navigazione + UX + generazione
1. **Schedule**: default divisione corrente (dinamico post-promozione), gare future cliccabili → anteprima, visualizzazione calendari altre squadre, numero season
2. **Standings**: default girone dinamico, storico gare/ranking/schedule navigabile, grafici andamento stagionale e carriera team
3. **Home**: preview next match con grafico confronto settori (ATK/DEF/PITCH), risultati recenti scorrevoli e cliccabili, possibilità rename team, test match solo vs squadre stesso girone attuale
4. **Nomi**: libreria nomi giocatori M/F più variabili e realistici, generatore nomi squadre più creativi

---

## Regole della sessione
- Ogni fase deve essere completata e verificata prima di passare alla successiva
- Nessuna modifica deve rompere funzionalità esistenti
- Il sistema tattiche RPS si AFFIANCA al vecchio — buff/debuff, non sostituzione
- Flavor text: VIETATO AI — solo menzioni fattuali dei primati statistici
- Commit atomici per ogni fase completata

---

## Progress tracking

| Fase | Descrizione | Stato | Data completamento |
|------|-------------|-------|--------------------|
| A | Schema tactics esteso (4 campi RPS) | ⬜ NON INIZIATA | — |
| B | Layer RPS engine + UI Attack/Defense | ⬜ NON INIZIATA | — |
| C | Batter Approach + Pitcher Style | ⬜ NON INIZIATA | — |
| D | Flavor text fattuale | ⬜ NON INIZIATA | — |
| E | Infrastruttura storico stagionale | ⬜ NON INIZIATA | — |
| F | Miglioramenti pagine (Pitchers, Match, Lineup, PlayerCard) | ⬜ NON INIZIATA | — |
| G | Fix navigazione + UX + generazione nomi | ⬜ NON INIZIATA | — |

### Dettaglio sub-task completati
(aggiornato progressivamente durante la sessione)

_Nessun sub-task completato ancora._
