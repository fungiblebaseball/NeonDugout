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
}

export type LineupPositions = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

export type Lineup = {
  [K in LineupPositions]: string | null;
};
