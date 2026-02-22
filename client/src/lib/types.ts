export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';

export interface Player {
  id: string;
  name: string;
  positions: Position[];
  // Batter
  pow: number;
  con: number;
  spd: number;
  eye: number;
  // Pitcher
  vel: number;
  ctl: number;
  mov: number;
  sta: number;
  // Defense
  def: number;
}

export interface Team {
  id: string;
  name: string;
  primaryColor: string;
  ownerPubkey: string | null; // null if unowned/bot
  division: 'A' | 'B' | 'C';
}

export type LineupPositions = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

export type Lineup = {
  [K in LineupPositions]: string | null;
};

export interface Match {
  home: string; // Team ID
  away: string; // Team ID
  played: boolean;
  homeScore?: number;
  awayScore?: number;
}

export interface MatchDay {
  day: number;
  date: string;
  matches: Match[];
}

export interface Division {
  id: 'A' | 'B' | 'C';
  name: string;
  teams: Team[];
  schedule: MatchDay[];
}

export interface League {
  divisions: Record<string, Division>;
  players: Record<string, Player>; // Map of all players by ID for easy lookup
}
