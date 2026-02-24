import { rng } from './rng';
import { matchupRating, errorChance, findFielderByPosition, pickRandomInfielder, pickRandomOutfielder } from './matchup';
import { rollOutcome, type TacticsModifiers } from './probability';
import { generateAtBatDescription, generateFlavorTexts } from './flavor';
import type {
  SimPlayer, SimTeam, AtBatResult, AtBatOutcome,
  InningHalf, BatterStats, PitcherStats, BoxScore, GameResult,
} from './types';

const HOME_ADVANTAGE = 8;

export interface PitchingConfig {
  sp: SimPlayer | null;
  r1: SimPlayer | null;
  closer: SimPlayer | null;
  maxPitches: number;
  maxInnings: number;
  maxBb: number;
  maxEr: number;
  r1MaxPitches: number;
  r1MaxEr: number;
  closerMaxPitches: number;
  closerMaxEr: number;
}

export interface SimConfig {
  homeLineup?: SimPlayer[];
  awayLineup?: SimPlayer[];
  homePitching?: PitchingConfig;
  awayPitching?: PitchingConfig;
  homeTactics?: TacticsModifiers;
  awayTactics?: TacticsModifiers;
  homeHasDH?: boolean;
  awayHasDH?: boolean;
}

interface ActivePitcher {
  player: SimPlayer;
  role: 'sp' | 'r1' | 'closer';
  pitchCount: number;
  inningsPitched: number;
  bbAllowed: number;
  erAllowed: number;
  hitsAllowed: number;
  soCount: number;
}

function simulatePitchCount(mr: number): { pitchCount: number; balls: number; strikes: number } {
  const r = rng();
  let balls = 0;
  let strikes = 0;
  let pitches = 0;

  while (balls < 4 && strikes < 3) {
    pitches++;
    const strikesProb = 0.45 + (mr < 0 ? Math.abs(mr) / 400 : -mr / 500);
    const ballsProb = 0.20 + mr / 400;
    const foulProb = 0.25;

    const roll = r.next();
    if (roll < Math.max(0.15, Math.min(0.55, strikesProb))) {
      strikes++;
    } else if (roll < Math.max(0.15, Math.min(0.55, strikesProb)) + Math.max(0.05, Math.min(0.40, ballsProb))) {
      balls++;
    } else if (strikes < 2 || r.next() > foulProb) {
      break;
    }

    if (pitches > 12) break;
  }

  return { pitchCount: Math.max(pitches, 1), balls, strikes };
}

function simulateAtBat(
  batter: SimPlayer,
  pitcher: SimPlayer,
  inning: number,
  isHome: boolean,
  tactics?: TacticsModifiers,
  opponentTactics?: TacticsModifiers,
): AtBatResult {
  const mr = matchupRating(batter, pitcher, inning) + (isHome ? HOME_ADVANTAGE : 0);
  const r = rng();

  const { pitchCount, balls, strikes } = simulatePitchCount(mr);

  if (balls >= 4) {
    return {
      outcome: 'BB',
      pitchCount,
      balls,
      strikes,
      rbiCount: 0,
      description: generateAtBatDescription('BB', batter.name, pitcher.name),
    };
  }
  if (strikes >= 3) {
    return {
      outcome: 'SO',
      pitchCount,
      balls,
      strikes: 3,
      rbiCount: 0,
      description: generateAtBatDescription('SO', batter.name, pitcher.name),
    };
  }

  const outcome = rollOutcome(mr, r.next(), tactics, opponentTactics);

  return {
    outcome,
    pitchCount,
    balls,
    strikes,
    rbiCount: 0,
    description: generateAtBatDescription(outcome, batter.name, pitcher.name),
  };
}

interface BaseState {
  first: SimPlayer | null;
  second: SimPlayer | null;
  third: SimPlayer | null;
}

function countRunners(bases: BaseState): number {
  return (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);
}

