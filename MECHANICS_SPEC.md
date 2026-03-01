# MECHANICS_SPEC.md
Ultimo aggiornamento: 1 marzo 2026  
Versione: 0.6 (Stolen base, DB coefficients for attack_style/defense_counter, tac_st)

### Scopo del file
Questo documento definisce le specifiche tecniche e le regole di gioco. Serve come riferimento per gli sviluppatori, gli architetti e i designer per garantire la coerenza e la determinazione del gameplay.  **Questo documento è una fonte di verità per il comportamento del gioco e deve essere consultato prima di qualsiasi modifica al codice.**

## Principi generali
- Calcoli condivisi client+server in `shared/calculations/` — deterministici + pseudo-random (SeededRNG con LCG, seed opzionale)
- Partita: 9 inning standard (extra innings se tie dopo 9)
- Simulazione: per at-bat con conteggio balls/strikes/fouls tracciato, pitch count per lanciatore
- Output: flavor text + box score + batter/pitcher stats + MVP + play log (play-by-play)
- Reuse matchup_rating come base per quasi tutte le decisioni "skill vs skill"
- DH Rule: con DH attivo → 9 battitori (pitcher escluso), senza DH → SP batte (9 posizioni incluso SP)

### Linee guida per l'implementazione
*   **Determinismo:** Tutte le simulazioni devono essere deterministiche, dato un set di input identico.
*   **Coerenza:** Le statistiche e i calcoli devono essere coerenti tra il client e il server.
*   **Testabilità:** Il codice deve essere scritto in modo da essere facilmente testabile.
*   **Modularità:** Le funzioni devono essere piccole e focalizzate su un singolo compito.

## Attributi giocatori (scala 1–100, invariati)
Offensive (batter): POW, CON, SPD, EYE  
Pitching Pitchers: VEL, CTL, MOV
Fielding: DEF
Shared: EYE, STA

- DEF_pos → attributo difensivo specifico per posizione (es. INF per SS/2B/3B, OF per esterni, C per catcher, 1B per prima base)
  
## Bonus_Attributi Buffs/Perks giocatori (da calcolare pregeme, ingame ogni cambio lanciatore)
- Bonus_Attributi in database per ogni attributo.
-scritto da bonus allenamento minigame o acquisto, addizionato al valore precedente
-a fine stagione, il 25% del bonus attributo viene addizionato perennemente all'attributo di riferimento del player e successivamente il campo azzerato per nuova stagione.
- Per semplicità MVP: media squadra per INF/OF/C/1B.

## Conteggio balls/strikes e pitches totali (nuovo per beta)
- Inizia ogni PA: 0-0
- confronta RPS Tattiche lanciatoreVSbatter per setup coefficenti tattica 
- Prepara i coefficenti delle tattiche del lanciatore e/o battitore se Necessario
- prepara somma attributi+bonus giocatori schierati lineup per confronti
- Per ogni at-bat simulato: et
  - Calcola strikes_prob = f(matchup_rating)  → es. strikes_prob = 0.45 + (pitcher_VEL - batter_CON)/400
  - balls_prob   = 0.20 + (batter_EYE - pitcher_CTL)/400   (clamped 0.05–0.40)
  - foul_prob    = 0.25 + (batter_CON - pitcher_VEL)/300   (foul prolunga count senza out)
- Simula fino a: strikeout (3 strikes), walk (4 balls), o in-play (ball/strike/foul fino a decisione battuta)
- Total pitches per PA ≈ somma tentativi fino a risoluzione (media ~3.8–4.2 in MLB)
- Stats tracciate: balls, strikes, fouls per PA (visibili post-game)

## Matchup_rating base (invariato da v0.1, ma riusato ovunque)
matchup_rating = (batter_POW * 0.25 + batter_CON * 0.30 + batter_EYE * 0.20 + batter_SPD * 0.15) 
               - (pitcher_VEL * 0.30 + pitcher_CTL * 0.25 + pitcher_MOV * 0.25 + pitcher_fatigue_penalty)

Range tipico: -60 .. +60  
Usato come input principale per tabella esiti e per tutti i confronti skill-vs-skill sotto.

## Esiti at-bat principali (tabella da v0.1, invariata per beta)
(matchup_rating → HR, XBH, 1B, BB, SO, Out-in-play, Error)  
... (mantieni la tabella probabilistica di v0.1)

