# Neon Dugout — Tutorial System

## Overview

The tutorial system guides new players through the game with two layers:

1. **Onboarding Modal** — A 5-slide full-screen walkthrough shown once after the player's first login.
2. **Page Tips** — One-time contextual tooltips shown the first time a player visits each page (after completing the onboarding).

Players can replay the entire tutorial at any time from the Team page.

---

## Onboarding Slides

| # | Title | Content |
|---|-------|---------|
| 1 | Welcome to Neon Dugout! | You don't need to play every day. Claim tokens periodically, train with minigames, and watch your squad grow over time. Even casual managers can build a championship team. |
| 2 | Your Home Base | The Hub shows your last match result at the top and the next match preview below. The red countdown timer shows when the next game starts. Matches run automatically every day — no action needed. |
| 3 | Build Your Strategy | Set your Lineup, configure your Pitching staff, and tune Attack/Defense tactics. Your team plays with these settings each game day. Adjust them anytime before the next match. |
| 4 | Training & Growth | Play minigames to boost your players' stats during the season. At season end, part of those training boosts become permanent — your squad gets stronger over time. |
| 5 | The Market | Buy and sell players with tokens on the marketplace. You can also purchase tokens with SOL directly from your wallet. Build your dream roster. |

Navigation: Back / Next buttons, dot indicators, Skip (X) button. Final slide shows "GOT IT" to complete.

---

## Page Tips

Each page shows a brief tooltip on the player's first visit (after onboarding is complete). The tip auto-dismisses after 8 seconds or can be closed manually.

| Page | Route | Tip Message |
|------|-------|-------------|
| Home | `/` | This is your command center. Check match results and prepare for the next game. |
| Lineup | `/lineup` | Drag players to set field positions and batting order. SP is set in Pitchers page. |
| Pitchers | `/pitchers` | Assign pitcher roles (SP, R1, Closer) and set switch conditions for each. |
| Attack | `/attack` | Set batter approach, attack style, and offensive strategy with mid-game switching. |
| Defense | `/defense` | Configure infield/outfield positioning and defensive setup. |
| Training | `/training` | Play minigames to boost player stats. Rewards depend on your score. |
| Team | `/team` | View your roster, claim tokens, buy players, and manage your team. |
| Market | `/market` | Browse and buy free agents or players listed by other managers. |
| Schedule | `/schedule` | Your division calendar. Tap played matches to see full reports. |
| Standings | `/standings` | Division rankings. Navigate between seasons to see historical results. |

---

## Replay Tutorial

A "REPLAY TUTORIAL" button is available on the Team page. Pressing it:
- Resets `tutorialCompleted` to `false`
- Clears all `seenPageTips`
- Immediately shows the onboarding modal again
- Page tips will re-appear on each page's next visit

---

## Technical Details

### State Management
Tutorial state is managed in the zustand store (`client/src/lib/store.ts`) and persisted to localStorage under the `neon-dugout-v1` key.

Fields:
- `tutorialCompleted: boolean` — Whether the player has finished the onboarding slides
- `seenPageTips: string[]` — Array of route strings where the page tip was already shown
- `showTutorial: boolean` — Controls the onboarding modal visibility (not persisted)

### Components
- `client/src/components/TutorialModal.tsx` — Full-screen onboarding modal with 5 slides
- `client/src/components/PageTip.tsx` — Per-page contextual tooltip with auto-dismiss

### Flow
1. Player logs in via wallet signature
2. If `tutorialCompleted === false`, `showTutorial` is set to `true`
3. `TutorialModal` renders over the app (z-index 9999)
4. Player navigates slides and clicks "GOT IT" on the last one
5. `markTutorialComplete()` sets `tutorialCompleted = true`, `showTutorial = false`
6. As the player visits each page, `PageTip` shows once (if route not in `seenPageTips`)
7. On dismiss or auto-expire, `markPageTipSeen(route)` adds the route to the seen list