function advanceRunners(
  bases: BaseState,
  outcome: AtBatOutcome,
  batter: SimPlayer,
  outs: number = 0,
): { newBases: BaseState; runsScored: number; outsAdded: number } {
  let runs = 0;
  const r = rng();

  switch (outcome) {
    case 'HR':
      runs = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0) + 1;
      return { newBases: { first: null, second: null, third: null }, runsScored: runs, outsAdded: 0 };

    case '3B':
      runs = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);
      return { newBases: { first: null, second: null, third: batter }, runsScored: runs, outsAdded: 0 };

    case '2B':
      if (bases.third) runs++;
      if (bases.second) runs++;
      const fromFirst2B = bases.first && r.next() < 0.6 + batter.spd / 200;
      if (fromFirst2B) runs++;
      return {
        newBases: {
          first: null,
          second: batter,
          third: bases.first && !fromFirst2B ? bases.first : null,
        },
        runsScored: runs,
        outsAdded: 0,
      };

    case '1B':
      if (bases.third) runs++;
      const fromSecond = bases.second && r.next() < 0.55 + batter.spd / 200;
      if (fromSecond) runs++;
      return {
        newBases: {
          first: batter,
          second: bases.first || null,
          third: bases.second && !fromSecond ? bases.second : null,
        },
        runsScored: runs,
        outsAdded: 0,
      };

    case 'BB':
      if (bases.first && bases.second && bases.third) runs++;
      return {
        newBases: {
          first: batter,
          second: bases.first || bases.second || null,
          third: bases.second && bases.first ? (bases.third || bases.second) : bases.third || null,
        },
        runsScored: runs,
        outsAdded: 0,
      };

    case 'ERR':
      if (bases.third) runs++;
      return {
        newBases: {
          first: batter,
          second: bases.first || null,
          third: bases.second || null,
        },
        runsScored: runs,
        outsAdded: 0,
      };

    case 'GO': {
      const newBases: BaseState = {
        first: null,
        second: bases.first || null,
        third: bases.second || null,
      };
      if (bases.third && outs < 2) runs++;
      return { newBases, runsScored: runs, outsAdded: 1 };
    }

    case 'FO': {
      if (bases.third && outs < 2) {
        runs++;
        return {
          newBases: { first: bases.first, second: bases.second, third: null },
          runsScored: runs,
          outsAdded: 1,
        };
      }
      return { newBases: { ...bases }, runsScored: 0, outsAdded: 1 };
    }

    case 'GIDP': {
      return {
        newBases: { first: null, second: bases.second, third: bases.third },
        runsScored: 0,
        outsAdded: 2,
      };
    }

    default:
      return { newBases: bases, runsScored: 0, outsAdded: 0 };
  }
}

function shouldSubstitutePitcher(
  active: ActivePitcher,
  config: PitchingConfig,
  inning: number,
): boolean {
  if (active.role === 'sp') {
    return (
      active.pitchCount >= config.maxPitches ||
      active.inningsPitched >= config.maxInnings ||
      active.bbAllowed >= config.maxBb ||
      active.erAllowed >= config.maxEr
    );
  }
  if (active.role === 'r1') {
    return (
      active.pitchCount >= config.r1MaxPitches ||
      active.erAllowed >= config.r1MaxEr
    );
  }
  if (active.role === 'closer') {
    return (
      active.pitchCount >= config.closerMaxPitches ||
      active.erAllowed >= config.closerMaxEr
    );
  }
  return false;
}

function getNextPitcher(current: ActivePitcher, config: PitchingConfig): ActivePitcher | null {
  if (current.role === 'sp' && config.r1) {
    return {
      player: config.r1,
      role: 'r1',
      pitchCount: 0, inningsPitched: 0, bbAllowed: 0, erAllowed: 0, hitsAllowed: 0, soCount: 0,
    };
  }
  if ((current.role === 'sp' || current.role === 'r1') && config.closer) {
    return {
      player: config.closer,
      role: 'closer',
      pitchCount: 0, inningsPitched: 0, bbAllowed: 0, erAllowed: 0, hitsAllowed: 0, soCount: 0,
    };
  }
  return null;
}

