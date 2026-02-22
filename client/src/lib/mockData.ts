import { Player, Team, Position } from './types';

const FIRST_NAMES = ["Jax", "Roxy", "Zane", "Nova", "Dash", "Blade", "Rex", "Viper", "Echo", "Rip", "Duke", "Spike", "Ace", "Jett", "Axel"];
const LAST_NAMES = ["Neonstrike", "Voltbat", "Chromedrift", "Synthwave", "Cyberthrow", "Laserpitch", "Hologlove", "Turbo", "Stark", "Vanguard"];
const TEAM_NAMES = ["Chrome City Ionizers", "Neon Vortex Rays", "Neo-Tokyo Sluggers", "Miami Synth Sox", "Venice Beach Vipers"];

const randomId = () => Math.random().toString(36).substring(2, 11);
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function generateRandomTeam(): Team {
  return {
    id: randomId(),
    name: TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)],
    primaryColor: '#ff00ff'
  };
}

export function generateRandomPlayers(count: number = 20): Player[] {
  const players: Player[] = [];
  const fieldPositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  
  for (let i = 0; i < count; i++) {
    const isPitcher = i < 5; // ensure ~5 pitchers
    const pos: Position[] = isPitcher 
      ? ['P'] 
      : [fieldPositions[Math.floor(Math.random() * fieldPositions.length)]];
    
    players.push({
      id: randomId(),
      name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
      positions: pos,
      pow: rand(20, 100),
      con: rand(20, 100),
      spd: rand(20, 100),
      eye: rand(20, 100),
      vel: isPitcher ? rand(20, 100) : rand(1, 20),
      ctl: isPitcher ? rand(20, 100) : rand(1, 20),
      mov: isPitcher ? rand(20, 100) : rand(1, 20),
      sta: isPitcher ? rand(20, 100) : rand(1, 20),
      def: rand(20, 100),
    });
  }
  return players;
}
