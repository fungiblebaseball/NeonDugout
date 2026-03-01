export interface SimPlayer {
  id: number;
  name: string;
  positions: string[];
  pow: number;
  con: number;
  spd: number;
  eye: number;
  vel: number;
  ctl: number;
  mov: number;
  sta: number;
  def: number;
}

export interface SimTeam {
  id: number;
  name: string;
  division: string;
}

export type AtBatOutcome = 'HR' | '3B' | '2B' | '1B' | 'BB' | 'SO' | 'GO' | 'FO' | 'ERR' | 'GIDP';

export interface AtBatResult {
  outcome: AtBatOutcome;
  pitchCount: number;
  balls: number;
  strikes: number;
  rbiCount: number;
  description: string;
}

export interface InningHalf {
  runs: number;
  hits: number;
  errors: number;
  outs: number;
  events: AtBatResult[];
}

export interface InningResult {
  top: InningHalf;
  bottom: InningHalf;
}

export interface BatterStats {
  playerId: number;
  name: string;
  ab: number;
  hits: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  avg: string;
}

export interface PitcherStats {
  playerId: number;
  name: string;
  ip: number;
  h: number;
  er: number;
  bb: number;
  so: number;
  pitchCount: number;
}

export interface BoxScore {
  innings: number[];
  awayLine: number[];
  homeLine: number[];
  awayRHE: [number, number, number];
  homeRHE: [number, number, number];
  awayBatters: BatterStats[];
  homeBatters: BatterStats[];
  awayPitcher: PitcherStats;
  homePitcher: PitcherStats;
  awayPitchers?: PitcherStats[];
  homePitchers?: PitcherStats[];
}

export interface PlayLogEntry {
  type: 'at_bat' | 'pitcher_change' | 'tactic_change' | 'tactic_initial';
  inning: number;
  half: 'top' | 'bottom';
  outs: number;

  batterId?: number;
  batterName?: string;
  pitcherId?: number;
  pitcherName?: string;
  count?: { balls: number; strikes: number; pitches: number };
  outcome?: AtBatOutcome;
  fielderName?: string;
  fielderPosition?: string;
  playDirection?: 'infield' | 'outfield';
  basesBefore?: { first: boolean; second: boolean; third: boolean };
  basesAfter?: { first: boolean; second: boolean; third: boolean };
  runsScored?: number;
  outsAdded?: number;

  oldPitcherName?: string;
  newPitcherName?: string;
  newPitcherRole?: string;
  changeReason?: string;
  pitcherStyle?: string;

  tacticField?: string;
  oldValue?: string;
  newValue?: string;
  teamSide?: 'home' | 'away';
}

export interface GameResult {
  homeTeam: SimTeam;
  awayTeam: SimTeam;
  homeScore: number;
  awayScore: number;
  boxScore: BoxScore;
  flavorTexts: string[];
  mvp: { name: string; reason: string };
  playLog?: PlayLogEntry[];
}