interface HalfInningResult {
  half: InningHalf;
  nextBatterIndex: number;
  pitchesUsed: number;
  pitcher: ActivePitcher;
  substitutions: ActivePitcher[];
  batterIds: number[];
}

function simulateHalfInning(
  battingLineup: SimPlayer[],
  activePitcher: ActivePitcher,
  pitchingConfig: PitchingConfig | null,
  inning: number,
  isHome: boolean,
  batterIndex: number,
  defenseLineup: SimPlayer[],
  battingTactics?: TacticsModifiers,
  defenseTactics?: TacticsModifiers,
): HalfInningResult {
  let outs = 0;
  let runs = 0;
  let hits = 0;
  let errors = 0;
  let pitchesUsed = 0;
  let currentBatter = batterIndex;
  let bases: BaseState = { first: null, second: null, third: null };
  const events: AtBatResult[] = [];
  const substitutions: ActivePitcher[] = [];
  const batterIds: number[] = [];

  while (outs < 3) {
    if (pitchingConfig && shouldSubstitutePitcher(activePitcher, pitchingConfig, inning)) {
      const next = getNextPitcher(activePitcher, pitchingConfig);
      if (next) {
        substitutions.push({ ...activePitcher });
        activePitcher = next;
      }
    }

    const batter = battingLineup[currentBatter % battingLineup.length];
    const mr = matchupRating(batter, activePitcher.player, inning) + (isHome ? HOME_ADVANTAGE : 0);
    const result = simulateAtBat(batter, activePitcher.player, inning, isHome, battingTactics, defenseTactics);
    pitchesUsed += result.pitchCount;
    activePitcher.pitchCount += result.pitchCount;

    let outcome = result.outcome;

    if (outcome === 'GO' || outcome === 'FO') {
      const r = rng();
      const playIProb = 0.65 - mr / 100;
      const isPlayI = r.next() < Math.max(0.25, Math.min(0.85, playIProb));

      let defRating: number;
      if (isPlayI) {
        const firstBaseman = findFielderByPosition(defenseLineup, '1B');
        const otherInfielder = pickRandomInfielder(defenseLineup, r.next());
        const fb = firstBaseman ? firstBaseman.def : 50;
        defRating = (fb + otherInfielder.def) / 2;
      } else {
        const outfielder = pickRandomOutfielder(defenseLineup, r.next());
        defRating = outfielder.def;
      }

      const errRoll = r.next();
      if (errRoll < errorChance(defRating)) {
        outcome = 'ERR';
        result.outcome = 'ERR';
        result.description = generateAtBatDescription('ERR', batter.name, activePitcher.player.name);
      } else {
        const finalPlay = isPlayI ? 'GO' : 'FO';
        if (finalPlay !== outcome) {
          result.description = generateAtBatDescription(finalPlay, batter.name, activePitcher.player.name);
        }
        outcome = finalPlay;
        result.outcome = finalPlay;
      }

      if (outcome === 'GO' && bases.first && bases.second && bases.third) {
        outcome = 'GIDP';
        result.outcome = 'GIDP';
        result.description = generateAtBatDescription('GIDP', batter.name, activePitcher.player.name);
      }
    }

    if (outcome === 'SO') {
      outs++;
      activePitcher.soCount++;
    } else if (['GO', 'FO', 'GIDP', 'ERR', 'HR', '3B', '2B', '1B', 'BB'].includes(outcome)) {
      const { newBases, runsScored, outsAdded } = advanceRunners(bases, outcome, batter, outs);
      bases = newBases;
      outs += outsAdded;
      runs += runsScored;
      result.rbiCount = runsScored;
      activePitcher.erAllowed += runsScored;

      if (['HR', '3B', '2B', '1B'].includes(outcome)) {
        hits++;
        activePitcher.hitsAllowed++;
      }
      if (outcome === 'BB') activePitcher.bbAllowed++;
      if (outcome === 'ERR') errors++;
    }

    events.push(result);
    batterIds.push(batter.id);
    currentBatter++;

    if (events.length > 30) break;
  }

  activePitcher.inningsPitched++;

  return {
    half: { runs, hits, errors, outs: Math.min(outs, 3), events },
    nextBatterIndex: currentBatter,
    pitchesUsed,
    pitcher: activePitcher,
    substitutions,
    batterIds,
  };
}

