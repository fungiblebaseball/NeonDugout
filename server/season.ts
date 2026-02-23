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

function generateIntraLeagueInterleague(
  league: string,
  seriesPairs: { seriesA: string; teamsA: number[]; seriesB: string; teamsB: number[] }[],
  seasonId: number, startDate: Date
): { matches: any[] } {
  const allMatches: any[] = [];

  for (const pair of seriesPairs) {
    for (let leg = 0; leg < 2; leg++) {
      const day = 6 + leg;
      const dateStr = new Date(startDate.getTime() + leg * 86400000).toISOString().split('T')[0];
      const matchCount = Math.min(pair.teamsA.length, pair.teamsB.length, 5);

      for (let i = 0; i < matchCount; i++) {
        const idxA = i % pair.teamsA.length;
        const idxB = (i + leg) % pair.teamsB.length;
        const home = leg === 0 ? pair.teamsA[idxA] : pair.teamsB[idxB];
        const away = leg === 0 ? pair.teamsB[idxB] : pair.teamsA[idxA];
        allMatches.push({
          seasonId,
          division: `interleague_${league}_${pair.seriesA}${pair.seriesB}`,
          day,
          matchDate: dateStr,
          homeTeamId: home,
          awayTeamId: away,
          played: false,
          matchType: "interleague",
        });
      }
    }
  }

  return { matches: allMatches };
}