## Dinamiche DIFESA – Error / Out su in-play (nuovo beta)
Quando esito = Out-in-play o Error:

1. Qualità battuta (hit_quality) = matchup_rating + random(-10..+10)   // influenza advance e fielding difficulty
2. Posizione che riceve la battuta (determinata da spray semplificato o random ponderato)
   - Es. 40% INF (2B/SS/3B), 25% 1B, 20% OF, 15% C/P

3. Difesa rating per quella posizione = media DEF_pos dei giocatori in quella zona (o del ricevente principale)
   - Es. grounder → media INF + 1B
   - Fly/Line → media OF

4. Error chance = 0.02 + (0.08 / (1 + exp(0.08 * (difesa_rating - 50))))   // sigmoid, errori più probabili vs battute forti
   - Se RNG < error_chance → Error (batter on 1B, runners advance +1 base extra)

5. Out chance se no error = 0.95 + (difesa_rating - 50)/200   // clamped 0.80–1.00
   - Se fallisce → reached on error (simile a error sopra)

> **NOTA (v0.4):** Questa sezione descrive il sistema pianificato con hit_quality e spray chart.
> L'implementazione attuale (v1.5.0+) usa il sistema **PlayI/PlayO** descritto in `mechanic_spec.md`:
> - PlayI prob = clamp(0.65 - MR/100, 0.25, 0.85) → errore su media DEF di 1B + interno random
> - PlayO prob = 1 - PlayI → errore su DEF di esterno random
> - PlayI → GO, PlayO → FO (se nessun errore)
> Il sistema hit_quality/spray chart resta come reference per futura evoluzione.

## Advance on Hit / Error — IMPLEMENTAZIONE ATTUALE (v1.5.0)
Regole fisse per esito (vedi `mechanic_spec.md` per dettaglio completo):

- **HR**: tutti i corridori + battitore segnano
- **3B**: tutti i corridori segnano, battitore in 3B
- **2B**: corridori in 3B/2B segnano, corridore in 1B segna se velocità sufficiente (prob = 0.6 + spd/200) altrimenti avanza in 3B
- **1B**: corridore in 3B segna, corridore in 2B segna se velocità sufficiente (prob = 0.55 + spd/200) altrimenti in 3B, corridore in 1B avanza in 2B
- **BB**: battitore in 1B, corridori spinti avanti, basi piene → punto forzato
- **ERR**: battitore in 1B, corridori avanzano 1 base, corridore in 3B segna
- **GO**: battitore eliminato, corridori avanzano 1 base, corridore in 3B segna se non è il 3° out. Basi piene → GIDP automatico
- **FO**: battitore eliminato, corridori NON avanzano. Eccezione: sacrifice fly da 3B se non è il 3° out

> **NOTA:** La sezione "Advance on Hit / Error (beta)" sotto descrive il sistema pianificato con hit_quality e runner_SPD bonus.
> Resta come reference per futura evoluzione.

### Advance on Hit / Error (sistema pianificato — NON IMPLEMENTATO)
Su 1B, 2B, 3B, HR, Error:

- Base advance prob per runner = base 50–80% + bonus da:
  hit_quality (> +20 → +15–25% extra bases)
  batter_SPD (>70 → +10%)
  runner_SPD (>70 → +15–30%)

- Esempi semplificati:
  - Single: lead runner advance 1 base 70–95%, 2 bases 5–30% (dipende hit_quality + runner_SPD)
  - Double: lead runner advance 2 basi 60–90%, score from 1st 40–80%
  - Error: +1 base extra a tutti i runners con 60% prob

## Stolen Base — IMPLEMENTATO v1.17.0

Meccanica post-at-bat a 2 fasi. Gate: esito SO/BB + corridore in 1a/2a + <2 out + no rubata di casa.

### Fase 1: Tentativo
attemptProb = 0.15 + (runner.spd-60)/300 - (pitcher.ctl-50)/400 + tac_st_mod
- tac_st_mod = somma tac_st dai layer tattici attivi / 100 (attack_style, offensive_attack, defense_counter_infield/outfield, defense_setup)
- Clamp [0.02, 0.35]

### Fase 2: Riuscita (solo confronto skill)
successProb = 0.50 + (runner.spd*0.4 + runner.eye*0.3 + runner.sta*0.3 - catcher.def*0.4 - catcher.eye*0.3 - catcher.sta*0.3) / 150
- Clamp [0.25, 0.90]
- SAFE → corridore avanza 1 base; OUT → caught stealing (+1 out)

