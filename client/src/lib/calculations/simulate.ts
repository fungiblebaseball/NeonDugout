import { rng } from './rng';
import { matchupRating, teamDefenseAvg, gidpChance, errorChance } from './matchup';
import { rollOutcome } from './probability';
import { generateAtBatDescription, generateFlavorTexts } from './flavor';
import type {
  SimPlayer, SimTeam, AtBatResult, AtBatOutcome,
  InningHalf, BatterStats, PitcherStats, BoxScore, GameResult,
} from './types';

const HOME_ADVANTAGE = 8;

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

export function simulateAtBat(
  batter: SimPlayer,
  pitcher: SimPlayer,
  inning: number,
  isHome: boolean,
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

  const outcome = rollOutcome(mr, r.next());

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
): { newBases: BaseState; runsScored: number } {
  let runs = 0;
  const r = rng();

  switch (outcome) {
    case 'HR':
      runs = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0) + 1;
      return { newBases: { first: null, second: null, third: null }, runsScored: runs };

    case '3B':
      runs = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);
      return { newBases: { first: null, second: null, third: batter }, runsScored: runs };

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
      };

    case 'ERR':
      if (bases.third) { runs++; }
      return {
        newBases: {
          first: batter,
          second: bases.first || null,
          third: bases.second || null,
        },
        runsScored: runs,
      };

    default:
      return { newBases: bases, runsScored: 0 };
  }
}

function simulateHalfInning(
  battingLineup: SimPlayer[],
  pitcher: SimPlayer,
  inning: number,
  isHome: boolean,
  batterIndex: number,
  defenseLineup: SimPlayer[],
): { half: InningHalf; nextBatterIndex: number; pitchesUsed: number } {
  let outs = 0;
  let runs = 0;
  let hits = 0;
  let errors = 0;
  let pitchesUsed = 0;
  let currentBatter = batterIndex;
  let bases: BaseState = { first: null, second: null, third: null };
  const events: AtBatResult[] = [];

  const infieldDef = teamDefenseAvg(defenseLineup, 'infield');
  const outfieldDef = teamDefenseAvg(defenseLineup, 'outfield');

  while (outs < 3) {
    const batter = battingLineup[currentBatter % battingLineup.length];
    const result = simulateAtBat(batter, pitcher, inning, isHome);
    pitchesUsed += result.pitchCount;

    let outcome = result.outcome;

    if ((outcome === 'GO') && bases.first && outs < 2) {
      const gdpRoll = rng().next();
      const gdpProb = gidpChance(batter.spd, bases.first.spd, infieldDef);
      if (gdpRoll < gdpProb) {
        outcome = 'GIDP';
        result.outcome = 'GIDP';
        result.description = generateAtBatDescription('GIDP', batter.name, pitcher.name);
      }
    }

    if (outcome === 'GO' || outcome === 'FO') {
      const defRating = outcome === 'GO' ? infieldDef : outfieldDef;
      const errRoll = rng().next();
      if (errRoll < errorChance(defRating)) {
        outcome = 'ERR';
        result.outcome = 'ERR';
        result.description = generateAtBatDescription('ERR', batter.name, pitcher.name);
      }
    }

    if (outcome === 'GIDP') {
      outs += 2;
      bases.first = null;
    } else if (['GO', 'FO', 'SO'].includes(outcome)) {
      outs++;
    } else {
      const { newBases, runsScored } = advanceRunners(bases, outcome, batter);
      bases = newBases;
      const scored = runsScored;
      runs += scored;
      result.rbiCount = scored;

      if (['HR', '3B', '2B', '1B'].includes(outcome)) hits++;
      if (outcome === 'ERR') errors++;
    }

    events.push(result);
    currentBatter++;

    if (events.length > 30) break;
  }

  return {
    half: { runs, hits, errors, outs: Math.min(outs, 3), events },
    nextBatterIndex: currentBatter,
    pitchesUsed,
  };
}

function buildBatterStats(events: AtBatResult[], lineup: SimPlayer[]): BatterStats[] {
  const statsMap = new Map<number, BatterStats>();
  lineup.forEach(p => {
    statsMap.set(p.id, {
      playerId: p.id,
      name: p.name,
      ab: 0, hits: 0, hr: 0, rbi: 0, bb: 0, so: 0, avg: '.000',
    });
  });

  let batterIdx = 0;
  for (const event of events) {
    const batter = lineup[batterIdx % lineup.length];
    const stats = statsMap.get(batter.id)!;
    if (event.outcome !== 'BB') stats.ab++;
    if (['HR', '3B', '2B', '1B'].includes(event.outcome)) stats.hits++;
    if (event.outcome === 'HR') stats.hr++;
    if (event.outcome === 'BB') stats.bb++;
    if (event.outcome === 'SO') stats.so++;
    stats.rbi += event.rbiCount;
    batterIdx++;
  }

  const allStats = Array.from(statsMap.values());
  for (const stats of allStats) {
    stats.avg = stats.ab > 0 ? (stats.hits / stats.ab).toFixed(3).replace(/^0/, '') : '.000';
  }

  return allStats.filter(s => s.ab > 0 || s.bb > 0);
}

function getStartingLineup(players: SimPlayer[]): SimPlayer[] {
  const pitchers = players.filter(p => p.positions.includes('P'));
  const nonPitchers = players.filter(p => !p.positions.includes('P'));

  const lineup = nonPitchers.slice(0, 9);
  while (lineup.length < 9 && pitchers.length > 1) {
    lineup.push(pitchers.pop()!);
  }
  return lineup;
}

