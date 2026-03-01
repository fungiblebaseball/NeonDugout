import type { AtBatOutcome } from './types';

export type AttackStyle = 'bunt' | 'hit_and_run' | 'neutral' | 'swing_on_sight';
export type InfieldPosition = 'short' | 'neutral' | 'deep';
export type OutfieldPosition = 'short' | 'neutral' | 'deep';

interface OutcomeProbabilities {
  HR: number;
  XBH: number;
  '1B': number;
  BB: number;
  SO: number;
  GO: number;
  FO: number;
}

const PROBABILITY_TABLE: Record<string, OutcomeProbabilities> = {
  'very_negative': { HR: 0.01, XBH: 0.02, '1B': 0.08, BB: 0.04, SO: 0.35, GO: 0.26, FO: 0.24 },
  'negative':      { HR: 0.03, XBH: 0.04, '1B': 0.12, BB: 0.06, SO: 0.28, GO: 0.24, FO: 0.23 },
  'slight_neg':    { HR: 0.04, XBH: 0.05, '1B': 0.15, BB: 0.07, SO: 0.22, GO: 0.24, FO: 0.23 },
  'neutral':       { HR: 0.05, XBH: 0.06, '1B': 0.17, BB: 0.08, SO: 0.18, GO: 0.24, FO: 0.22 },
  'slight_pos':    { HR: 0.07, XBH: 0.08, '1B': 0.19, BB: 0.09, SO: 0.14, GO: 0.22, FO: 0.21 },
  'positive':      { HR: 0.10, XBH: 0.10, '1B': 0.21, BB: 0.10, SO: 0.10, GO: 0.20, FO: 0.19 },
  'very_positive':  { HR: 0.14, XBH: 0.12, '1B': 0.23, BB: 0.10, SO: 0.06, GO: 0.18, FO: 0.17 },
};

function getRatingBracket(matchupRating: number): string {
  if (matchupRating <= -30) return 'very_negative';
  if (matchupRating <= -15) return 'negative';
  if (matchupRating <= -5) return 'slight_neg';
  if (matchupRating <= 5) return 'neutral';
  if (matchupRating <= 15) return 'slight_pos';
  if (matchupRating <= 30) return 'positive';
  return 'very_positive';
}

function interpolateBrackets(matchupRating: number): OutcomeProbabilities {
  const bracket = getRatingBracket(matchupRating);
  return { ...PROBABILITY_TABLE[bracket] };
}

export type BatterApproach = 'power' | 'contact' | 'patient';
export type PitcherStyle = 'velocity' | 'movement' | 'command';
export type OffensiveAttack = 'aggressive' | 'balanced' | 'conservative';
export type DefenseSetup = 'aggressive' | 'balanced' | 'protective';

export interface TacticsModifiers {
  attackStyle: AttackStyle;
  infieldPosition: InfieldPosition;
  outfieldPosition: OutfieldPosition;
  batterApproach?: BatterApproach;
  pitcherStyle?: PitcherStyle;
  offensiveAttack?: OffensiveAttack;
  defenseSetup?: DefenseSetup;
}

export interface TacticCoefficientRow {
  layer: string;
  tacticValue: string;
  hr: number;
  xbh: number;
  single: number;
  bb: number;
  so: number;
  go: number;
  fo: number;
  tacSt: number;
}

const FALLBACK_ATTACK_MODIFIERS: Record<AttackStyle, Partial<OutcomeProbabilities>> = {
  bunt:           { '1B': 0.15, XBH: -0.20, HR: -0.20, GO: 0.10 },
  hit_and_run:    { '1B': 0.15, XBH: -0.15, HR: -0.25, SO: 0.05 },
  neutral:        {},
  swing_on_sight: { XBH: 0.20, HR: 0.15, SO: 0.20, FO: 0.10 },
};

function getFallbackDefenseCounter(atk: AttackStyle, infieldPos: InfieldPosition, outfieldPos: OutfieldPosition): Partial<OutcomeProbabilities> {
  const mods: Partial<OutcomeProbabilities> = {};
  if (atk === 'bunt' && infieldPos === 'short') { mods['1B'] = -0.12; mods.GO = 0.10; }
  else if (atk === 'bunt' && infieldPos === 'deep') { mods['1B'] = 0.05; }
  if (atk === 'hit_and_run' && infieldPos === 'neutral') { mods['1B'] = -0.08; mods.GO = 0.06; }
  if (atk === 'swing_on_sight' && infieldPos === 'deep') { mods['1B'] = -0.05; mods.GO = 0.05; }
  if (atk === 'swing_on_sight' && outfieldPos === 'deep') { mods.HR = -0.08; mods.XBH = -0.06; mods.FO = 0.08; }
  else if (atk === 'bunt' && outfieldPos === 'short') { mods['1B'] = -0.05; mods.FO = 0.04; }
  if (atk === 'hit_and_run' && outfieldPos === 'neutral') { mods['1B'] = (mods['1B'] || 0) - 0.04; }
  return mods;
}

