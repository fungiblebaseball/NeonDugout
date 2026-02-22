import { db } from "./db";
import { teams, players, matches } from "@shared/schema";
import { eq } from "drizzle-orm";

const FIRST_NAMES = ["Jax", "Roxy", "Zane", "Nova", "Dash", "Blade", "Rex", "Viper", "Echo", "Rip", "Duke", "Spike", "Ace", "Jett", "Axel", "Luna", "Blitz", "Flux"];
const LAST_NAMES = ["Neonstrike", "Voltbat", "Chromedrift", "Synthwave", "Cyberthrow", "Laserpitch", "Hologlove", "Turbo", "Stark", "Vanguard", "Plasma", "Pulse", "Mirage"];

const DIV_A_TEAMS = [
  "Neon Vortex Rays", "Volt City Thunder", "Chrome Ionizers", "Acid Palm Bombers", "Roxy Quantum Hawks",
  "Jax Plasma Kings", "Luna Cyber Sox", "Blitz Neon Knights", "Echo Pulse Giants", "Flux Mirage Crushers"
];

const DIV_B_TEAMS = [
  "Rusty Neon Rebels", "Chrome Alley Outlaws", "Volt Trash Pandas", "Acid Drop Dusters", "Roxy Street Sharks",
  "Jax Backlot Bandits", "Luna Midnight Misfits", "Blitz Scrapyard Dogs", "Echo Junkyard Jokers", "Flux Shadow Stingers"
];

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

function generateSchedule(teamIds: number[], division: string, startDate: string) {
  const n = teamIds.length;
  const allMatches: any[] = [];
  let currentDate = new Date(startDate);

  for (let round = 0; round < (n - 1) * 2; round++) {
    const isReverse = round >= n - 1;
    const roundIdx = round % (n - 1);

    for (let i = 0; i < n / 2; i++) {
      let homeIdx = (roundIdx + i) % (n - 1);
      let awayIdx = (n - 1 - i + roundIdx) % (n - 1);
      if (i === 0) awayIdx = n - 1;

      let home = teamIds[homeIdx];
      let away = teamIds[awayIdx];
      if (isReverse) [home, away] = [away, home];

      allMatches.push({
        seasonId: 1,
        division,
        day: round + 1,
        matchDate: currentDate.toISOString().split('T')[0],
        homeTeamId: home,
        awayTeamId: away,
        played: false,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return allMatches;
}

export async function seedDatabase() {
  const existingTeams = await db.select().from(teams).limit(1);
  if (existingTeams.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  const divATeams = await Promise.all(
    DIV_A_TEAMS.map(async (name) => {
      const [t] = await db.insert(teams).values({
        name,
        primaryColor: "#06b6d4",
        division: "A",
        seasonId: 1,
      }).returning();
      return t;
    })
  );

  const divBTeams = await Promise.all(
    DIV_B_TEAMS.map(async (name) => {
      const [t] = await db.insert(teams).values({
        name,
        primaryColor: "#ec4899",
        division: "B",
        seasonId: 1,
      }).returning();
      return t;
    })
  );

  for (const team of [...divATeams, ...divBTeams]) {
    const roster = generatePlayersForTeam(team.id);
    await db.insert(players).values(roster);
  }

  const scheduleA = generateSchedule(divATeams.map(t => t.id), "A", "2026-03-01");
  const scheduleB = generateSchedule(divBTeams.map(t => t.id), "B", "2026-03-01");

  for (let i = 0; i < scheduleA.length; i += 50) {
    await db.insert(matches).values(scheduleA.slice(i, i + 50));
  }
  for (let i = 0; i < scheduleB.length; i += 50) {
    await db.insert(matches).values(scheduleB.slice(i, i + 50));
  }

  console.log(`Seeded: ${divATeams.length + divBTeams.length} teams, ${(divATeams.length + divBTeams.length) * 20} players, ${scheduleA.length + scheduleB.length} matches`);
}