function getStartingPitcher(players: SimPlayer[]): SimPlayer {
  const pitchers = players.filter(p => p.positions.includes('P'));
  if (pitchers.length === 0) return players[0];
  return pitchers.reduce((best, p) =>
    (p.vel * 0.3 + p.ctl * 0.25 + p.mov * 0.25 + p.sta * 0.2) >
    (best.vel * 0.3 + best.ctl * 0.25 + best.mov * 0.25 + best.sta * 0.2) ? p : best
  );
}

export function simulateGame(
  homeTeam: SimTeam,
  awayTeam: SimTeam,
  homePlayers: SimPlayer[],
  awayPlayers: SimPlayer[],
): GameResult {
  const homeLineup = getStartingLineup(homePlayers);
  const awayLineup = getStartingLineup(awayPlayers);
  const homePitcher = getStartingPitcher(homePlayers);
  const awayPitcher = getStartingPitcher(awayPlayers);

  const innings: number[] = [];
  const awayLine: number[] = [];
  const homeLine: number[] = [];

  let homeScore = 0;
  let awayScore = 0;
  let homeBatterIdx = 0;
  let awayBatterIdx = 0;
  let homePitchCount = 0;
  let awayPitchCount = 0;

  let allAwayEvents: AtBatResult[] = [];
  let allHomeEvents: AtBatResult[] = [];

  let totalInnings = 9;

  for (let inning = 1; inning <= totalInnings; inning++) {
    innings.push(inning);

    const topHalf = simulateHalfInning(
      awayLineup, homePitcher, inning, false, awayBatterIdx, homeLineup
    );
    awayScore += topHalf.half.runs;
    awayLine.push(topHalf.half.runs);
    awayBatterIdx = topHalf.nextBatterIndex;
    homePitchCount += topHalf.pitchesUsed;
    allAwayEvents.push(...topHalf.half.events);

    if (inning === totalInnings && homeScore > awayScore) {
      homeLine.push(0);
      continue;
    }

    const bottomHalf = simulateHalfInning(
      homeLineup, awayPitcher, inning, true, homeBatterIdx, awayLineup
    );
    homeScore += bottomHalf.half.runs;
    homeLine.push(bottomHalf.half.runs);
    homeBatterIdx = bottomHalf.nextBatterIndex;
    awayPitchCount += bottomHalf.pitchesUsed;
    allHomeEvents.push(...bottomHalf.half.events);

    if (inning >= 9 && homeScore !== awayScore) {
      break;
    }

    if (inning === totalInnings && homeScore === awayScore) {
      totalInnings++;
    }
  }

  const awayHits = allAwayEvents.filter(e => ['HR', '3B', '2B', '1B'].includes(e.outcome)).length;
  const homeHits = allHomeEvents.filter(e => ['HR', '3B', '2B', '1B'].includes(e.outcome)).length;
  const awayErrors = allAwayEvents.filter(e => e.outcome === 'ERR').length;
  const homeErrors = allHomeEvents.filter(e => e.outcome === 'ERR').length;

  const awayBatters = buildBatterStats(allAwayEvents, awayLineup);
  const homeBatters = buildBatterStats(allHomeEvents, homeLineup);

  const awayPStats: PitcherStats = {
    playerId: awayPitcher.id,
    name: awayPitcher.name,
    ip: innings.length,
    h: homeHits,
    er: homeScore,
    bb: allHomeEvents.filter(e => e.outcome === 'BB').length,
    so: allHomeEvents.filter(e => e.outcome === 'SO').length,
    pitchCount: awayPitchCount,
  };

  const homePStats: PitcherStats = {
    playerId: homePitcher.id,
    name: homePitcher.name,
    ip: innings.length,
    h: awayHits,
    er: awayScore,
    bb: allAwayEvents.filter(e => e.outcome === 'BB').length,
    so: allAwayEvents.filter(e => e.outcome === 'SO').length,
    pitchCount: homePitchCount,
  };

  const boxScore: BoxScore = {
    innings,
    awayLine,
    homeLine,
    awayRHE: [awayScore, awayHits, awayErrors],
    homeRHE: [homeScore, homeHits, homeErrors],
    awayBatters,
    homeBatters,
    awayPitcher: awayPStats,
    homePitcher: homePStats,
  };

  const allBatters = [...awayBatters, ...homeBatters];
  const mvpBatter = allBatters.reduce((best, b) =>
    (b.hr * 4 + b.rbi * 2 + b.hits) > (best.hr * 4 + best.rbi * 2 + best.hits) ? b : best,
    allBatters[0]
  );

  const mvpPitcher = homePStats.so > awayPStats.so ? homePStats : awayPStats;
  const mvpIsPitcher = mvpPitcher.so >= 7 && mvpBatter.hr < 2;

  const mvp = mvpIsPitcher
    ? { name: mvpPitcher.name, reason: `${mvpPitcher.so} strikeouts in ${mvpPitcher.ip} innings` }
    : { name: mvpBatter.name, reason: `${mvpBatter.hits}-for-${mvpBatter.ab}, ${mvpBatter.hr} HR, ${mvpBatter.rbi} RBI` };

  const result: GameResult = {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    boxScore,
    flavorTexts: [],
    mvp,
  };

  result.flavorTexts = generateFlavorTexts(result, homePitcher, awayPitcher);

  return result;
}
