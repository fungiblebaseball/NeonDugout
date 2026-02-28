import { db, pool } from "./db";
import { teams, players, matches } from "@shared/schema";
import { sql } from "drizzle-orm";
import { generateUniqueName, generateUniqueTeamName } from "./names";

const EXPANSION_LOCK_ID = 424242;

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function gaussianRand(min: number, max: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5;
  if (num > 1 || num < 0) return gaussianRand(min, max);
  return Math.floor(num * (max - min) + min);
}

type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';

function generatePlayersForTeam(teamId: number, usedNames: Set<string>) {
  const positionSets: Position[][] = [
    ['P'], ['P'], ['P'], ['P'], ['P'],
    ['C'], ['C', '1B'],
    ['1B'], ['2B'], ['3B'], ['SS'], ['2B', 'SS'],
    ['LF'], ['CF'], ['RF'], ['LF', 'RF'],
    ['1B', 'DH'], ['3B', '1B'], ['CF', 'LF', 'RF'], ['C']
  ];

  return positionSets.map((pos, i) => {
    const isPitcher = pos.includes('P');
    const isStar = i === 3 || i === 8;
    const isScrub = !isStar && (i === 18 || i === 19);
    const modifier = isStar ? 15 : (isScrub ? -15 : 0);
    const getStat = () => Math.max(1, Math.min(100, gaussianRand(30, 85) + modifier));

    return {
      name: generateUniqueName(usedNames),
      teamId,
      positions: pos,
      pow: getStat(),
      con: getStat(),
      spd: getStat(),
      eye: getStat(),
      vel: isPitcher ? getStat() : rand(1, 20),
      ctl: isPitcher ? getStat() : rand(1, 20),
      mov: isPitcher ? getStat() : rand(1, 20),
      sta: isPitcher ? getStat() : rand(1, 20),
      def: getStat(),
    };
  });
}

const MAX_LEAGUES = 4;