function buildBatterStatsFromIds(
  events: AtBatResult[],
  batterIds: number[],
  allPlayers: SimPlayer[],
): BatterStats[] {
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));
  const statsMap = new Map<number, BatterStats>();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const batterId = batterIds[i];
    const player = playerMap.get(batterId);
    if (!player) continue;

    if (!statsMap.has(batterId)) {
      statsMap.set(batterId, {
        playerId: batterId,
        name: player.name,
        ab: 0, hits: 0, hr: 0, rbi: 0, bb: 0, so: 0, avg: '.000',
      });
    }
    const stats = statsMap.get(batterId)!;
    if (event.outcome !== 'BB') stats.ab++;
    if (['HR', '3B', '2B', '1B'].includes(event.outcome)) stats.hits++;
    if (event.outcome === 'HR') stats.hr++;
    if (event.outcome === 'BB') stats.bb++;
    if (event.outcome === 'SO') stats.so++;
    stats.rbi += event.rbiCount;
  }

  const allStats = Array.from(statsMap.values());
  for (const stats of allStats) {
    stats.avg = stats.ab > 0 ? (stats.hits / stats.ab).toFixed(3).replace(/^0/, '') : '.000';
  }

  return allStats.filter(s => s.ab > 0 || s.bb > 0);
}

function getStartingLineup(players: SimPlayer[], hasDH: boolean, sp?: SimPlayer): SimPlayer[] {
  const pitcherIds = new Set<number>();
  const pitchers = players.filter(p => p.positions.includes('P'));
  pitchers.forEach(p => pitcherIds.add(p.id));
  if (sp) pitcherIds.add(sp.id);

  const nonPitchers = players.filter(p => !pitcherIds.has(p.id));

  if (hasDH) {
    return nonPitchers.slice(0, 9);
  } else {
    const lineup = nonPitchers.slice(0, 8);
    if (sp) {
      lineup.push(sp);
    } else if (pitchers.length > 0) {
      lineup.push(pitchers[0]);
    }
    return lineup;
  }
}

function getStartingPitcher(players: SimPlayer[]): SimPlayer {
  const pitchers = players.filter(p => p.positions.includes('P'));
  if (pitchers.length === 0) return players[0];
  return pitchers.reduce((best, p) =>
    (p.vel * 0.3 + p.ctl * 0.25 + p.mov * 0.25 + p.sta * 0.2) >
    (best.vel * 0.3 + best.ctl * 0.25 + best.mov * 0.25 + best.sta * 0.2) ? p : best
  );
}

function buildPitchingConfigInternal(players: SimPlayer[], config?: PitchingConfig): { pitcher: ActivePitcher; config: PitchingConfig } {
  if (config && config.sp) {
    return {
      pitcher: {
        player: config.sp,
        role: 'sp',
        pitchCount: 0, inningsPitched: 0, bbAllowed: 0, erAllowed: 0, hitsAllowed: 0, soCount: 0,
      },
      config,
    };
  }

  const sp = getStartingPitcher(players);
  const pitchers = players.filter(p => p.positions.includes('P') && p.id !== sp.id);
  return {
    pitcher: {
      player: sp,
      role: 'sp',
      pitchCount: 0, inningsPitched: 0, bbAllowed: 0, erAllowed: 0, hitsAllowed: 0, soCount: 0,
    },
    config: {
      sp,
      r1: pitchers[0] || null,
      closer: pitchers[1] || null,
      maxPitches: 100, maxInnings: 7, maxBb: 4, maxEr: 4,
      r1MaxPitches: 40, r1MaxEr: 3,
      closerMaxPitches: 30, closerMaxEr: 2,
    },
  };
}

