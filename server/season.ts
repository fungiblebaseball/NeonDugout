import { db } from "./db";
import { teams, matches, matchDetails } from "@shared/schema";
import { storage } from "./storage";
import { eq } from "drizzle-orm";

function generateRegularSchedule(teamIds: number[], division: string, seasonId: number, startDate: Date): { matches: any[], nextDate: Date } {
  const n = teamIds.length;
  const allMatches: any[] = [];
  const currentDate = new Date(startDate);

  for (let round = 0; round < 5; round++) {
    for (let i = 0; i < n / 2; i++) {
      let homeIdx = (round + i) % (n - 1);
      let awayIdx = (n - 1 - i + round) % (n - 1);
      if (i === 0) awayIdx = n - 1;

      allMatches.push({
        seasonId,
        division,
        day: round + 1,
        matchDate: currentDate.toISOString().split('T')[0],
        homeTeamId: teamIds[homeIdx],
        awayTeamId: teamIds[awayIdx],
        played: false,
        matchType: "regular",
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { matches: allMatches, nextDate: currentDate };
}

function generateReturnSchedule(teamIds: number[], division: string, seasonId: number, regularMatches: any[], startDate: Date): { matches: any[], nextDate: Date } {
  const allMatches: any[] = [];
  const currentDate = new Date(startDate);

  const dayGroups: Map<number, any[]> = new Map();
  for (const m of regularMatches) {
    const day = m.day;
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(m);
  }

  const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedDays.length; i++) {
    const origDay = sortedDays[i];
    const returnDay = 8 + i;
    for (const m of dayGroups.get(origDay)!) {
      allMatches.push({
        seasonId,
        division,
        day: returnDay,
        matchDate: currentDate.toISOString().split('T')[0],
        homeTeamId: m.awayTeamId,
        awayTeamId: m.homeTeamId,
        played: false,
        matchType: "regular",
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { matches: allMatches, nextDate: currentDate };
}

function generateInterleagueSchedule(
  seriesATeamsL1: number[], seriesATeamsL2: number[],
  seriesBTeamsL1: number[], seriesBTeamsL2: number[],
  seasonId: number, startDate: Date
): { matches: any[], nextDate: Date } {
  const allMatches: any[] = [];
  const currentDate = new Date(startDate);

  for (let leg = 0; leg < 2; leg++) {
    const day = 6 + leg;

    for (let i = 0; i < 5; i++) {
      const idxA = i % seriesATeamsL1.length;
      const idxB = (i + leg) % seriesATeamsL2.length;
      const home = leg === 0 ? seriesATeamsL1[idxA] : seriesATeamsL2[idxB];
      const away = leg === 0 ? seriesATeamsL2[idxB] : seriesATeamsL1[idxA];
      allMatches.push({
        seasonId,
        division: "interleague_A",
        day,
        matchDate: currentDate.toISOString().split('T')[0],
        homeTeamId: home,
        awayTeamId: away,
        played: false,
        matchType: "interleague",
      });
    }

    for (let i = 0; i < 5; i++) {
      const idxA = i % seriesBTeamsL1.length;
      const idxB = (i + leg) % seriesBTeamsL2.length;
      const home = leg === 0 ? seriesBTeamsL1[idxA] : seriesBTeamsL2[idxB];
      const away = leg === 0 ? seriesBTeamsL2[idxB] : seriesBTeamsL1[idxA];
      allMatches.push({
        seasonId,
        division: "interleague_B",
        day,
        matchDate: currentDate.toISOString().split('T')[0],
        homeTeamId: home,
        awayTeamId: away,
        played: false,
        matchType: "interleague",
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { matches: allMatches, nextDate: currentDate };
}

function generatePlayoffPlaceholders(seasonId: number, startDate: Date): { matches: any[], nextDate: Date } {
  const allMatches: any[] = [];
  const currentDate = new Date(startDate);

  for (let leg = 0; leg < 2; leg++) {
    const day = 13 + leg;

    for (const league of ["L1", "L2"]) {
      for (let i = 0; i < 2; i++) {
        allMatches.push({
          seasonId,
          division: `playoff_${league}`,
          day,
          matchDate: currentDate.toISOString().split('T')[0],
          homeTeamId: 0,
          awayTeamId: 0,
          played: false,
          matchType: "playoff",
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { matches: allMatches, nextDate: currentDate };
}

export async function applyPromotionRelegation(): Promise<void> {
  const allMatches = await storage.getAllMatches();
  const allTeams = await storage.getTeams();

  for (const league of ['L1', 'L2']) {
    const playoffDay14 = allMatches.filter(m =>
      m.matchType === 'playoff' && m.day === 14 && m.division === `playoff_${league}` && m.played
    );

    if (playoffDay14.length < 2) continue;

    const winnersMatch = playoffDay14[0];
    const losersMatch = playoffDay14[1];

    const finalWinner1 = (winnersMatch.homeScore ?? 0) > (winnersMatch.awayScore ?? 0) ? winnersMatch.homeTeamId : winnersMatch.awayTeamId;
    const finalWinner2 = (winnersMatch.homeScore ?? 0) > (winnersMatch.awayScore ?? 0) ? winnersMatch.awayTeamId : winnersMatch.homeTeamId;
    const finalLoser1 = (losersMatch.homeScore ?? 0) > (losersMatch.awayScore ?? 0) ? losersMatch.awayTeamId : losersMatch.homeTeamId;
    const finalLoser2 = (losersMatch.homeScore ?? 0) > (losersMatch.awayScore ?? 0) ? losersMatch.homeTeamId : losersMatch.awayTeamId;

    const promoted = [finalWinner1, finalWinner2];
    const relegated = [finalLoser1, finalLoser2];

    for (const teamId of promoted) {
      const team = allTeams.find(t => t.id === teamId);
      if (team && team.series === 'B') {
        await storage.updateTeamDivision(teamId, 'A', `${league}A`);
      }
    }
    for (const teamId of relegated) {
      const team = allTeams.find(t => t.id === teamId);
      if (team && team.series === 'A') {
        await storage.updateTeamDivision(teamId, 'B', `${league}B`);
      }
    }
  }
}

export async function generateNewSeason(): Promise<{ seasonId: number; matchCount: number }> {
  await applyPromotionRelegation();

  const allTeams = await storage.getTeams();
  const currentSeasonId = Math.max(...allTeams.map(t => t.seasonId));
  const newSeasonId = currentSeasonId + 1;

  await db.update(teams).set({ seasonId: newSeasonId });

  const createdTeams: Record<string, Record<string, number[]>> = { L1: { A: [], B: [] }, L2: { A: [], B: [] } };
  const freshTeams = await storage.getTeams();
  for (const t of freshTeams) {
    createdTeams[t.league][t.series].push(t.id);
  }

  const allScheduleMatches: any[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  for (const league of ["L1", "L2"]) {
    for (const series of ["A", "B"]) {
      const division = `${league}${series}`;
      const teamIds = createdTeams[league][series];

      const { matches: regularMatches } = generateRegularSchedule(teamIds, division, newSeasonId, startDate);
      allScheduleMatches.push(...regularMatches);

      const returnStart = new Date(startDate);
      returnStart.setDate(returnStart.getDate() + 7);
      const { matches: returnMatches } = generateReturnSchedule(teamIds, division, newSeasonId, regularMatches, returnStart);
      allScheduleMatches.push(...returnMatches);
    }
  }

  const interleagueStart = new Date(startDate);
  interleagueStart.setDate(interleagueStart.getDate() + 5);
  const { matches: interleagueMatches } = generateInterleagueSchedule(
    createdTeams.L1.A, createdTeams.L2.A,
    createdTeams.L1.B, createdTeams.L2.B,
    newSeasonId, interleagueStart
  );
  allScheduleMatches.push(...interleagueMatches);

  const playoffStart = new Date(startDate);
  playoffStart.setDate(playoffStart.getDate() + 12);
  const { matches: playoffMatches } = generatePlayoffPlaceholders(newSeasonId, playoffStart);
  allScheduleMatches.push(...playoffMatches);

  for (let i = 0; i < allScheduleMatches.length; i += 50) {
    await db.insert(matches).values(allScheduleMatches.slice(i, i + 50));
  }

  console.log(`New season ${newSeasonId}: ${allScheduleMatches.length} matches generated`);
  return { seasonId: newSeasonId, matchCount: allScheduleMatches.length };
}
