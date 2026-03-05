import { db } from "./db";
import { teams, players, matches, marketListings, tokenPackages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateUniqueName, generateUniqueTeamName } from "./names";
import { generateBotSetup } from "./season";
import { storage } from "./storage";

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

function generateRegularSchedule(teamIds: number[], division: string, startDate: Date): { matches: any[], nextDate: Date } {
  const n = teamIds.length;
  const allMatches: any[] = [];
  const currentDate = new Date(startDate);

  for (let round = 0; round < 5; round++) {
    for (let i = 0; i < n / 2; i++) {
      let homeIdx = (round + i) % (n - 1);
      let awayIdx = (n - 1 - i + round) % (n - 1);
      if (i === 0) awayIdx = n - 1;

      allMatches.push({
        seasonId: 1,
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

function generateReturnSchedule(teamIds: number[], division: string, regularMatches: any[], startDate: Date): { matches: any[], nextDate: Date } {
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
        seasonId: 1,
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

function generateSeedInterleague(
  league: string,
  teamsA: number[],
  teamsB: number[],
  startDate: Date
): any[] {
  const allMatches: any[] = [];
  for (let leg = 0; leg < 2; leg++) {
    const day = 6 + leg;
    const dateStr = new Date(startDate.getTime() + leg * 86400000).toISOString().split('T')[0];
    const matchCount = Math.min(teamsA.length, teamsB.length, 5);
    for (let i = 0; i < matchCount; i++) {
      const idxA = i % teamsA.length;
      const idxB = (i + leg) % teamsB.length;
      const home = leg === 0 ? teamsA[idxA] : teamsB[idxB];
      const away = leg === 0 ? teamsB[idxB] : teamsA[idxA];
      allMatches.push({
        seasonId: 1,
        division: `interleague_${league}_AB`,
        day,
        matchDate: dateStr,
        homeTeamId: home,
        awayTeamId: away,
        played: false,
        matchType: "interleague",
      });
    }
  }
  return allMatches;
}

function generateSeedPlayoffs(leagues: string[], startDate: Date): any[] {
  const allMatches: any[] = [];
  for (let leg = 0; leg < 2; leg++) {
    const day = 13 + leg;
    const dateStr = new Date(startDate.getTime() + leg * 86400000).toISOString().split('T')[0];

    for (const league of leagues) {
      for (let i = 0; i < 2; i++) {
        allMatches.push({
          seasonId: 1,
          division: `playoff_${league}`,
          day,
          matchDate: dateStr,
          homeTeamId: 0,
          awayTeamId: 0,
          played: false,
          matchType: "playoff",
        });
      }
    }

    for (let li = 0; li < leagues.length - 1; li++) {
      const upper = leagues[li];
      const lower = leagues[li + 1];
      for (let i = 0; i < 2; i++) {
        allMatches.push({
          seasonId: 1,
          division: `promo_${lower}_to_${upper}`,
          day,
          matchDate: dateStr,
          homeTeamId: 0,
          awayTeamId: 0,
          played: false,
          matchType: "promotion",
        });
      }
    }
  }
  return allMatches;
}

const LEAGUE_KEYS = ["L1", "L2", "L3", "L4"];
const TEAMS_PER_SERIES = 10;

export async function seedDatabase() {
  const existingTeams = await db.select().from(teams).limit(1);
  if (existingTeams.length > 0) {
    console.log("Database already seeded, skipping...");
    await seedFreeAgents();
    await seedTokenPackages();
    return;
  }

  console.log(`Seeding database with ${LEAGUE_KEYS.length} leagues × 2 series...`);

  const usedTeamNames = new Set<string>();
  const usedPlayerNames = new Set<string>();
  const createdTeams: Record<string, Record<string, any[]>> = {};

  for (const league of LEAGUE_KEYS) {
    createdTeams[league] = { A: [], B: [] };
    for (const series of ["A", "B"] as const) {
      const division = `${league}${series}`;
      const color = series === "A" ? "#06b6d4" : "#ec4899";

      for (let i = 0; i < TEAMS_PER_SERIES; i++) {
        const name = generateUniqueTeamName(usedTeamNames, series);
        const [t] = await db.insert(teams).values({
          name,
          primaryColor: color,
          league,
          series,
          division,
          seasonId: 1,
        }).returning();
        createdTeams[league][series].push(t);
      }
    }
  }

  let totalPlayers = 0;
  for (const league of LEAGUE_KEYS) {
    for (const series of ["A", "B"]) {
      for (const team of createdTeams[league][series]) {
        const roster = generatePlayersForTeam(team.id, usedPlayerNames);
        await db.insert(players).values(roster);
        totalPlayers += roster.length;
      }
    }
  }

  const allTeamsList = Object.values(createdTeams).flatMap(l => Object.values(l).flat());
  let botSetupCount = 0;
  for (const team of allTeamsList) {
    try {
      const teamPlayers = await storage.getPlayersByTeam(team.id);
      await generateBotSetup(team.id, teamPlayers);
      botSetupCount++;
    } catch (err) {
      console.error(`Failed to setup bot team ${team.id} (${team.name}):`, err);
    }
  }
  console.log(`Generated lineups, rotations, and tactics for ${botSetupCount}/${allTeamsList.length} bot teams`);

  const allScheduleMatches: any[] = [];
  const startDate = new Date("2026-03-01");

  for (const league of LEAGUE_KEYS) {
    for (const series of ["A", "B"]) {
      const division = `${league}${series}`;
      const teamIds = createdTeams[league][series].map((t: any) => t.id);

      const { matches: regularMatches } = generateRegularSchedule(teamIds, division, startDate);
      allScheduleMatches.push(...regularMatches);

      const returnStart = new Date(startDate);
      returnStart.setDate(returnStart.getDate() + 7);
      const { matches: returnMatches } = generateReturnSchedule(teamIds, division, regularMatches, returnStart);
      allScheduleMatches.push(...returnMatches);
    }

    const interleagueStart = new Date(startDate);
    interleagueStart.setDate(interleagueStart.getDate() + 5);
    allScheduleMatches.push(...generateSeedInterleague(
      league,
      createdTeams[league].A.map((t: any) => t.id),
      createdTeams[league].B.map((t: any) => t.id),
      interleagueStart
    ));
  }

  const playoffStart = new Date(startDate);
  playoffStart.setDate(playoffStart.getDate() + 12);
  allScheduleMatches.push(...generateSeedPlayoffs(LEAGUE_KEYS, playoffStart));

  for (let i = 0; i < allScheduleMatches.length; i += 50) {
    await db.insert(matches).values(allScheduleMatches.slice(i, i + 50));
  }

  const totalTeams = Object.values(createdTeams).flatMap(l => Object.values(l).flat()).length;
  console.log(`Seeded: ${totalTeams} teams, ${totalPlayers} players, ${allScheduleMatches.length} matches (14 match days)`);
  console.log(`Name pools: ${usedTeamNames.size} unique team names, ${usedPlayerNames.size} unique player names`);

  await seedFreeAgents(usedPlayerNames);
  await seedTokenPackages();
}

export async function seedFreeAgents(existingNames?: Set<string>) {
  const existing = await db.select({ id: marketListings.id }).from(marketListings).where(eq(marketListings.status, 'active')).limit(1);
  if (existing.length > 0) return;

  const usedNames = existingNames ?? new Set<string>();
  if (!existingNames) {
    const allPlayers = await db.select({ name: players.name }).from(players);
    allPlayers.forEach(p => usedNames.add(p.name));
  }

  const FREE_AGENT_COUNT = 30;
  const positionSets: Position[][] = [
    ['P'], ['P'], ['P'], ['P'], ['P'], ['P'],
    ['C'], ['C', '1B'],
    ['1B'], ['2B'], ['3B'], ['SS'], ['2B', 'SS'],
    ['LF'], ['CF'], ['RF'], ['LF', 'RF'],
    ['1B', 'DH'], ['3B', '1B'], ['CF', 'LF', 'RF'],
    ['P'], ['P'],
    ['C'], ['1B'], ['2B'], ['SS'],
    ['LF'], ['CF'], ['RF'], ['3B'],
  ];

  const freeAgents = [];
  for (let i = 0; i < FREE_AGENT_COUNT; i++) {
    const pos = positionSets[i % positionSets.length];
    const isPitcher = pos.includes('P');
    const getStat = () => Math.max(1, Math.min(100, gaussianRand(25, 80)));
    freeAgents.push({
      name: generateUniqueName(usedNames),
      teamId: null as unknown as number,
      positions: pos,
      pow: getStat(), con: getStat(), spd: getStat(), eye: getStat(),
      vel: isPitcher ? getStat() : rand(1, 20),
      ctl: isPitcher ? getStat() : rand(1, 20),
      mov: isPitcher ? getStat() : rand(1, 20),
      sta: isPitcher ? getStat() : rand(1, 20),
      def: getStat(),
    });
  }

  const inserted = await db.insert(players).values(freeAgents).returning();

  const listings = inserted.map(p => ({
    playerId: p.id,
    sellerWallet: 'FREE_AGENT',
    sellerTeamId: 0,
    price: rand(5, 50),
    status: 'active' as const,
  }));
  await db.insert(marketListings).values(listings);
  console.log(`Seeded ${FREE_AGENT_COUNT} free agent players in market`);
}

export async function seedTokenPackages() {
  const existing = await db.select({ id: tokenPackages.id }).from(tokenPackages).limit(1);
  if (existing.length > 0) return;

  const defaults = [
    { tokens: 500, priceLamports: "100000000", label: "500 Tokens – 0.1 SOL", sortOrder: 1 },
    { tokens: 1300, priceLamports: "250000000", label: "1300 Tokens – 0.25 SOL", sortOrder: 2 },
    { tokens: 6300, priceLamports: "1000000000", label: "6300 Tokens – 1 SOL", sortOrder: 3 },
  ];
  await db.insert(tokenPackages).values(defaults);
  console.log("Seeded 3 default token packages");
}