function generatePlayoffPlaceholders(
  leagues: string[],
  seasonId: number,
  startDate: Date
): { matches: any[], nextDate: Date } {
  const allMatches: any[] = [];
  const currentDate = new Date(startDate);

  for (let leg = 0; leg < 2; leg++) {
    const day = 13 + leg;

    for (const league of leagues) {
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

    for (let leagueIdx = 0; leagueIdx < leagues.length - 1; leagueIdx++) {
      const upperLeague = leagues[leagueIdx];
      const lowerLeague = leagues[leagueIdx + 1];
      for (let i = 0; i < 2; i++) {
        allMatches.push({
          seasonId,
          division: `promo_${lowerLeague}_to_${upperLeague}`,
          day,
          matchDate: currentDate.toISOString().split('T')[0],
          homeTeamId: 0,
          awayTeamId: 0,
          played: false,
          matchType: "promotion",
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

  const leagues = Array.from(new Set(allTeams.map(t => t.league)))
    .sort((a, b) => (parseInt(a.replace('L', '')) || 0) - (parseInt(b.replace('L', '')) || 0));

  for (const league of leagues) {
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

    const leagueSeries = Array.from(new Set(allTeams.filter(t => t.league === league).map(t => t.series))).sort();
    const topSeries = leagueSeries[0];
    const bottomSeries = leagueSeries[leagueSeries.length - 1];

    for (const teamId of promoted) {
      const team = allTeams.find(t => t.id === teamId);
      if (team && team.series === bottomSeries) {
        await storage.updateTeamDivision(teamId, topSeries, `${league}${topSeries}`);
      }
    }
    for (const teamId of relegated) {
      const team = allTeams.find(t => t.id === teamId);
      if (team && team.series === topSeries) {
        await storage.updateTeamDivision(teamId, bottomSeries, `${league}${bottomSeries}`);
      }
    }
  }

  for (let i = 0; i < leagues.length - 1; i++) {
    const upperLeague = leagues[i];
    const lowerLeague = leagues[i + 1];

    const promoDay14 = allMatches.filter(m =>
      m.matchType === 'promotion' && m.day === 14 &&
      m.division === `promo_${lowerLeague}_to_${upperLeague}` && m.played
    );

    if (promoDay14.length < 2) continue;

    const match1 = promoDay14[0];
    const match2 = promoDay14[1];

    const winner1 = (match1.homeScore ?? 0) > (match1.awayScore ?? 0) ? match1.homeTeamId : match1.awayTeamId;
    const loser1 = (match1.homeScore ?? 0) > (match1.awayScore ?? 0) ? match1.awayTeamId : match1.homeTeamId;
    const winner2 = (match2.homeScore ?? 0) > (match2.awayScore ?? 0) ? match2.homeTeamId : match2.awayTeamId;
    const loser2 = (match2.homeScore ?? 0) > (match2.awayScore ?? 0) ? match2.awayTeamId : match2.homeTeamId;

    const winners = [winner1, winner2];
    const losers = [loser1, loser2];

    const upperSeries = Array.from(new Set(allTeams.filter(t => t.league === upperLeague).map(t => t.series))).sort();
    const lowerSeries = Array.from(new Set(allTeams.filter(t => t.league === lowerLeague).map(t => t.series))).sort();
    const upperBottomSeries = upperSeries[upperSeries.length - 1];
    const lowerTopSeries = lowerSeries[0];

    for (const teamId of winners) {
      const team = allTeams.find(t => t.id === teamId);
      if (team && team.league === lowerLeague) {
        await storage.updateTeamLeague(teamId, upperLeague, upperBottomSeries, `${upperLeague}${upperBottomSeries}`);
      }
    }
    for (const teamId of losers) {
      const team = allTeams.find(t => t.id === teamId);
      if (team && team.league === upperLeague) {
        await storage.updateTeamLeague(teamId, lowerLeague, lowerTopSeries, `${lowerLeague}${lowerTopSeries}`);
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

  const freshTeams = await storage.getTeams();

  const leagueMap: Record<string, Record<string, number[]>> = {};
  for (const t of freshTeams) {
    if (!leagueMap[t.league]) leagueMap[t.league] = {};
    if (!leagueMap[t.league][t.series]) leagueMap[t.league][t.series] = [];
    leagueMap[t.league][t.series].push(t.id);
  }

  const leagues = Object.keys(leagueMap).sort(
    (a, b) => (parseInt(a.replace('L', '')) || 0) - (parseInt(b.replace('L', '')) || 0)
  );

  const allScheduleMatches: any[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  for (const league of leagues) {
    const seriesKeys = Object.keys(leagueMap[league]).sort();

    for (const series of seriesKeys) {
      const division = `${league}${series}`;
      const teamIds = leagueMap[league][series];

      const { matches: regularMatches } = generateRegularSchedule(teamIds, division, newSeasonId, startDate);
      allScheduleMatches.push(...regularMatches);

      const returnStart = new Date(startDate);
      returnStart.setDate(returnStart.getDate() + 7);
      const { matches: returnMatches } = generateReturnSchedule(teamIds, division, newSeasonId, regularMatches, returnStart);
      allScheduleMatches.push(...returnMatches);
    }

    const seriesKeys2 = Object.keys(leagueMap[league]).sort();
    if (seriesKeys2.length >= 2) {
      const pairs: { seriesA: string; teamsA: number[]; seriesB: string; teamsB: number[] }[] = [];
      for (let s = 0; s < seriesKeys2.length - 1; s++) {
        pairs.push({
          seriesA: seriesKeys2[s],
          teamsA: leagueMap[league][seriesKeys2[s]],
          seriesB: seriesKeys2[s + 1],
          teamsB: leagueMap[league][seriesKeys2[s + 1]],
        });
      }
      const interleagueStart = new Date(startDate);
      interleagueStart.setDate(interleagueStart.getDate() + 5);
      const { matches: interleagueMatches } = generateIntraLeagueInterleague(league, pairs, newSeasonId, interleagueStart);
      allScheduleMatches.push(...interleagueMatches);
    }
  }

  const playoffStart = new Date(startDate);
  playoffStart.setDate(playoffStart.getDate() + 12);
  const { matches: playoffMatches } = generatePlayoffPlaceholders(leagues, newSeasonId, playoffStart);
  allScheduleMatches.push(...playoffMatches);

  for (let i = 0; i < allScheduleMatches.length; i += 50) {
    await db.insert(matches).values(allScheduleMatches.slice(i, i + 50));
  }

  console.log(`New season ${newSeasonId}: ${allScheduleMatches.length} matches generated`);
  return { seasonId: newSeasonId, matchCount: allScheduleMatches.length };
}