export async function expandLeague(): Promise<{ league: string; teamsCreated: number; playersCreated: number; matchesCreated: number }> {
  const lockResult = await pool.query(`SELECT pg_try_advisory_lock($1) as locked`, [EXPANSION_LOCK_ID]);
  const gotLock = lockResult.rows[0]?.locked === true;
  if (!gotLock) {
    console.log("expandLeague: another expansion in progress, skipping");
    return { league: "pending", teamsCreated: 0, playersCreated: 0, matchesCreated: 0 };
  }

  try {
  const existingTeams = await db.select().from(teams);
  const existingLeagues = new Set(existingTeams.map(t => t.league));
  const usedTeamNames = new Set(existingTeams.map(t => t.name));

  const existingPlayers = await db.select({ name: players.name }).from(players);
  const usedPlayerNames = new Set(existingPlayers.map(p => p.name));

  let nextLeagueNum = 1;
  while (existingLeagues.has(`L${nextLeagueNum}`)) {
    nextLeagueNum++;
  }

  if (nextLeagueNum > MAX_LEAGUES) {
    console.log(`League expansion blocked: already at max ${MAX_LEAGUES} leagues`);
    return { league: `L${MAX_LEAGUES}`, teamsCreated: 0, playersCreated: 0, matchesCreated: 0 };
  }

  const newLeague = `L${nextLeagueNum}`;

  const currentSeasonResult = await db.select({ maxSeason: sql<number>`COALESCE(MAX(${teams.seasonId}), 1)` }).from(teams);
  const currentSeason = currentSeasonResult[0]?.maxSeason || 1;

  const createdTeamIds: Record<string, number[]> = { A: [], B: [] };

  for (const series of ["A", "B"] as const) {
    const division = `${newLeague}${series}`;
    const color = series === "A" ? "#06b6d4" : "#ec4899";

    for (let i = 0; i < 10; i++) {
      const name = generateUniqueTeamName(usedTeamNames, series);
      const [t] = await db.insert(teams).values({
        name,
        primaryColor: color,
        league: newLeague,
        series,
        division,
        seasonId: currentSeason,
      }).returning();
      createdTeamIds[series].push(t.id);
    }
  }

  let totalPlayers = 0;
  for (const series of ["A", "B"]) {
    for (const teamId of createdTeamIds[series]) {
      const roster = generatePlayersForTeam(teamId, usedPlayerNames);
      await db.insert(players).values(roster);
      totalPlayers += roster.length;
    }
  }

  const allScheduleMatches: any[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  for (const series of ["A", "B"]) {
    const division = `${newLeague}${series}`;
    const teamIds = createdTeamIds[series];
    const n = teamIds.length;
    const currentDate = new Date(startDate);

    for (let round = 0; round < 5; round++) {
      for (let i = 0; i < n / 2; i++) {
        let homeIdx = (round + i) % (n - 1);
        let awayIdx = (n - 1 - i + round) % (n - 1);
        if (i === 0) awayIdx = n - 1;

        allScheduleMatches.push({
          seasonId: currentSeason,
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

    const returnStart = new Date(startDate);
    returnStart.setDate(returnStart.getDate() + 7);
    const returnDate = new Date(returnStart);

    for (let round = 0; round < 5; round++) {
      for (let i = 0; i < n / 2; i++) {
        let homeIdx = (round + i) % (n - 1);
        let awayIdx = (n - 1 - i + round) % (n - 1);
        if (i === 0) awayIdx = n - 1;

        allScheduleMatches.push({
          seasonId: currentSeason,
          division,
          day: 8 + round,
          matchDate: returnDate.toISOString().split('T')[0],
          homeTeamId: teamIds[awayIdx],
          awayTeamId: teamIds[homeIdx],
          played: false,
          matchType: "regular",
        });
      }
      returnDate.setDate(returnDate.getDate() + 1);
    }
  }

  const interleagueStart = new Date(startDate);
  interleagueStart.setDate(interleagueStart.getDate() + 5);
  for (let leg = 0; leg < 2; leg++) {
    const day = 6 + leg;
    const dateStr = new Date(interleagueStart.getTime() + leg * 86400000).toISOString().split('T')[0];

    for (let i = 0; i < 5; i++) {
      const home = leg === 0 ? createdTeamIds.A[i] : createdTeamIds.B[i];
      const away = leg === 0 ? createdTeamIds.B[i] : createdTeamIds.A[i];
      allScheduleMatches.push({
        seasonId: currentSeason,
        division: `interleague_${newLeague}`,
        day,
        matchDate: dateStr,
        homeTeamId: home,
        awayTeamId: away,
        played: false,
        matchType: "interleague",
      });
    }
  }

  const playoffStart = new Date(startDate);
  playoffStart.setDate(playoffStart.getDate() + 12);
  for (let leg = 0; leg < 2; leg++) {
    const day = 13 + leg;
    const dateStr = new Date(playoffStart.getTime() + leg * 86400000).toISOString().split('T')[0];

    for (let i = 0; i < 2; i++) {
      allScheduleMatches.push({
        seasonId: currentSeason,
        division: `playoff_${newLeague}`,
        day,
        matchDate: dateStr,
        homeTeamId: 0,
        awayTeamId: 0,
        played: false,
        matchType: "playoff",
      });
    }
  }

  for (let i = 0; i < allScheduleMatches.length; i += 50) {
    await db.insert(matches).values(allScheduleMatches.slice(i, i + 50));
  }

  console.log(`League expansion: Created ${newLeague} with 20 teams, ${totalPlayers} players, ${allScheduleMatches.length} matches`);
  console.log(`Name pools: ${usedTeamNames.size} unique team names, ${usedPlayerNames.size} unique player names`);

  return {
    league: newLeague,
    teamsCreated: 20,
    playersCreated: totalPlayers,
    matchesCreated: allScheduleMatches.length,
  };
  } finally {
    await pool.query(`SELECT pg_advisory_unlock($1)`, [EXPANSION_LOCK_ID]);
  }
}

export async function ensureExtraLeague(): Promise<void> {
  const existingTeams = await db.select().from(teams);
  const allLeagues = new Set(existingTeams.map(t => t.league));

  if (allLeagues.size >= MAX_LEAGUES) {
    return;
  }

  const leaguesWithOwners = new Set<string>();
  for (const t of existingTeams) {
    if (t.ownerWallet) {
      leaguesWithOwners.add(t.league);
    }
  }

  if (leaguesWithOwners.size === 0) return;

  const maxOccupiedNum = Math.max(
    ...Array.from(leaguesWithOwners).map(l => parseInt(l.replace('L', '')) || 0)
  );

  const nextLeagueId = `L${maxOccupiedNum + 1}`;

  if (!allLeagues.has(nextLeagueId) && maxOccupiedNum < MAX_LEAGUES) {
    console.log(`ensureExtraLeague: Creating ${nextLeagueId} (max occupied: L${maxOccupiedNum})`);
    await expandLeague();
  }
}
