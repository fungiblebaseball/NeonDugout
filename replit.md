# Gridiron Ghosts

## Overview
Text-based fantasy baseball manager game with retro 80s/90s cyberpunk aesthetic. Target platform: Solana Seeker mobile (Web3 integration planned). Zero MLB licenses - all fictional teams and players.

## Current State
Full-stack application with PostgreSQL backend, Express API, and React frontend.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, Zustand (state), wouter (routing), TanStack Query (API)
- **Backend**: Express.js, Drizzle ORM, PostgreSQL (Neon-backed on Replit)
- **Design**: Neon pink/cyan palette, Orbitron/VT323/Press Start 2P fonts, mobile-first bottom nav

## Key Files
- `shared/schema.ts` - Drizzle schema: users, teams, players, matches, lineups, pitcher_rotations, tactics
- `server/routes.ts` - API routes (/api/auth/connect, /api/teams, /api/lineup, /api/pitcher-rotation, /api/tactics)
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/seed.ts` - Seeds 20 teams (10 per division), 400 players, round-robin schedule
- `server/db.ts` - Database connection pool
- `client/src/lib/store.ts` - Zustand store with wallet connect → API call flow
- `client/src/pages/` - Home, LineupPage, PitchersPage, AttackPage, DefensePage

## Database Tables
- `users` - wallet-based auth (id, wallet_address, team_id)
- `teams` - 20 teams in divisions A & B (id, name, division, owner_wallet)
- `players` - 20 per team with 9 stats (pow, con, spd, eye, vel, ctl, mov, sta, def)
- `matches` - round-robin schedule with scores
- `lineups` - field positions + batting order (JSON columns)
- `pitcher_rotations` - rotation order + switch conditions (max pitches/innings/BB/ER)
- `tactics` - attack style + infield/outfield positioning

## Pages
1. **Home** (/) - Connect wallet, team dashboard, nav grid to all pages
2. **Lineup** (/lineup) - Assign field positions (P,C,1B...RF), reorder batting order 1-9
3. **Pitchers** (/pitchers) - Set pitcher rotation order, configure switch conditions via sliders
4. **Attack** (/attack) - Choose offensive strategy: bunt, hit-and-run, neutral, swing-on-sight
5. **Defense** (/defense) - Set infield positioning (short/neutral/deep) + outfield positioning

## Design Decisions
- Meritocratic divisions: all teams generated with same attribute ranges (30-85 gaussian)
- Zustand with localStorage persistence for dev convenience, API calls for real data
- Bottom nav with 5 items: Hub, Lineup, Pitch, ATK, DEF
- Batch processor planned for daily match simulation at 00:00 CET

## Deployment
- Development: Replit (port 5000)
- Production: Contabo VPS (see BACKEND_PREREQUISITES.md)
- Build: `npm run build` → dist/ with compiled server + static frontend

## User Preferences
- Language: Italian for communication
- Mobile-first UX, thumb-zone accessibility
- Solana Seeker as primary target device
