import cron from "node-cron";
import { simulateMatchDay, updatePlayoffMatchups } from "./simulation";
import { generateNewSeason } from "./season";
import { storage } from "./storage";
import { log } from "./index";

let schedulerStarted = false;

export function startGameDayScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  cron.schedule("0 23 * * *", async () => {
    log("Scheduled game day simulation triggered (00:00 CET / 23:00 UTC)", "scheduler");

    try {
      const allMatches = await storage.getAllMatches();
      const unplayedDays = [...new Set(allMatches.filter(m => !m.played).map(m => m.day))].sort((a, b) => a - b);

      if (unplayedDays.length === 0) {
        log("Season complete — auto-generating new season...", "scheduler");
        try {
          const result = await generateNewSeason();
          log(`New season ${result.seasonId} auto-generated: ${result.matchCount} matches`, "scheduler");
        } catch (err) {
          log(`Auto new season failed: ${err}`, "scheduler");
          console.error("Auto new season error:", err);
        }
        return;
      }

      const nextDay = unplayedDays[0];
      log(`Simulating day ${nextDay}...`, "scheduler");

      if (nextDay >= 13) {
        await updatePlayoffMatchups();
        log("Playoff matchups updated", "scheduler");
      }

      const results = await simulateMatchDay(nextDay);
      log(`Day ${nextDay} complete: ${results.length} matches simulated`, "scheduler");
    } catch (err) {
      log(`Scheduled simulation failed: ${err}`, "scheduler");
      console.error("Scheduled game day simulation error:", err);
    }
  }, {
    timezone: "UTC",
  });

  log("Game day scheduler started — runs daily at 00:00 CET (23:00 UTC)", "scheduler");
}
