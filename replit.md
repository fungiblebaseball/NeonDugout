# Neon Dugout

## Overview
Text-based fantasy baseball manager game with retro 80s/90s cyberpunk aesthetic. Target platform: Solana Seeker mobile (Web3 integration planned). Zero MLB licenses - all fictional teams and players.

## Current State
Full-stack application with PostgreSQL backend, Express API, and React frontend. Version 1.12.0 — Season genesis: 4 leagues (L1-L4, 80 teams, 1600 players), max 4 leagues cap (no further expansion). Auto new season when all matches played. Admin: reset & regenerate season, erase all data (wipe DB + re-seed, first user = admin). First user to register on empty DB auto-promoted to admin.

## Branding
- **Logo**: `client/src/assets/images/logo-neon-dugout.png` — Stylized baseball diamond (neon glow, transparent bg)
- **Login Background**: `client/src/assets/images/bg-login.png` — Dark cyberpunk atmosphere (9:16 portrait)
- **Palette**: Neon pink (#ec4899) + cyan (#06b6d4) on dark backgrounds
- **Fonts**: Orbitron (headings), VT323 (body/mono), Press Start 2P (accents)

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, Zustand (state), wouter (routing), TanStack Query (API), @solana/wallet-adapter-react (wallet connection)
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed on Replit), JWT auth (jsonwebtoken), ed25519 verification (tweetnacl)
- **Auth**: Solana wallet signature-based login (challenge/verify flow), JWT sessions (7-day expiry)
- **Design**: Neon pink/cyan palette, Orbitron/VT323/Press Start 2P fonts, mobile-first bottom nav

