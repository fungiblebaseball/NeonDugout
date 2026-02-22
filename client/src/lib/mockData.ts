import { Player, Team, Position, Division, MatchDay, Match } from './types';

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

export const randomId = () => Math.random().toString(36).substring(2, 11);
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Gaussian-ish random for better attribute distribution
const gaussianRand = (min: number, max: number) => {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return gaussianRand(min, max); // resample between 0 and 1
  return Math.floor(num * (max - min) + min);
}

export function generateRandomPlayers(count: number = 20, isPremium: boolean = false): Player[] {
  const players: Player[] = [];
  
  // Suggested distribution: 8 IF/OF, 4 C/Utility, 5 Pitchers, 3 Extra
  const positions: Position[][] = [
    // Pitchers (5)
    ['P'], ['P'], ['P'], ['P'], ['P'],
    // Catchers (2)
    ['C'], ['C', '1B'],
    // Infield (5)
    ['1B'], ['2B'], ['3B'], ['SS'], ['2B', 'SS'],
    // Outfield (4)
    ['LF'], ['CF'], ['RF'], ['LF', 'RF'],
    // Extra/Utility (4)
    ['1B', 'DH'], ['3B', '1B'], ['CF', 'LF', 'RF'], ['C']
  ];
  
  for (let i = 0; i < count; i++) {
    const pos = positions[i] || [['DH']];
    const isPitcher = pos.includes('P');
    
    // Base stats around 50-60, higher for Div A
    const baseMin = isPremium ? 40 : 20;
    const baseMax = isPremium ? 90 : 80;
    
    // Create 1-2 stars per team
    const isStar = i === 3 || i === 8; 
    const isScrub = !isStar && (i === 18 || i === 19);
    
    const modifier = isStar ? 20 : (isScrub ? -20 : 0);
    
    const getStat = () => Math.max(1, Math.min(100, gaussianRand(baseMin, baseMax) + modifier));

    players.push({
      id: randomId(),
      name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
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
    });
  }
  return players;
}

export function generateRoundRobinSchedule(teams: Team[], startDate: string): MatchDay[] {
  const n = teams.length; // Assume even, 10
  const schedule: MatchDay[] = [];
  
  // Berger tables algorithm for round-robin
  const teamIds = teams.map(t => t.id);
  
  // 14 days requested in spec (5 andata + ... ) 
  // Standard round robin for 10 teams is 9 days. We'll generate 18 days (home/away)
  // For MVP we'll just generate the full 18 days for simplicity.
  
  let currentDate = new Date(startDate);

  for (let round = 0; round < (n - 1) * 2; round++) {
    const matches: Match[] = [];
    const isReverse = round >= n - 1;
    const roundIdx = round % (n - 1);
    
    for (let i = 0; i < n / 2; i++) {
      let homeIdx = (roundIdx + i) % (n - 1);
      let awayIdx = (n - 1 - i + roundIdx) % (n - 1);
      
      if (i === 0) {
        awayIdx = n - 1; // Last team stays in place
      }
      
      let home = teamIds[homeIdx];
      let away = teamIds[awayIdx];
      
      if (isReverse) {
        [home, away] = [away, home]; // Swap for return leg
      }
      
      matches.push({
        home,
        away,
        played: false
      });
    }
    
    schedule.push({
      day: round + 1,
      date: currentDate.toISOString().split('T')[0],
      matches
    });
    
    // Add a day for next round
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return schedule;
}

export function generateMockLeagues() {
  const divisions: Record<string, Division> = {};
  const allPlayers: Record<string, Player> = {};
  
  const createDivision = (id: 'A' | 'B', name: string, teamNames: string[]) => {
    const teams: Team[] = [];
    
    teamNames.forEach(teamName => {
      const teamId = randomId();
      teams.push({
        id: teamId,
        name: teamName,
        primaryColor: id === 'A' ? '#06b6d4' : '#ec4899', // Cyan for A, Pink for B
        ownerPubkey: null,
        division: id
      });
      
      const roster = generateRandomPlayers(20, id === 'A');
      roster.forEach(p => {
        allPlayers[p.id] = p; // We don't link players to team objects directly here to keep state flat, 
                              // we'll link them in the store state.
      });
    });
    
    const schedule = generateRoundRobinSchedule(teams, "2026-03-01");
    
    divisions[id] = {
      id,
      name,
      teams,
      schedule
    };
  };

  createDivision('A', "Neon Apex Division", DIV_A_TEAMS);
  createDivision('B', "Chrome Street Division", DIV_B_TEAMS);

  return { divisions, players: allPlayers };
}