function activePitcherToStats(ap: ActivePitcher, totalInnings: number): PitcherStats {
  return {
    playerId: ap.player.id,
    name: ap.player.name,
    ip: ap.inningsPitched,
    h: ap.hitsAllowed,
    er: ap.erAllowed,
    bb: ap.bbAllowed,
    so: ap.soCount,
    pitchCount: ap.pitchCount,
  };
}

function swapPitcherInLineup(lineup: SimPlayer[], oldPitcherId: number, newPitcher: SimPlayer): void {
  const idx = lineup.findIndex(p => p.id === oldPitcherId);
  if (idx >= 0) {
    lineup[idx] = newPitcher;
  }
}

export function simulateGame(
  homeTeam: SimTeam,
  awayTeam: SimTeam,
  homePlayers: SimPlayer[],
  awayPlayers: SimPlayer[],
  config?: SimConfig,
): GameResult {
  const homeHasDH = config?.homeHasDH ?? true;
  const awayHasDH = config?.awayHasDH ?? true;

  const homeP = buildPitchingConfigInternal(homePlayers, config?.homePitching);
  const awayP = buildPitchingConfigInternal(awayPlayers, config?.awayPitching);

  const homeLineup = [...(config?.homeLineup || getStartingLineup(homePlayers, homeHasDH, homeP.pitcher.player))];
  const awayLineup = [...(config?.awayLineup || getStartingLineup(awayPlayers, awayHasDH, awayP.pitcher.player))];

  let homeActivePitcher = homeP.pitcher;
  let awayActivePitcher = awayP.pitcher;

  let homePitcherIdInLineup = homeHasDH ? -1 : homeP.pitcher.player.id;
  let awayPitcherIdInLineup = awayHasDH ? -1 : awayP.pitcher.player.id;

  const innings: number[] = [];
  const awayLine: number[] = [];
  const homeLine: number[] = [];

  let homeScore = 0;
  let awayScore = 0;
  let homeBatterIdx = 0;
  let awayBatterIdx = 0;

  let allAwayEvents: AtBatResult[] = [];
  let allHomeEvents: AtBatResult[] = [];
  let allAwayBatterIds: number[] = [];
  let allHomeBatterIds: number[] = [];

  const allHomePitchers: ActivePitcher[] = [];
  const allAwayPitchers: ActivePitcher[] = [];

  let totalInnings = 9;

  for (let inning = 1; inning <= totalInnings; inning++) {
    innings.push(inning);

    const topHalf = simulateHalfInning(
      awayLineup, homeActivePitcher, homeP.config, inning, false, awayBatterIdx, homeLineup,
      config?.awayTactics, config?.homeTactics
    );
    awayScore += topHalf.half.runs;
    awayLine.push(topHalf.half.runs);
    awayBatterIdx = topHalf.nextBatterIndex;
    allAwayEvents.push(...topHalf.half.events);
    allAwayBatterIds.push(...topHalf.batterIds);
    allHomePitchers.push(...topHalf.substitutions);

    if (topHalf.substitutions.length > 0 && !homeHasDH) {
      const prevPitcherId = homePitcherIdInLineup;
      const newPitcher = topHalf.pitcher.player;
      swapPitcherInLineup(homeLineup, prevPitcherId, newPitcher);
      homePitcherIdInLineup = newPitcher.id;
    }
    homeActivePitcher = topHalf.pitcher;

    if (inning === totalInnings && homeScore > awayScore) {
      homeLine.push(0);
      continue;
    }

    const bottomHalf = simulateHalfInning(
      homeLineup, awayActivePitcher, awayP.config, inning, true, homeBatterIdx, awayLineup,
      config?.homeTactics, config?.awayTactics
    );
    homeScore += bottomHalf.half.runs;
    homeLine.push(bottomHalf.half.runs);
    homeBatterIdx = bottomHalf.nextBatterIndex;
    allHomeEvents.push(...bottomHalf.half.events);
    allHomeBatterIds.push(...bottomHalf.batterIds);
    allAwayPitchers.push(...bottomHalf.substitutions);

    if (bottomHalf.substitutions.length > 0 && !awayHasDH) {
      const prevPitcherId = awayPitcherIdInLineup;
      const newPitcher = bottomHalf.pitcher.player;
      swapPitcherInLineup(awayLineup, prevPitcherId, newPitcher);
      awayPitcherIdInLineup = newPitcher.id;
    }
    awayActivePitcher = bottomHalf.pitcher;

    if (inning >= 9 && homeScore !== awayScore) {
      break;
    }

    if (inning === totalInnings && homeScore === awayScore) {
      totalInnings++;
    }
  }

  allHomePitchers.push(homeActivePitcher);
  allAwayPitchers.push(awayActivePitcher);

  const awayHits = allAwayEvents.filter(e => ['HR', '3B', '2B', '1B'].includes(e.outcome)).length;
  const homeHits = allHomeEvents.filter(e => ['HR', '3B', '2B', '1B'].includes(e.outcome)).length;
  const awayErrors = allAwayEvents.filter(e => e.outcome === 'ERR').length;
  const homeErrors = allHomeEvents.filter(e => e.outcome === 'ERR').length;

  const allKnownPlayers = [...homePlayers, ...awayPlayers];
  const awayBatters = buildBatterStatsFromIds(allAwayEvents, allAwayBatterIds, allKnownPlayers);
  const homeBatters = buildBatterStatsFromIds(allHomeEvents, allHomeBatterIds, allKnownPlayers);

  const homePitcherStats = allHomePitchers.map(ap => activePitcherToStats(ap, innings.length));
  const awayPitcherStats = allAwayPitchers.map(ap => activePitcherToStats(ap, innings.length));

  const mainHomePitcher = homePitcherStats[0] || { playerId: homeActivePitcher.player.id, name: homeActivePitcher.player.name, ip: innings.length, h: awayHits, er: awayScore, bb: 0, so: 0, pitchCount: 0 };
  const mainAwayPitcher = awayPitcherStats[0] || { playerId: awayActivePitcher.player.id, name: awayActivePitcher.player.name, ip: innings.length, h: homeHits, er: homeScore, bb: 0, so: 0, pitchCount: 0 };

  const boxScore: BoxScore = {
    innings,
    awayLine,
    homeLine,
    awayRHE: [awayScore, awayHits, awayErrors],
    homeRHE: [homeScore, homeHits, homeErrors],
    awayBatters,
    homeBatters,
    awayPitcher: mainAwayPitcher,
    homePitcher: mainHomePitcher,
    awayPitchers: awayPitcherStats,
    homePitchers: homePitcherStats,
  };

  const allBattersList = [...awayBatters, ...homeBatters];
  const mvpBatter = allBattersList.length > 0 ? allBattersList.reduce((best, b) =>
    (b.hr * 4 + b.rbi * 2 + b.hits) > (best.hr * 4 + best.rbi * 2 + best.hits) ? b : best,
    allBattersList[0]
  ) : null;

  const topSoPitcher = [...homePitcherStats, ...awayPitcherStats].reduce(
    (best, p) => p.so > best.so ? p : best,
    { playerId: 0, name: '', ip: 0, h: 0, er: 0, bb: 0, so: 0, pitchCount: 0 }
  );
  const mvpIsPitcher = topSoPitcher.so >= 7 && (!mvpBatter || mvpBatter.hr < 2);

  const mvp = mvpIsPitcher
    ? { name: topSoPitcher.name, reason: `${topSoPitcher.so} strikeouts in ${topSoPitcher.ip} innings` }
    : mvpBatter
    ? { name: mvpBatter.name, reason: `${mvpBatter.hits}-for-${mvpBatter.ab}, ${mvpBatter.hr} HR, ${mvpBatter.rbi} RBI` }
    : { name: 'Unknown', reason: '' };

  const result: GameResult = {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    boxScore,
    flavorTexts: [],
    mvp,
  };

  result.flavorTexts = generateFlavorTexts(result, homeActivePitcher.player, awayActivePitcher.player);

  return result;
}
