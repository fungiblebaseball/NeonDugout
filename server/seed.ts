import { db } from "./db";
import { teams, players, matches } from "@shared/schema";
import { eq } from "drizzle-orm";

const FIRST_NAMES = ["Jax", "Roxy", "Zane", "Nova", "Dash", "Blade", "Rex", "Viper", "Echo", "Rip", "Duke", "Spike", "Ace", "Jett", "Axel", "Luna", "Blitz", "Flux", "Kira", "Storm", "Nyx", "Orion", "Cyrus", "Hex", "Volt"];
const LAST_NAMES = ["Neonstrike", "Voltbat", "Chromedrift", "Synthwave", "Cyberthrow", "Laserpitch", "Hologlove", "Turbo", "Stark", "Vanguard", "Plasma", "Pulse", "Mirage", "Redline", "Blackout", "Frostbyte", "Nitro"];

const LEAGUE_TEAMS: Record<string, Record<string, string[]>> = {
  L1: {
    A: [
      "Neon Vortex Rays", "Volt City Thunder", "Chrome Ionizers", "Acid Palm Bombers", "Roxy Quantum Hawks",
      "Jax Plasma Kings", "Luna Cyber Sox", "Blitz Neon Knights", "Echo Pulse Giants", "Flux Mirage Crushers"
    ],
    B: [
      "Rusty Neon Rebels", "Chrome Alley Outlaws", "Volt Trash Pandas", "Acid Drop Dusters", "Roxy Street Sharks",
      "Jax Backlot Bandits", "Luna Midnight Misfits", "Blitz Scrapyard Dogs", "Echo Junkyard Jokers", "Flux Shadow Stingers"
    ],
  },
  L2: {
    A: [
      "Nova Astro Titans", "Storm Circuit Blazers", "Hex Grid Wolves", "Orion Darkfield Vipers", "Cyrus Warp Dragons",
      "Kira Neon Samurai", "Nyx Shadowrun Aces", "Dash Turbo Stallions", "Duke Ion Raptors", "Spike Overdrive Cobras"
    ],
    B: [
      "Zane Alley Rats", "Rex Rust Runners", "Blade Backstreet Brawlers", "Rip Current Drifters", "Ace Junkyard Jets",
      "Axel Neon Nomads", "Volt Gutter Punks", "Storm Scrap Coyotes", "Hex Street Phantoms", "Orion Ash Crawlers"
    ],
  },
};

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

function generatePlayersForTeam(teamId: number) {
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
      name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
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

function generateInterleagueSchedule(
  seriesATeamsL1: number[], seriesATeamsL2: number[],
  seriesBTeamsL1: number[], seriesBTeamsL2: number[],
  startDate: Date
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
        seasonId: 1,
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
        seasonId: 1,
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

function generatePlayoffPlaceholders(startDate: Date): { matches: any[], nextDate: Date } {
  const allMatches: any[] = [];
  const currentDate = new Date(startDate);

  for (let leg = 0; leg < 2; leg++) {
    const day = 13 + leg;

    for (const league of ["L1", "L2"]) {
      for (let i = 0; i < 2; i++) {
        allMatches.push({
          seasonId: 1,
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

export async function seedDatabase() {
  const existingTeams = await db.select().from(teams).limit(1);
  if (existingTeams.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with 2 leagues × 2 series...");

  const createdTeams: Record<string, Record<string, any[]>> = { L1: { A: [], B: [] }, L2: { A: [], B: [] } };

  for (const league of ["L1", "L2"]) {
    for (const series of ["A", "B"]) {
      const teamNames = LEAGUE_TEAMS[league][series];
      const division = `${league}${series}`;
      const color = series === "A" ? "#06b6d4" : "#ec4899";

      for (const name of teamNames) {
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
  for (const league of ["L1", "L2"]) {
    for (const series of ["A", "B"]) {
      for (const team of createdTeams[league][series]) {
        const roster = generatePlayersForTeam(team.id);
        await db.insert(players).values(roster);
        totalPlayers += roster.length;
      }
    }
  }

  const allScheduleMatches: any[] = [];
  const startDate = new Date("2026-03-01");

  for (const league of ["L1", "L2"]) {
    for (const series of ["A", "B"]) {
      const division = `${league}${series}`;
      const teamIds = createdTeams[league][series].map((t: any) => t.id);

      const { matches: regularMatches, nextDate: afterAndata } = generateRegularSchedule(teamIds, division, startDate) as any;
      allScheduleMatches.push(...regularMatches);

      const returnStart = new Date(startDate);
      returnStart.setDate(returnStart.getDate() + 7);
      const { matches: returnMatches } = generateReturnSchedule(teamIds, division, regularMatches, returnStart) as any;
      allScheduleMatches.push(...returnMatches);
    }
  }

  const interleagueStart = new Date(startDate);
  interleagueStart.setDate(interleagueStart.getDate() + 5);
  const { matches: interleagueMatches } = generateInterleagueSchedule(
    createdTeams.L1.A.map((t: any) => t.id), createdTeams.L2.A.map((t: any) => t.id),
    createdTeams.L1.B.map((t: any) => t.id), createdTeams.L2.B.map((t: any) => t.id),
    interleagueStart
  ) as any;
  allScheduleMatches.push(...interleagueMatches);

  const playoffStart = new Date(startDate);
  playoffStart.setDate(playoffStart.getDate() + 12);
  const { matches: playoffMatches } = generatePlayoffPlaceholders(playoffStart);
  allScheduleMatches.push(...playoffMatches);

  for (let i = 0; i < allScheduleMatches.length; i += 50) {
    await db.insert(matches).values(allScheduleMatches.slice(i, i + 50));
  }

  const totalTeams = Object.values(createdTeams).flatMap(l => Object.values(l).flat()).length;
  console.log(`Seeded: ${totalTeams} teams, ${totalPlayers} players, ${allScheduleMatches.length} matches (14 match days)`);
}
