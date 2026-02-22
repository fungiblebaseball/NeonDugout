# Gridiron Ghosts

## Overview
Text-based fantasy baseball manager game with retro 80s/90s cyberpunk aesthetic. Target platform: Solana Seeker mobile (Web3 integration planned). Zero MLB licenses - all fictional teams and players.

## Current State
Full-stack application with PostgreSQL backend, Express API, and React frontend. Version 0.7 — Schedule + Pitcher Roles rework complete.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, Zustand (state), wouter (routing), TanStack Query (API)
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed on Replit)
- **Design**: Neon pink/cyan palette, Orbitron/VT323/Press Start 2P fonts, mobile-first bottom nav

## Key Files
- `shared/schema.ts` - Drizzle schema: users, teams, players, matches, lineups, pitcher_rotations (with roles JSONB), tactics
- `server/routes.ts` - API routes (/api/auth/connect, /api/teams, /api/matches, /api/lineup, /api/pitcher-rotation, /api/tactics)
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/seed.ts` - Seeds 20 teams (10 per division), 400 players, round-robin schedule (90 matches per division, 18 days)
- `server/db.ts` - Database connection pool
- `client/src/lib/store.ts` - Zustand store with wallet connect -> API call flow
- `client/src/pages/` - Home, LineupPage, PitchersPage, AttackPage, DefensePage, SimulationPage, SchedulePage
- `client/src/lib/calculations/` - Pure simulation engine (matchup, probability, simulate, rng, flavor, types)
- `client/src/components/Navigation.tsx` - Bottom nav (6 items: Hub, Lineup, Pitch, ATK, DEF, Sched)

## Database Tables
- `users` - wallet-based auth (id, wallet_address, team_id)
- `teams` - 20 teams in divisions A & B (id, name, division, owner_wallet, season_id)
- `players` - 20 per team with 9 stats (pow, con, spd, eye, vel, ctl, mov, sta, def)
- `matches` - round-robin schedule with scores (90 per division, 18 days)
- `lineups` - field positions + batting order (JSON columns)
- `pitcher_rotations` - roles JSONB {sp, r1, closer, nextSp} + rotation_order + switch conditions (max pitches/innings/BB/ER)
- `tactics` - attack style + infield/outfield positioning

## Pages
1. **Home** (/) - Connect wallet, team dashboard, nav grid to all pages
2. **Lineup** (/lineup) - Assign field positions (SP shown dynamically from pitching staff, C,1B...RF), reorder batting order 1-9
3. **Pitchers** (/pitchers) - Assign pitcher roles: SP (Starting Pitcher), R1 (Relief 1), C (Closer), 2P (Next Starter auto-rotated). Configure SP switch conditions via sliders
4. **Attack** (/attack) - Choose offensive strategy: bunt, hit-and-run, neutral, swing-on-sight
5. **Defense** (/defense) - Set infield positioning (short/neutral/deep) + outfield positioning
6. **Simulate** (/simulate) - Exhibition test match with box score, batter/pitcher stats, flavor text
7. **Schedule** (/schedule) - Division calendar (18 match days), next match highlight, W-L record, full results

## Pitcher Roles System
- SP: Starting Pitcher for current game (shown in Lineup as position "SP")
- R1: Relief 1 (first reliever when SP is pulled)
- C: Closer (9th inning / save situations)
- 2P: Next game starter (auto-rotated after game)
- Switch conditions apply to SP: maxPitches, maxInnings, maxBB, maxER
- Lineup page reads SP from pitcher rotation data and auto-assigns P position

## Design Decisions
- Meritocratic divisions: all teams generated with same attribute ranges (30-85 gaussian)
- Zustand with localStorage persistence for dev convenience, API calls for real data
- Bottom nav with 6 items: Hub, Lineup, Pitch, ATK, DEF, Sched
- Batch processor planned for daily match simulation at 00:00 CET
- Pitcher position in Lineup is read-only, driven by Pitching Staff page

## Deployment
- Development: Replit (port 5000)
- Production: Contabo VPS (see BACKEND_PREREQUISITES.md)
- Build: `npm run build` -> dist/ with compiled server + static frontend

## User Preferences
- Language: Italian for communication
- Mobile-first UX, thumb-zone accessibility
- Solana Seeker as primary target device