~1-4 tentativi per partita, successo tipico 60-75%. Vedi `Steal_mechanic.md` per dettaglio completo.

## Double Play / GIDP

### Implementazione attuale (v1.5.0)
- Trigger: GO con basi piene → GIDP automatico
- Battitore + corridore in 1B eliminati (+2 out), nessun punto segnato
- Corridori in 2B e 3B NON avanzano durante GIDP

### Sistema pianificato (NON IMPLEMENTATO)
Solo su grounder con runner su 1B e <2 outs

GIDP prob = base 0.12 + modifiers:

+ (batter_POW + batter_SPD basso → +0.08 se hard hit ma lento)
+ (runner_SPD basso → +0.10–0.20)
- (infield_DEF media (SS+2B+3B+1B) alta → -0.15–0.25)
- (hit_quality bassa → grounder debole → -0.10)

Formula approssimativa:
gidp_prob = 0.08 + (80 - batter_SPD)/400 + (80 - runner_SPD)/300 - (infield_DEF_avg - 50)/200

Se GIDP → 2 outs, batter out, runner out a 2B

## Altre note
- Park factor: moltiplicatore su HR/XBH (0.85–1.20) — **NON IMPLEMENTATO**, pianificato
- Home advantage: +8 a tutti i matchup_rating offensivi casa — **IMPLEMENTATO**
- Fatigue: pitcher STA penalty dopo inning 5–6 — **IMPLEMENTATO** (fatiguePenalty = (inning > 5) ? (inning - 5) × (100 - sta) × 0.04 : 0)

## Pitcher Substitution (IMPLEMENTATO v1.0, refactored v1.13.0 — per-pitcher configs)
Valutata prima di ogni at-bat. Catena: SP → R1 → Closer.
Ogni ruolo ha le stesse 4 condizioni configurabili individualmente tramite `pitcherConfigs` JSONB in `pitcher_rotations`.

**Range uniformi per tutti i ruoli (SP, R1, Closer):**
- pitchCount ≥ maxPitches (10-100)
- inningsPitched ≥ maxInnings (0-9)
- bbAllowed ≥ maxBb (1-10)
- erAllowed ≥ maxEr (1-10)

**Default:**
- SP: { maxPitches: 100, maxInnings: 7, maxBb: 4, maxEr: 4, pitcherStyle: "command" }
- R1: { maxPitches: 40, maxInnings: 9, maxBb: 4, maxEr: 3, pitcherStyle: "command" }
- Closer: { maxPitches: 30, maxInnings: 9, maxBb: 4, maxEr: 2, pitcherStyle: "command" }

Al cambio lanciatore, il `pitcherStyle` attivo viene aggiornato con lo stile del nuovo pitcher (ricalcolo RPS automatico).

Senza DH: il rilievo prende lo slot di battuta del predecessore.
Con DH: il rilievo non batte mai.

## Tattiche — Sistema Dinamico (v1.14.0)

Il sistema tattico è basato su coefficienti dinamici configurabili da admin e schedule di switch in-game.

### Tactic Schedules & Switching
Ogni team configura 3 slot (Primary, Secondary, Optional) per Batter Approach, Attack Style e Offensive Attack. Lo switch avviene se le condizioni del box corrente non sono più soddisfatte:
- `maxInning`, `maxStrikeouts`, `maxRunsAllowed`, `maxHitsAllowed`.

### Ordine di Applicazione (Per ogni At-Bat)
1. **Layer 1: Batter Approach vs Pitcher Style (RPS)**
   - Win/Tie/Lose bilaterale. Il vincitore applica i propri coefficienti.
2. **Layer 2: Attack Style + Defense Counter**
   - Modificatori diretti (Attack Style) + bonus/malus da posizionamento difensivo.
3. **Layer 3: Offensive Attack vs Defense Setup (RPS)**
   - Win/Tie/Lose bilaterale tra attacco e difesa.

### Tabelle Coefficienti (Configurabili in Admin)
Tutti i valori sono percentuali intere salvate in `tactic_coefficients`.

**Esempio Batter Approach (Attaccante):**
| Approach | HR | XBH | 1B | BB | SO | GO | FO |
|---|---|---|---|---|---|---|---|
| Power | +12% | +10% | 0 | 0 | 0 | -5% | -5% |
| Contact | 0 | +5% | +12% | +5% | -10% | 0 | 0 |
| Patient | 0 | +6% | +8% | +10% | -8% | -4% | 0 |