type RpsOutcome = 'win' | 'tie' | 'lose';

const BATTER_VS_PITCHER: Record<BatterApproach, Record<PitcherStyle, RpsOutcome>> = {
  power:   { velocity: 'tie',  movement: 'win',  command: 'lose' },
  contact: { velocity: 'lose', movement: 'tie',  command: 'win'  },
  patient: { velocity: 'win',  movement: 'lose', command: 'tie'  },
};

const OFFENSE_VS_DEFENSE: Record<OffensiveAttack, Record<DefenseSetup, RpsOutcome>> = {
  aggressive:   { aggressive: 'lose', balanced: 'tie',  protective: 'win'  },
  balanced:     { aggressive: 'win',  balanced: 'tie',  protective: 'lose' },
  conservative: { aggressive: 'lose', balanced: 'tie',  protective: 'tie'  },
};

function coefficientRowToMods(row: TacticCoefficientRow): Partial<OutcomeProbabilities> {
  const mods: Partial<OutcomeProbabilities> = {};
  if (row.hr !== 0) mods.HR = row.hr / 100;
  if (row.xbh !== 0) mods.XBH = row.xbh / 100;
  if (row.single !== 0) mods['1B'] = row.single / 100;
  if (row.bb !== 0) mods.BB = row.bb / 100;
  if (row.so !== 0) mods.SO = row.so / 100;
  if (row.go !== 0) mods.GO = row.go / 100;
  if (row.fo !== 0) mods.FO = row.fo / 100;
  return mods;
}

function findCoefficient(coefficients: TacticCoefficientRow[], layer: string, tacticValue: string): TacticCoefficientRow | undefined {
  return coefficients.find(c => c.layer === layer && c.tacticValue === tacticValue);
}

function applyModifiers(base: OutcomeProbabilities, mods: Partial<OutcomeProbabilities>): OutcomeProbabilities {
  const result = { ...base };
  for (const [key, mod] of Object.entries(mods)) {
    const k = key as keyof OutcomeProbabilities;
    if (result[k] !== undefined && mod !== undefined) {
      result[k] = result[k] * (1 + mod);
    }
  }

  const total = result.HR + result.XBH + result['1B'] + result.BB + result.SO + result.GO + result.FO;
  if (total > 0) {
    result.HR /= total;
    result.XBH /= total;
    result['1B'] /= total;
    result.BB /= total;
    result.SO /= total;
    result.GO /= total;
    result.FO /= total;
  }

  return result;
}

export function getStealTacStMod(
  tactics?: TacticsModifiers,
  opponentTactics?: TacticsModifiers,
  coefficients?: TacticCoefficientRow[],
): number {
  if (!coefficients) return 0;
  let total = 0;
  if (tactics?.attackStyle && tactics.attackStyle !== 'neutral') {
    const row = findCoefficient(coefficients, 'attack_style', tactics.attackStyle);
    if (row) total += row.tacSt;
  }
  if (tactics?.offensiveAttack) {
    const row = findCoefficient(coefficients, 'offensive_attack', tactics.offensiveAttack);
    if (row) total += row.tacSt;
  }
  if (opponentTactics?.infieldPosition && opponentTactics.infieldPosition !== 'neutral') {
    const row = findCoefficient(coefficients, 'defense_counter_infield', opponentTactics.infieldPosition);
    if (row) total += row.tacSt;
  }
  if (opponentTactics?.outfieldPosition && opponentTactics.outfieldPosition !== 'neutral') {
    const row = findCoefficient(coefficients, 'defense_counter_outfield', opponentTactics.outfieldPosition);
    if (row) total += row.tacSt;
  }
  if (opponentTactics?.defenseSetup) {
    const row = findCoefficient(coefficients, 'defense_setup', opponentTactics.defenseSetup);
    if (row) total += row.tacSt;
  }
  return total / 100;
}

