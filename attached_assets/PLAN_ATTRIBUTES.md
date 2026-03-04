# PLAN_ATTRIBUTES — Defense Attribute Rework + Crossing Attributes

## Objective
Introduce a 4-attribute DEFENSE group on player cards by re-labeling existing DB values in defensive context. Add a CROSSING section for attributes that apply across all categories. No DB or simulation code changes — display-only rework on PlayerDetailPage + doc updates.

**New defensive labels** (same DB columns):
- DEF → Glove 🧤
- SPD → Range 🏃‍♂️
- EYE → Reaction 👁️
- VEL → Arm 💪

**Crossing attributes** (apply to all 3 categories):
- SPD (Speed) — baserunning (offense), range (defense), fatigue recovery (pitching)
- STA (Stamina) — endurance at plate (offense), staying sharp late (defense), pitch count durability (pitching)

**Card sections** become:
1. OFFENSE (pink): POW, CON, EYE — 3 bars
2. DEFENSE (green): Glove 🧤, Range 🏃‍♂️, Reaction 👁️, Arm 💪 — 4 bars
3. PITCHING (cyan): VEL, CTL, MOV — pitchers only, 3 bars
4. CROSSING (yellow/amber): SPD ⚡, STA 🔋 — all players, 2 bars

**Averages** updated:
- BAT AVG = (POW + CON + EYE) / 3
- DEF AVG = (DEF + SPD + EYE + VEL) / 4 — always shown
- PITCH AVG = (VEL + CTL + MOV) / 3 — pitchers only
- OVERALL = all 9 / 9 (unchanged)

## Tasks

### T001: Update PlayerDetailPage — stat sections and labels
- **Blocked By**: []
- **Details**:
  - Add defense-context label map for the DEFENSE section
  - Change attribute sections layout:
    1. **OFFENSE** (pink): pow, con, eye — labels: POWER, CONTACT, EYE
    2. **DEFENSE** (green): def, spd, eye, vel — labels: GLOVE 🧤, RANGE 🏃‍♂️, REACTION 👁️, ARM 💪
    3. **PITCHING** (cyan): vel, ctl, mov — **only if player is a pitcher** (positions includes 'P')
    4. **CROSSING** (yellow/amber): spd, sta — all players — labels: SPEED ⚡, STAMINA 🔋
  - Update summary averages:
    - OVERALL: keep current (all 9 / 9)
    - BAT AVG: (pow + con + eye) / 3
    - DEF AVG (new): (def + spd + eye + vel) / 4 — always shown
    - PITCH AVG: (vel + ctl + mov) / 3 — only for pitchers
  - Do NOT modify any simulation, matchup, seed, or backend code
  - Files: `client/src/pages/PlayerDetailPage.tsx`
  - Acceptance: player card shows 3 sections for hitters (offense + defense + crossing), 4 for pitchers (+ pitching). Defense has 4 bars with emoji labels. Crossing always shows SPD + STA.

### T002: Update Player_SEED.md
- **Blocked By**: [T001]
- **Details**:
  - Add "Display Groups" section explaining the dual-context attribute mapping and crossing concept
  - Update Attributes Reference table with defense-context aliases and crossing marker
  - Keep document within 1-page length
  - Files: `Player_SEED.md`
  - Acceptance: document reflects new groups, dual labels, and crossing attributes

### T003: Update CHANGELOG.md
- **Blocked By**: [T001]
- **Details**:
  - Add v1.7.0 entry for Defense Attribute Rework + Crossing Attributes
  - Document: new defense group (4 attributes), crossing section (SPD + STA), dual-context labels, player card sections, conditional pitching section
  - Files: `CHANGELOG.md`
  - Acceptance: entry added at top of changelog

### T004: Update replit.md
- **Blocked By**: [T001]
- **Details**:
  - Update Player Detail page description to reflect new sections
  - Update version number to 1.7.0
  - Add crossing attributes concept to design decisions
  - Files: `replit.md`
  - Acceptance: replit.md reflects current state
