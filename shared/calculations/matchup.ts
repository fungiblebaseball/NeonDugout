import type { SimPlayer } from './types';

export function matchupRating(batter: SimPlayer, pitcher: SimPlayer, inning: number = 1): number {
  const fatiguePenalty = inning > 5 ? (inning - 5) * (100 - pitcher.sta) * 0.04 : 0;

  const batterScore =
    batter.pow * 0.25 +
    batter.con * 0.30 +
    batter.eye * 0.20 +
    batter.spd * 0.15;

  const pitcherScore =
    pitcher.vel * 0.30 +
    pitcher.ctl * 0.25 +
    pitcher.mov * 0.25 +
    fatiguePenalty;

  return batterScore - pitcherScore;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function errorChance(defenseRating: number): number {
  return 0.02 + (0.08 / (1 + Math.exp(0.08 * (defenseRating - 50))));
}

export function gidpChance(batterSpd: number, runnerSpd: number, infieldDefAvg: number): number {
  const base = 0.08;
  const batterMod = (80 - batterSpd) / 400;
  const runnerMod = (80 - runnerSpd) / 300;
  const defMod = (infieldDefAvg - 50) / 200;
  return clamp(base + batterMod + runnerMod - defMod, 0.02, 0.40);
}

export function teamDefenseAvg(lineup: SimPlayer[], zone: 'infield' | 'outfield'): number {
  const positions = zone === 'infield'
    ? ['SS', '2B', '3B', '1B']
    : ['LF', 'CF', 'RF'];

  const fielders = lineup.filter(p =>
    p.positions.some(pos => positions.includes(pos))
  );

  if (fielders.length === 0) return 50;
  return fielders.reduce((sum, p) => sum + p.def, 0) / fielders.length;
}
