import type { AtBatOutcome } from './types';

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
  return PROBABILITY_TABLE[bracket];
}

export function getOutcomeProbabilities(matchupRating: number): OutcomeProbabilities {
  return interpolateBrackets(matchupRating);
}

export function rollOutcome(matchupRating: number, roll: number): AtBatOutcome {
  const probs = getOutcomeProbabilities(matchupRating);

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
