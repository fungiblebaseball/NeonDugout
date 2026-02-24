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
| Batting stats (POW, CON, EYE) | Gaussian 30–85 + tier | Gaussian 30–85 + tier |
| Pitching stats (VEL, CTL, MOV) | Gaussian 30–85 + tier | Uniform random 1–20 |
| Crossing stats (SPD, STA) | Gaussian 30–85 + tier | Gaussian 30–85 + tier |
| DEF | Gaussian 30–85 + tier | Gaussian 30–85 + tier |

## Display Groups (Player Card)

9 DB attributes are displayed in context-dependent groups with dual labels:

| Group | Color | Attrs | Card labels | Shown |
|-------|-------|-------|-------------|-------|
| OFFENSE | Pink | pow, con, eye | POWER, CONTACT, EYE | All |
| DEFENSE | Green | def, spd, eye, vel | GLOVE 🧤, RANGE 🏃‍♂️, REACTION 👁️, ARM 💪 | All |
| PITCHING | Cyan | vel, ctl, mov | VELOCITY, CONTROL, MOVEMENT | Pitchers only |
| CROSSING | Amber | spd, sta | SPEED ⚡, STAMINA 🔋 | All |

SPD and STA are **crossing attributes** — they affect all three categories (offense, defense, pitching). EYE and VEL appear in both their primary group and DEFENSE with different labels.

## Attributes Reference

| Attr | Full name | Def alias | Matchup weight | Gameplay effect |
|------|-----------|-----------|---------------|-----------------|
| POW | Power | — | Bat 0.25 | HR/extra-base hit probability |
| CON | Contact | — | Bat 0.30 | Put-ball-in-play rate (highest weight) |
| EYE | Eye | Reaction 👁️ | Bat 0.20 | Walk probability + defensive reads |
| SPD | Speed | Range 🏃‍♂️ | Bat 0.15 | Baserunning + fielding range + DP avoidance |
| VEL | Velocity | Arm 💪 | Pit 0.30 | Strikeout power + throwing arm strength |
| CTL | Control | — | Pit 0.25 | Walk prevention, pitch accuracy |
| MOV | Movement | — | Pit 0.25 | Weak contact, ground balls |
| STA | Stamina | — | Crossing | Fatigue: `(inn−5) × (100−STA) × 0.04` after 5th |
| DEF | Defense | Glove 🧤 | — | Zone coverage, DP turn rate, error reduction |

**Matchup formula**: `batterScore − pitcherScore + fatiguePenalty + homeAdvantage(8)`

## Source Files

| File | Role |
|------|------|
| `server/seed.ts` | Initial seed (L1 + L2, 40 teams, 800 players) |
| `server/expansion.ts` | Dynamic leagues (L3+, identical algorithm) |
| `client/src/lib/calculations/matchup.ts` | Matchup rating formula, DP/defense calculations |
| `shared/schema.ts` | `players` table schema (9 integer attributes) |
