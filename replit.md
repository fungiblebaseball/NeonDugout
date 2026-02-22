# Gridiron Ghosts

## Overview
Text-based fantasy baseball manager game with retro 80s/90s cyberpunk aesthetic. Target platform: Solana Seeker mobile (Web3 integration planned). Zero MLB licenses - all fictional teams and players.

## Current State
Full-stack application with PostgreSQL backend, Express API, and React frontend. Version 1.0 — Tactical Gameplay Engine.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, Zustand (state), wouter (routing), TanStack Query (API)
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed on Replit)
- **Design**: Neon pink/cyan palette, Orbitron/VT323/Press Start 2P fonts, mobile-first bottom nav

## Key Files
- `shared/schema.ts` - Drizzle schema: users, teams, players, matches, match_details, lineups, pitcher_rotations (with roles JSONB), tactics
- `server/routes.ts` - API routes (/api/auth/connect, /api/teams, /api/matches, /api/player/:id, /api/matches/:id/result, /api/match-details/:matchId, /api/lineup, /api/pitcher-rotation, /api/tactics)
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/seed.ts` - Seeds 20 teams (10 per division), 400 players, round-robin schedule (90 matches per division, 18 days)
- `server/db.ts` - Database connection pool
- `client/src/lib/store.ts` - Zustand store with wallet connect -> API call flow
- `client/src/pages/` - Home, LineupPage, PitchersPage, AttackPage, DefensePage, SimulationPage, SchedulePage, StandingsPage, PlayerDetailPage, MatchDetailPage
- `client/src/lib/calculations/` - Pure simulation engine (matchup, probability, simulate, rng, flavor, types)
- `client/src/components/Navigation.tsx` - Bottom nav (7 items: Hub, Lineup, Pitch, ATK, DEF, Sched, Rank)

## Database Tables
- `users` - wallet-based auth (id, wallet_address, team_id)
- `teams` - 20 teams in divisions A & B (id, name, division, owner_wallet, season_id)
- `players` - 20 per team with 9 stats (pow, con, spd, eye, vel, ctl, mov, sta, def)
- `matches` - round-robin schedule with scores (90 per division, 18 days)
- `match_details` - full game data per match (box_score, flavor_texts, mvp, home_lineup, away_lineup, home_batters, away_batters, home_pitcher, away_pitcher)
- `lineups` - field positions + batting order (JSON columns)
- `pitcher_rotations` - roles JSONB {sp, r1, closer, nextSp} + rotation_order + SP switch conditions (maxPitches/maxInnings/maxBb/maxEr) + R1 conditions (r1MaxPitches/r1MaxEr) + Closer conditions (closerMaxPitches/closerMaxEr)
- `tactics` - attack style + infield/outfield positioning

## Pages
1. **Home** (/) - Connect wallet, team dashboard, nav grid, play next league match button with "View Match Report" link
2. **Lineup** (/lineup) - Assign field positions (SP read-only from pitching, C,1B...RF), DH toggle, reorder batting order 1-9 (SP moveable)
3. **Pitchers** (/pitchers) - Assign pitcher roles: SP, R1, C, 2P. SP/R1/Closer switch conditions via sliders (pitches, innings, BB, ER)
4. **Attack** (/attack) - Choose offensive strategy with probability modifiers: bunt (+15% contact, -20% XBH), hit-and-run (+15% 1B, -25% HR), neutral (base), swing-on-sight (+20% XBH, +15% HR, +20% SO)
5. **Defense** (/defense) - Set infield/outfield positioning with counter-strategy effects (short counters bunt, neutral counters H&R, deep counters swing-on-sight)
6. **Simulate** (/simulate) - Exhibition test match using saved lineup/tactics/rotation with box score, batter/pitcher stats, flavor text
7. **Schedule** (/schedule) - Division calendar (18 match days), next match highlight, W-L record, played matches clickable → Match Report
8. **Standings** (/standings) - Division standings with W/L/PCT/RF/RA, switch divisions, match preview with saved lineups (positions + batting order) + separate pitcher roster grid
9. **Player Detail** (/player/:id) - Player card with photo slot, 9 attribute bars, career averages
10. **Match Detail** (/match/:id) - Full match report: box score, linescore, batter/pitcher stats, MVP, flavor text, player links

## Deep Navigation Flow
- Home → Play Match → View Match Report → Player Detail
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

## Tactics System
- Attack styles apply probability modifiers to at-bat outcomes (bunt, hit_and_run, neutral, swing_on_sight)
- Defense positioning counters specific attack styles (rock-paper-scissors interplay)
- Infield: short counters bunt, neutral counters hit-and-run, deep counters swing-on-sight
- Outfield: short counters bunt singles, neutral counters hit-and-run, deep counters power hitting
- All modifiers are multiplicative percentages applied to base probability table

## Design Decisions
- Meritocratic divisions: all teams generated with same attribute ranges (30-85 gaussian)
- Zustand with localStorage persistence for dev convenience, API calls for real data
- Bottom nav with 7 items: Hub, Lineup, Pitch, ATK, DEF, Sched, Rank
- Batch processor planned for daily match simulation at 00:00 CET
- Pitcher position in Lineup is read-only, driven by Pitching Staff page
- League matches can be played manually from Home (results + full details saved to DB)
- Match details stored in DB for later review (lineup, batter stats, pitcher stats, box score, flavor text, MVP)

## Page Documentation
Each page has a dedicated .md file in root: PAGE_HOME.md, PAGE_LINEUP.md, PAGE_PITCHERS.md, PAGE_ATTACK.md, PAGE_DEFENSE.md, PAGE_SIMULATE.md, PAGE_SCHEDULE.md, PAGE_STANDINGS.md, PAGE_PLAYER_DETAIL.md, PAGE_MATCH_DETAIL.md

## Deployment
- Development: Replit (port 5000)
- Production: Contabo VPS (see BACKEND_PREREQUISITES.md)
- Build: `npm run build` -> dist/ with compiled server + static frontend

## User Preferences
- Language: Italian for communication
- Mobile-first UX, thumb-zone accessibility
- Solana Seeker as primary target device
