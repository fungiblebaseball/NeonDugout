# Neon Dugout

## Overview
Text-based fantasy baseball manager game with retro 80s/90s cyberpunk aesthetic. Target platform: Solana Seeker mobile (Web3 integration planned). Zero MLB licenses - all fictional teams and players.

## Current State
Full-stack application with PostgreSQL backend, Express API, and React frontend. Version 1.6.0 — Play Log feature (play-by-play record per match with fielder details, pitcher change reasons, accordion in Match Detail, dedicated Play Log page).

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
- `shared/schema.ts` - Drizzle schema: users, teams, players, matches, match_details, lineups, pitcher_rotations (with roles JSONB), tactics
- `server/routes.ts` - API routes (/api/auth/challenge, /api/auth/verify, /api/auth/me, /api/teams, /api/matches, /api/player/:id, /api/matches/:id/result, /api/match-details/:matchId, /api/lineup, /api/pitcher-rotation, /api/tactics)
- `server/auth.ts` - JWT token creation/verification, ed25519 signature validation, challenge nonce management
- `server/expansion.ts` - Dynamic league expansion: auto-creates new league with 20 teams + 400 players + 228 matches when all teams are owned
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/seed.ts` - Seeds 40 teams (2 leagues × 2 series × 10 teams), 800 players, 14-day schedule (regular + interleague + playoff)
- `server/simulation.ts` - Server-side batch simulation for match days
- `server/season.ts` - Playoff matchup resolution + new season generation with promotion/relegation
- `server/db.ts` - Database connection pool
- `client/src/lib/store.ts` - Zustand store with wallet auth (loginWithSignature, restoreSession, disconnectWallet), JWT persistence
- `client/src/components/WalletProvider.tsx` - Solana wallet adapter provider (auto-detects Phantom, Solflare, Backpack, Seeker)
- `client/src/pages/` - LoginPage, Home, LineupPage, PitchersPage, AttackPage, DefensePage, SimulationPage, SchedulePage, StandingsPage, PlayerDetailPage, MatchDetailPage
- `client/src/lib/calculations/` - Pure simulation engine (matchup, probability, simulate, rng, flavor, types)
- `client/src/components/Navigation.tsx` - Bottom nav (7 items: Hub, Lineup, Pitch, ATK, DEF, Sched, Rank)

## Database Tables
- `users` - wallet-based auth (id, wallet_address, team_id)
- `teams` - 20 teams in divisions A & B (id, name, division, owner_wallet, season_id)
- `players` - 20 per team with 9 stats (pow, con, spd, eye, vel, ctl, mov, sta, def)
- `matches` - round-robin schedule with scores (90 per division, 18 days)
- `match_details` - full game data per match (box_score, flavor_texts, mvp, home_lineup, away_lineup, home_batters, away_batters, home_pitcher, away_pitcher, home_pitchers, away_pitchers, play_log)
- `lineups` - field positions + batting order (JSON columns)
- `pitcher_rotations` - roles JSONB {sp, r1, closer, nextSp} + rotation_order + SP switch conditions (maxPitches/maxInnings/maxBb/maxEr) + R1 conditions (r1MaxPitches/r1MaxEr) + Closer conditions (closerMaxPitches/closerMaxEr)
- `tactics` - 7 tactical fields (attackStyle, infieldPosition, outfieldPosition, batterApproach, pitcherStyle, offensiveAttack, defenseSetup)
- `team_snapshots` - historical team state per season (team_id, season_id, name, division, league, series, primary_color, owner_wallet, wins, losses, runs_for, runs_against)

## Pages
0. **Login** (/login) - Solana wallet authentication: select wallet (Phantom/Solflare/Backpack/Seeker), sign challenge message, verify signature
1. **Home** (/) - Team dashboard, nav grid, play next league match button with "View Match Report" link, redirect to login if not authenticated
2. **Lineup** (/lineup) - Assign field positions (SP read-only from pitching, C,1B...RF), DH toggle, reorder batting order 1-9 (SP moveable)
3. **Pitchers** (/pitchers) - Assign pitcher roles: SP, R1, C, 2P. SP/R1/Closer switch conditions via sliders (pitches, innings, BB, ER). Pitcher Style RPS (velocity/movement/command vs batter approach)
4. **Attack** (/attack) - 3 tactical sections: Attack Style (bunt/h&r/neutral/sos with probability modifiers), Batter Approach (power/contact/patient RPS vs pitcher), Offensive Attack (aggressive/balanced/conservative RPS vs defense)
5. **Defense** (/defense) - 3 tactical sections: Infield Position (short/neutral/deep counter), Outfield Position (short/neutral/deep counter), Defense Setup (aggressive/balanced/protective RPS vs offense)
6. **Simulate** (/simulate) - Exhibition test match using saved lineup/tactics/rotation with box score, batter/pitcher stats, flavor text
7. **Schedule** (/schedule) - Division calendar (18 match days), next match highlight, W-L record, played matches clickable → Match Report
8. **Standings** (/standings) - Division standings with W/L/PCT/RF/RA, switch divisions, season navigator (◀ ▶) for past seasons with match results, match preview for current season
9. **Player Detail** (/player/:id) - Player card with photo slot, 9 attribute bars, career averages
10. **Match Detail** (/match/:id) - Full match report: box score, linescore, batter/pitcher stats, MVP, flavor text, player links, collapsible play log accordion
11. **Play Log** (/play-log) - Dedicated play-by-play records page, match day selector, per-match accordion with inning-by-inning log, fielder and direction info

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
- Batch processor planned for daily match simulation at 00:00 CET
- Pitcher position in Lineup is read-only, driven by Pitching Staff page
- League matches can be played manually from Home (results + full details saved to DB)
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
- Creates next league (L3, L4, ...) with SerieA + SerieB (10 teams each)
- Generates 400 players (20 per team) with gaussian stat distribution
- Creates full 14-day schedule (regular + interleague + playoff placeholders)
- New team from expansion is automatically assigned to the registering user

## Page Documentation
Each page has a dedicated .md file in root: PAGE_LOGIN.md, PAGE_HOME.md, PAGE_LINEUP.md, PAGE_PITCHERS.md, PAGE_ATTACK.md, PAGE_DEFENSE.md, PAGE_SIMULATE.md, PAGE_SCHEDULE.md, PAGE_STANDINGS.md, PAGE_PLAYER_DETAIL.md, PAGE_MATCH_DETAIL.md, PAGE_PLAY_LOG.md

## Deployment
- Development: Replit (port 5000)
- Production: Contabo VPS (see BACKEND_PREREQUISITES.md)
- Build: `npm run build` -> dist/ with compiled server + static frontend

## User Preferences
- Language: Italian for communication
- Mobile-first UX, thumb-zone accessibility
- Solana Seeker as primary target device