export function getOutcomeProbabilities(
  matchupRating: number,
  tactics?: TacticsModifiers,
  opponentTactics?: TacticsModifiers,
  activePitcherStyle?: string,
  coefficients?: TacticCoefficientRow[],
): OutcomeProbabilities {
  let probs = interpolateBrackets(matchupRating);

  const effectivePitcherStyle = (activePitcherStyle as PitcherStyle) || opponentTactics?.pitcherStyle;

  if (tactics?.batterApproach && effectivePitcherStyle && coefficients) {
    const rpsResult = BATTER_VS_PITCHER[tactics.batterApproach][effectivePitcherStyle];
    if (rpsResult === 'win') {
      const row = findCoefficient(coefficients, 'batter_approach', tactics.batterApproach);
      if (row) probs = applyModifiers(probs, coefficientRowToMods(row));
    } else if (rpsResult === 'lose') {
      const row = findCoefficient(coefficients, 'pitcher_style', effectivePitcherStyle);
      if (row) probs = applyModifiers(probs, coefficientRowToMods(row));
    }
  } else if (tactics?.batterApproach && effectivePitcherStyle) {
    const rpsResult = BATTER_VS_PITCHER[tactics.batterApproach][effectivePitcherStyle];
    if (rpsResult === 'win') {
      probs = applyModifiers(probs, { HR: 0.12, XBH: 0.10, '1B': 0.05, SO: -0.08 });
    } else if (rpsResult === 'lose') {
      probs = applyModifiers(probs, { HR: -0.10, XBH: -0.08, SO: 0.12, GO: 0.05 });
    }
  }

  if (tactics && coefficients) {
    if (tactics.attackStyle !== 'neutral') {
      const row = findCoefficient(coefficients, 'attack_style', tactics.attackStyle);
      if (row) probs = applyModifiers(probs, coefficientRowToMods(row));
    }
    if (opponentTactics) {
      if (opponentTactics.infieldPosition !== 'neutral') {
        const row = findCoefficient(coefficients, 'defense_counter_infield', opponentTactics.infieldPosition);
        if (row) probs = applyModifiers(probs, coefficientRowToMods(row));
      }
      if (opponentTactics.outfieldPosition !== 'neutral') {
        const row = findCoefficient(coefficients, 'defense_counter_outfield', opponentTactics.outfieldPosition);
        if (row) probs = applyModifiers(probs, coefficientRowToMods(row));
      }
    }
  } else if (tactics) {
    const atkMods = FALLBACK_ATTACK_MODIFIERS[tactics.attackStyle];
    probs = applyModifiers(probs, atkMods);
    if (opponentTactics) {
      const defMods = getFallbackDefenseCounter(tactics.attackStyle, opponentTactics.infieldPosition, opponentTactics.outfieldPosition);
      probs = applyModifiers(probs, defMods);
    }
  }

  if (tactics?.offensiveAttack && opponentTactics?.defenseSetup && coefficients) {
    const rpsResult = OFFENSE_VS_DEFENSE[tactics.offensiveAttack][opponentTactics.defenseSetup];
    if (rpsResult === 'win') {
      const row = findCoefficient(coefficients, 'offensive_attack', tactics.offensiveAttack);
      if (row) probs = applyModifiers(probs, coefficientRowToMods(row));
    } else if (rpsResult === 'lose') {
      const row = findCoefficient(coefficients, 'defense_setup', opponentTactics.defenseSetup);
      if (row) probs = applyModifiers(probs, coefficientRowToMods(row));
    }
  } else if (tactics?.offensiveAttack && opponentTactics?.defenseSetup) {
    const rpsResult = OFFENSE_VS_DEFENSE[tactics.offensiveAttack][opponentTactics.defenseSetup];
    if (rpsResult === 'win') {
      probs = applyModifiers(probs, { '1B': 0.08, XBH: 0.06, BB: 0.05, GO: -0.06 });
    } else if (rpsResult === 'lose') {
      probs = applyModifiers(probs, { '1B': -0.06, GO: 0.08, FO: 0.04, BB: -0.05 });
    }
  }

  return probs;
}

export function rollOutcome(matchupRating: number, roll: number, tactics?: TacticsModifiers, opponentTactics?: TacticsModifiers, activePitcherStyle?: string, coefficients?: TacticCoefficientRow[]): AtBatOutcome {
  const probs = getOutcomeProbabilities(matchupRating, tactics, opponentTactics, activePitcherStyle, coefficients);

  let cumulative = 0;
  const entries: [AtBatOutcome, number][] = [
    ['HR', probs.HR],
    ['3B', probs.XBH * 0.3],
    ['2B', probs.XBH * 0.7],
    ['1B', probs['1B']],
    ['BB', probs.BB],
    ['SO', probs.SO],
    ['GO', probs.GO],
    ['FO', probs.FO],
  ];

  for (const [outcome, prob] of entries) {
    cumulative += prob;
    if (roll < cumulative) return outcome;
  }

  return 'FO';
}
