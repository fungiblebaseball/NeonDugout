# Player Seed — Technical Reference

## Roster Structure (20 per team)

| Slot | Positions | Notes |
|------|-----------|-------|
| 0–4 | P | 5 pitchers |
| 5 | C | Primary catcher |
| 6 | C / 1B | Utility catcher |
| 7–11 | 1B, 2B, 3B, SS, 2B/SS | Infield |
| 12–15 | LF, CF, RF, LF/RF | Outfield |
| 16–17 | 1B/DH, 3B/1B | Corner utility |
| 18 | CF/LF/RF | Outfield utility |
| 19 | C | Backup catcher |

Multi-position players can be assigned to any of their listed positions.

## Stat Generation Algorithm

- **Method**: Gaussian distribution via Box-Muller transform
- **Base range**: 30–85 (bell curve centered ~57)
- **Hard cap**: clamped to 1–100
- **Recursion**: values outside [0, 1] normalized range are re-rolled

## Talent Tiers

| Tier | Roster indices | Modifier | Effective range |
|------|---------------|----------|-----------------|
| Star | 3, 8 | +15 | ~45–100 |
| Regular | 0–2, 4–7, 9–17 | 0 | ~30–85 |
| Scrub | 18, 19 | −15 | ~15–70 |

2 stars + 16 regulars + 2 scrubs = balanced meritocratic roster per team.

## Pitcher vs Position Player

| Category | Pitchers (pos P) | Position players |
|----------|------------------|-----------------|
| Batting stats (POW, CON, SPD, EYE) | Gaussian 30–85 + tier | Gaussian 30–85 + tier |
| Pitching stats (VEL, CTL, MOV, STA) | Gaussian 30–85 + tier | Uniform random 1–20 |
| DEF | Gaussian 30–85 + tier | Gaussian 30–85 + tier |

## Attributes Reference

| Attr | Full name | Category | Matchup weight | Gameplay effect |
|------|-----------|----------|---------------|-----------------|
| POW | Power | Batting | 0.25 | HR/extra-base hit probability |
| CON | Contact | Batting | 0.30 | Put-ball-in-play rate (highest weight) |
| SPD | Speed | Batting | 0.15 | Stolen bases, extra bases on hits, DP avoidance |
| EYE | Eye | Batting | 0.20 | Walk probability, pitch selection |
| VEL | Velocity | Pitching | 0.30 | Strikeout power (highest pitcher weight) |
| CTL | Control | Pitching | 0.25 | Walk prevention, pitch accuracy |
| MOV | Movement | Pitching | 0.25 | Weak contact, ground balls |
| STA | Stamina | Pitching | — | Fatigue penalty: `(inning − 5) × (100 − STA) × 0.04` after 5th |
| DEF | Defense | Fielding | — | Zone coverage (infield/outfield), DP turn rate, error reduction |

**Matchup formula**: `batterScore − pitcherScore + fatiguePenalty + homeAdvantage(8)`

## Source Files

| File | Role |
|------|------|
| `server/seed.ts` | Initial seed (L1 + L2, 40 teams, 800 players) |
| `server/expansion.ts` | Dynamic leagues (L3+, identical algorithm) |
| `client/src/lib/calculations/matchup.ts` | Matchup rating formula, DP/defense calculations |
| `shared/schema.ts` | `players` table schema (9 integer attributes) |
