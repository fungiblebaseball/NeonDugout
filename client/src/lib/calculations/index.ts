export { matchupRating, teamDefenseAvg, gidpChance, errorChance } from './matchup';
export { simulateGame } from './simulate';
export type { SimConfig, PitchingConfig, PitcherRoleSimConfig, TacticSchedules, TacticScheduleConfig, TacticSlot, GameState } from './simulate';
export { rollOutcome, getOutcomeProbabilities } from './probability';
export type { TacticsModifiers, TacticCoefficientRow } from './probability';
export { resetRng, rng, SeededRNG } from './rng';
export { generateFlavorTexts, generateAtBatDescription } from './flavor';
export type * from './types';