## Key Files
- `shared/schema.ts` - Drizzle schema: users (with isAdmin), teams, players (with _add boost columns), matches, match_details, lineups, pitcher_rotations, tactics, training_results, training_config, user_tokens, token_config
- `server/routes.ts` - API routes (/api/auth/*, /api/teams, /api/matches, /api/player/:id, /api/training/*, /api/tokens/*, /api/admin/training-config, /api/admin/token-config, /api/admin/reset-tokens, /api/admin/reset-season, /api/admin/wipe-database, /api/simulate-day, /api/new-season, /api/lineup, /api/pitcher-rotation, /api/tactics)
- `server/auth.ts` - JWT token creation/verification, ed25519 signature validation, challenge nonce management, claim challenge/verify, training challenge/verify
- `server/scheduler.ts` - Game day cron scheduler (00:00 CET / 23:00 UTC daily via node-cron)
- `server/names.ts` - Shared name generation: ~230 first names, ~200 last names (cyberpunk), ~50+50 team prefixes (A/B series), ~56 middles, ~80 mascots, dedup functions via Set
- `server/expansion.ts` - Dynamic league expansion (capped at MAX_LEAGUES=4): auto-creates new league with 20 teams + 400 players + 228 matches when all teams are owned, blocks expansion beyond L4, uses names.ts
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/seed.ts` - Seeds 80 teams (4 leagues × 2 series × 10 teams), 1600 players, 14-day schedule per league — team/player names generated dynamically from names.ts (no hardcoded names)
- `server/simulation.ts` - Server-side batch simulation for match days
- `server/season.ts` - Playoff matchup resolution + new season generation with promotion/relegation
- `server/db.ts` - Database connection pool
- `client/src/lib/store.ts` - Zustand store with wallet auth (loginWithSignature, restoreSession, disconnectWallet), JWT persistence
- `client/src/components/WalletProvider.tsx` - Solana wallet adapter provider (auto-detects Phantom, Solflare, Backpack, Seeker)
- `client/src/pages/` - LoginPage, Home, LineupPage, PitchersPage, AttackPage, DefensePage, SimulationPage, SchedulePage, StandingsPage, PlayerDetailPage, MatchDetailPage, TrainingPage, TeamPage, AdminPage
- `client/src/pages/minigames/` - EyeDrillGame, BattingPracticeGame, PitchControlGame
- `client/src/lib/calculations/` - Pure simulation engine (matchup, probability, simulate, rng, flavor, types)
- `client/src/components/Navigation.tsx` - Bottom nav (9 items: Hub, Lineup, Pitch, ATK, DEF, Train, Team, Sched, Rank)

## Database Tables
- `users` - wallet-based auth (id, wallet_address, team_id, is_admin)
- `teams` - 80 teams in 4 leagues × 2 series (id, name, division, league, series, owner_wallet, season_id)
- `players` - 20 per team with 9 base stats + 9 _add boost columns (pow, con, spd, eye, vel, ctl, mov, sta, def + pow_add, con_add, etc.)
- `matches` - round-robin schedule with scores (90 per division, 18 days)
- `match_details` - full game data per match (box_score, flavor_texts, mvp, home_lineup, away_lineup, home_batters, away_batters, home_pitcher, away_pitcher, home_pitchers, away_pitchers, play_log)
- `lineups` - field positions + batting order (JSON columns)
- `pitcher_rotations` - roles JSONB {sp, r1, closer, nextSp} + rotation_order + SP switch conditions (maxPitches/maxInnings/maxBb/maxEr) + R1 conditions (r1MaxPitches/r1MaxEr) + Closer conditions (closerMaxPitches/closerMaxEr)
- `tactics` - 7 tactical fields (attackStyle, infieldPosition, outfieldPosition, batterApproach, pitcherStyle, offensiveAttack, defenseSetup)
- `team_snapshots` - historical team state per season (team_id, season_id, name, division, league, series, primary_color, owner_wallet, wins, losses, runs_for, runs_against)
- `training_results` - minigame scores and rewards (user_id, team_id, game_type, score, raw_data, reward_attribute, reward_player_id, reward_amount, confirmed, reward_player_ids, reward_attributes)
- `training_config` - admin-configurable reward rules per game type (game_type, reward_attributes[], reward_amount, min_score_for_reward, max_boost_per_season, reward_target, reward_target_role)
- `user_tokens` - token balance per utente (user_id unique, balance, last_claim_at) — claim certificato con firma wallet
- `token_config` - configurazione admin token economy (claim_amount, claim_interval_hours)

## Pages
0. **Login** (/login) - Solana wallet authentication: select wallet (Phantom/Solflare/Backpack/Seeker), sign challenge message, verify signature
1. **Home** (/) - Team dashboard, nav grid, game day info (read-only, no play button), training center always visible with dynamic labels, redirect to login if not authenticated
2. **Lineup** (/lineup) - Assign field positions (SP read-only from pitching, C,1B...RF), DH toggle, reorder batting order 1-9 (SP moveable)
3. **Pitchers** (/pitchers) - Assign pitcher roles: SP, R1, C, 2P. SP/R1/Closer switch conditions via sliders (pitches, innings, BB, ER). Pitcher Style RPS (velocity/movement/command vs batter approach)
4. **Attack** (/attack) - 3 tactical sections: Attack Style (bunt/h&r/neutral/sos with probability modifiers), Batter Approach (power/contact/patient RPS vs pitcher), Offensive Attack (aggressive/balanced/conservative RPS vs defense)
5. **Defense** (/defense) - 3 tactical sections: Infield Position (short/neutral/deep counter), Outfield Position (short/neutral/deep counter), Defense Setup (aggressive/balanced/protective RPS vs offense)
6. **Simulate** (/simulate) - Exhibition test match using saved lineup/tactics/rotation with box score, batter/pitcher stats, flavor text
7. **Schedule** (/schedule) - Division calendar (18 match days), next match highlight, W-L record, played matches clickable → Match Report
8. **Standings** (/standings) - Division standings with W/L/PCT/RF/RA, switch divisions, season navigator (◀ ▶) for past seasons with match results, match preview for current season
9. **Player Detail** (/player/:id) - Player card with photo slot, 4-section attributes (Offense/Defense/Pitching/Crossing), dual-context defense labels, base + boost breakdown with amber overlay, career averages
10. **Match Detail** (/match/:id) - Full match report: box score, linescore, batter/pitcher stats, MVP, flavor text, player links, collapsible play log accordion
11. **Play Log** (/play-log) - Dedicated play-by-play records page, match day selector, per-match accordion with inning-by-inning log, fielder and direction info
12. **Training** (/training) - Training hub with 3 minigame cards (Eye Drill, Batting Practice, Pitch Control), best scores, links to each game
13. **Eye Drill** (/training/eye-drill) - Reaction time minigame: tap baseball as fast as possible, 10 rounds, rewards EYE boost
14. **Batting Practice** (/training/batting) - Timing minigame: swing at the sweet spot, 10 pitches, rewards CON/POW boost
15. **Pitch Control** (/training/pitch-control) - Accuracy minigame: tap correct zone in 3x3 grid, 10 rounds, rewards CTL boost
16. **Team** (/team) - Team overview: user info (wallet, registration), team info (name, color, league), token balance with claim button, full roster table with base + bonus attributes
17. **Admin** (/admin) - Admin-only panel: match day control (simulate/new season/reset season/wipe DB), token economy config (X tokens per Y hours, reset treasury), training reward rules (attributes, amounts, min scores, caps, reward target). First user on empty DB = auto admin

## Deep Navigation Flow
- Home → Play Match → View Match Report → Player Detail
- Home → Play Log → Day selector → Match accordion → Full Match Report
- Schedule → Click played match → Match Report → Player Detail
- Standings → Match Preview → Player Detail
- Match Report → Schedule / Standings (bottom nav)
- Match Report batter/pitcher names → Player Detail

## Pitcher Roles System
- SP: Starting Pitcher for current game (shown in Lineup as position "SP")
- R1: Relief 1 (first reliever when SP is pulled)
- C: Closer (9th inning / save situations)
- 2P: Next game starter (auto-rotated after game)
- SP switch conditions: maxPitches (50-150), maxInnings (1-9), maxBB (1-10), maxER (1-10)
- R1 switch conditions: r1MaxPitches (15-80), r1MaxEr (1-6)
- Closer switch conditions: closerMaxPitches (10-60), closerMaxEr (1-5)
- Substitution chain: SP → R1 → Closer (automatic during simulation)

## Tactics System (7 campi, 3 layer)
7 campi tattici per team in tabella `tactics`: attackStyle, infieldPosition, outfieldPosition, batterApproach, pitcherStyle, offensiveAttack, defenseSetup

### Layer 1 — Attack Style + Defense Counter (pagine Attack + Defense)
- Attack styles (bunt, hit_and_run, neutral, swing_on_sight): modificatori diretti su probabilità at-bat
- Infield position (short/neutral/deep): counter specifico dell'attack style avversario
- Outfield position (short/neutral/deep): counter specifico dell'attack style avversario

### Layer 2 — Batter Approach vs Pitcher Style (RPS)
- Batter Approach (power/contact/patient) vs Pitcher Style (velocity/movement/command)
- Matrice RPS: Power beats Movement, Contact beats Command, Patient beats Velocity

### Layer 3 — Offensive Attack vs Defense Setup (RPS)
- Offensive Attack (aggressive/balanced/conservative) vs Defense Setup (aggressive/balanced/protective)
- Matrice RPS: Aggressive beats Protective, Balanced beats Aggressive, Conservative ties

All modifiers are multiplicative percentages applied to base probability table in `shared/calculations/probability.ts`

## Design Decisions
- Meritocratic divisions: all teams generated with same attribute ranges (30-85 gaussian)
- Zustand with localStorage persistence for dev convenience, API calls for real data
- Bottom nav with 7 items: Hub, Lineup, Pitch, ATK, DEF, Sched, Rank
- Game day auto-simulated daily at 00:00 CET via node-cron scheduler
- When season ends (all matches played), scheduler auto-generates new season
- League expansion capped at 4 leagues max (L1-L4)
- First user to register on empty DB is auto-promoted to admin
- Admin can reset & regenerate current season, or wipe entire DB
- Pitcher position in Lineup is read-only, driven by Pitching Staff page
- Match details stored in DB for later review (lineup, batter stats, pitcher stats, box score, flavor text, MVP)

## Authentication Flow
1. User visits /login → selects wallet (Phantom/Solflare/Backpack/Seeker)
2. Wallet adapter connects → publicKey available
3. Frontend requests challenge: POST /api/auth/challenge → nonce returned
4. User signs challenge message with wallet
5. Frontend sends signature: POST /api/auth/verify → JWT token + user + team returned
6. JWT stored in Zustand (localStorage persist), included in Authorization header
7. Session restore on app load: GET /api/auth/me with Bearer token

## Dynamic League Expansion
- Triggered automatically when a new user registers and all existing teams have owners
- **Capped at MAX_LEAGUES = 4** (L1-L4): nessuna espansione oltre L4
- Se < 4 leghe: crea nuova lega con SerieA + SerieB (20 team, 400 giocatori, schedule 14 giorni)
- Se già 4 leghe: `expandLeague()` ritorna early, `ensureExtraLeague()` skip
- Nuovi utenti assegnati a team liberi nelle 4 leghe esistenti
- Seed iniziale crea 4 leghe (L1-L4): 80 team, 1600 giocatori

## Page Documentation
Each page has a dedicated .md file in root: PAGE_LOGIN.md, PAGE_HOME.md, PAGE_LINEUP.md, PAGE_PITCHERS.md, PAGE_ATTACK.md, PAGE_DEFENSE.md, PAGE_SIMULATE.md, PAGE_SCHEDULE.md, PAGE_STANDINGS.md, PAGE_PLAYER_DETAIL.md, PAGE_MATCH_DETAIL.md, PAGE_PLAY_LOG.md, PAGE_TEAM.md, PAGE_ADMIN.md

## Technical Documentation
- `Player_SEED.md` — Player generation algorithm: roster structure, gaussian distribution, talent tiers, attribute definitions and matchup weights

## Deployment
- Development: Replit (port 5000)
- Production: Contabo VPS (see BACKEND_PREREQUISITES.md)
- Build: `npm run build` -> dist/ with compiled server + static frontend

## User Preferences
- Language: Italian for communication
- Mobile-first UX, thumb-zone accessibility
- Solana Seeker as primary target device