**Esempio Pitcher Style (Difensore):**
| Style | HR | XBH | 1B | BB | SO | GO | FO |
|---|---|---|---|---|---|---|---|
| Velocity | -8% | -6% | 0 | 0 | +12% | 0 | +5% |
| Movement | -5% | -8% | -4% | 0 | +5% | +10% | +5% |
| Command | -6% | -5% | -5% | -8% | +8% | +6% | +6% |

(Tabelle complete per Offensive Attack e Defense Setup seguono la stessa logica Win/Lose).

## Play Log (IMPLEMENTATO v1.6.0)

### Struttura
Ogni partita genera un array di `PlayLogEntry` salvato nel campo `play_log` JSONB di `match_details`.

### Tipi di evento
1. **at_bat** — ogni turno di battuta completato
   - Campi: inning, half (top/bottom), outs, batterId, batterName, pitcherId, pitcherName
   - Count: balls, strikes, pitches totali
   - Esito: outcome (HR/3B/2B/1B/BB/SO/GO/FO/ERR/GIDP)
   - Difesa: fielderName, fielderPosition, playDirection (infield/outfield)
   - Basi: basesBefore, basesAfter (stato prima e dopo l'azione)
   - Risultato: runsScored, outsAdded

2. **pitcher_change** — sostituzione lanciatore
   - Campi: inning, half, outs
   - Cambio: oldPitcherName → newPitcherName, newPitcherRole (R1/Closer)
   - Motivazione: changeReason (es. "Pitch count: 102/100", "ER: 4/3")

### Lifecycle
- Generato durante simulateGame() per ogni at-bat e ogni cambio lanciatore
- Salvato in DB sia per partite di lega (simulateMatchDay) che per API result (POST /api/matches/:id/result)
- Exhibition: generato ma non persistito (solo in memoria)
- Pulizia: a generazione nuova season, play_log impostato a null sui match_details della season precedente

### Visualizzazione
- **MatchDetailPage**: accordion collassabile "PLAY LOG" sotto il MVP
- **PlayLogPage** (/play-log): pagina dedicata con selettore giornata, accordion per match del team utente

## Training / Minigames (v1.8.0)

### Concetto
3 minigame single-screen che simulano l'allenamento. Il giocatore (utente) esegue drill per guadagnare boost attributi ai propri giocatori.

### Attribute Boosts
- Ogni giocatore ha 9 colonne `_add` (pow_add, con_add, etc.) inizialmente a 0
- Il boost viene sommato al valore base: `totale = base + add`
- Cap: il totale non può superare 99 (`add = min(amount, 99 - base)`)
- Player card mostra "base + add = total" con overlay ambra sulla barra

### Scoring
- Tutti i punteggi normalizzati 0-1000 per ranking globale uniforme
- Ranking: best score per utente, ordinato decrescente

### Minigame: Eye Drill
- 10 round, icona ⚾ appare in posizione casuale nell'area di gioco
- Misura tempo di reazione (ms) per round
- Score = max(0, 1000 - avgReactionTime * 2)
- Reward: EYE

### Minigame: Batting Practice
- 10 lanci, palla si muove orizzontalmente nella strike zone
- Sweet spot: zona centrale (~15% larghezza)
- Score per pitch: 100 se in sweet spot, decresce con distanza
- Score totale normalizzato: totalPoints * 10
- Reward: CON o POW (configurabile)

### Minigame: Pitch Control
- 10 round, griglia 3x3 (catcher's frame), una cella si illumina
- Timer 1.5s per rispondere, bonus velocità per tap < 0.5s (+50)
- Score: (correct * 100 + speed_bonus) normalizzato a 0-1000
- Reward: CTL

### Configurazione Admin (training_config)
- Per ogni game_type: attributi reward, amount, min_score_for_reward, max_boost_per_season
- Modificabile solo da utenti con `is_admin = true`
- Default configs seedate all'avvio server

## Prossimi affinamenti
- Hit_quality e spray chart per difesa granulare (sostituirebbe PlayI/PlayO semplificato)
- GIDP probabilistico (non solo basi piene)
- Park factor
- Momentum / hot streak temporaneo
- Full pitch-by-pitch opzionale per modalità exhibition
