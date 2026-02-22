import { simulateGame } from '../shared/calculations/simulate';
import { resetRng } from '../shared/calculations/rng';
import type { SimConfig, PitchingConfig } from '../shared/calculations/simulate';
import type { TacticsModifiers } from '../shared/calculations/probability';
import type { SimPlayer, SimTeam } from '../shared/calculations/types';
import { storage } from './storage';

interface SimulationResult {
  matchId: number;
  homeScore: number;
  awayScore: number;
  details: any;
}

function buildLineupFromSaved(lineup: any, players: SimPlayer[], rotation: any): SimPlayer[] {
  if (!lineup?.fieldPositions) return [];
  const positions = lineup.fieldPositions as Record<string, number | null>;
  const order = lineup.battingOrder as number[] | undefined;

  const positionPlayers: SimPlayer[] = [];
  for (const [_pos, playerId] of Object.entries(positions)) {
    if (playerId) {
      const p = players.find(pl => pl.id === playerId);
      if (p) positionPlayers.push(p);
    }
  }

  if (rotation?.roles?.sp) {
    const sp = players.find(p => p.id === rotation.roles.sp);
    if (sp && !positionPlayers.find(p => p.id === sp.id)) {
      positionPlayers.push(sp);
    }
  }

  if (order && order.length > 0) {
    const ordered: SimPlayer[] = [];
    for (const id of order) {
      const p = positionPlayers.find(pl => pl.id === id);
      if (p) ordered.push(p);
    }
    for (const p of positionPlayers) {
      if (!ordered.find(o => o.id === p.id)) ordered.push(p);
    }
    return ordered;
  }
  return positionPlayers;
}

function buildPitchingConfig(rotation: any, players: SimPlayer[]): PitchingConfig | undefined {
  if (!rotation?.roles) return undefined;
  const findPlayer = (id: number | null) => id ? players.find(p => p.id === id) || null : null;
  return {
    sp: findPlayer(rotation.roles.sp),
    r1: findPlayer(rotation.roles.r1),
    closer: findPlayer(rotation.roles.closer),
    maxPitches: rotation.maxPitches ?? 100,
    maxInnings: rotation.maxInnings ?? 7,
    maxBb: rotation.maxBb ?? 4,
    maxEr: rotation.maxEr ?? 4,
    r1MaxPitches: rotation.r1MaxPitches ?? 40,
    r1MaxEr: rotation.r1MaxEr ?? 3,
    closerMaxPitches: rotation.closerMaxPitches ?? 30,
    closerMaxEr: rotation.closerMaxEr ?? 2,
  };
}

function buildTactics(tac: any): TacticsModifiers | undefined {
  if (!tac) return undefined;
  return {
    attackStyle: tac.attackStyle || 'neutral',
    infieldPosition: tac.infieldPosition || 'neutral',
    outfieldPosition: tac.outfieldPosition || 'neutral',
  };
}

function computeDivisionStandings(allMatches: any[], divTeamIds: number[]) {
  const divSet = new Set(divTeamIds);
  const played = allMatches.filter(m => m.played && m.matchType === 'regular');
  const stats: Record<number, { w: number; l: number; rf: number; ra: number }> = {};
  for (const id of divTeamIds) stats[id] = { w: 0, l: 0, rf: 0, ra: 0 };
  for (const m of played) {
    const hs = m.homeScore ?? 0;
    const as_ = m.awayScore ?? 0;
    if (divSet.has(m.homeTeamId)) {
      stats[m.homeTeamId].rf += hs;
      stats[m.homeTeamId].ra += as_;
      if (hs > as_) stats[m.homeTeamId].w++;
      else if (hs < as_) stats[m.homeTeamId].l++;
    }
    if (divSet.has(m.awayTeamId)) {
      stats[m.awayTeamId].rf += as_;
      stats[m.awayTeamId].ra += hs;
      if (as_ > hs) stats[m.awayTeamId].w++;
      else if (as_ < hs) stats[m.awayTeamId].l++;
    }
  }
  return divTeamIds
    .map(id => ({ id, ...stats[id] }))
    .sort((a, b) => {
      const pctA = a.w + a.l > 0 ? a.w / (a.w + a.l) : 0;
      const pctB = b.w + b.l > 0 ? b.w / (b.w + b.l) : 0;
      if (pctB !== pctA) return pctB - pctA;
      return (b.rf - b.ra) - (a.rf - a.ra);
    });
}

export async function updatePlayoffMatchups(): Promise<{ updated: number }> {
  const allMatches = await storage.getAllMatches();
  const allTeams = await storage.getTeams();

  let updated = 0;

  for (const league of ['L1', 'L2']) {
    const serieATeams = allTeams.filter(t => t.league === league && t.series === 'A');
    const serieBTeams = allTeams.filter(t => t.league === league && t.series === 'B');
    const divA = `${league}A`;
    const divB = `${league}B`;

    const standingsA = computeDivisionStandings(allMatches, serieATeams.map(t => t.id));
    const standingsB = computeDivisionStandings(allMatches, serieBTeams.map(t => t.id));

    const a9th = standingsA[8]?.id;
    const a10th = standingsA[9]?.id;
    const b1st = standingsB[0]?.id;
    const b2nd = standingsB[1]?.id;

    if (!a9th || !a10th || !b1st || !b2nd) continue;

    const playoffDay13 = allMatches.filter(m =>
      m.matchType === 'playoff' && m.day === 13 && m.division === `playoff_${league}`
    );
    const playoffDay14 = allMatches.filter(m =>
      m.matchType === 'playoff' && m.day === 14 && m.division === `playoff_${league}`
    );

    if (playoffDay13.length >= 2) {
      await storage.updateMatchTeams(playoffDay13[0].id, a9th, b1st);
      await storage.updateMatchTeams(playoffDay13[1].id, a10th, b2nd);
      updated += 2;
    }

    if (playoffDay14.length >= 2 && playoffDay13.every((m: any) => m.played)) {
      const match1 = allMatches.find(m => m.id === playoffDay13[0].id);
      const match2 = allMatches.find(m => m.id === playoffDay13[1].id);
      if (match1?.played && match2?.played) {
        const winner1 = (match1.homeScore ?? 0) > (match1.awayScore ?? 0) ? match1.homeTeamId : match1.awayTeamId;
        const loser1 = (match1.homeScore ?? 0) > (match1.awayScore ?? 0) ? match1.awayTeamId : match1.homeTeamId;
        const winner2 = (match2.homeScore ?? 0) > (match2.awayScore ?? 0) ? match2.homeTeamId : match2.awayTeamId;
        const loser2 = (match2.homeScore ?? 0) > (match2.awayScore ?? 0) ? match2.awayTeamId : match2.homeTeamId;
        await storage.updateMatchTeams(playoffDay14[0].id, winner1, winner2);
        await storage.updateMatchTeams(playoffDay14[1].id, loser1, loser2);
        updated += 2;
      }
    }
  }

  return { updated };
}

export async function simulateMatchDay(day: number): Promise<SimulationResult[]> {
  if (day >= 13) {
    await updatePlayoffMatchups();
  }

  const allMatches = await storage.getAllMatches();
  const dayMatches = allMatches.filter(m => m.day === day && !m.played && m.homeTeamId > 0 && m.awayTeamId > 0);

  if (dayMatches.length === 0) return [];

  const results: SimulationResult[] = [];

  for (const match of dayMatches) {
    try {
      const [homePlayers, awayPlayers] = await Promise.all([
        storage.getPlayersByTeam(match.homeTeamId),
        storage.getPlayersByTeam(match.awayTeamId),
      ]);

      const [homeTeamData, awayTeamData] = await Promise.all([
        storage.getTeam(match.homeTeamId),
        storage.getTeam(match.awayTeamId),
      ]);

      const [homeLineup, awayLineup, homeRotation, awayRotation, homeTactics, awayTactics] = await Promise.all([
        storage.getLineup(match.homeTeamId),
        storage.getLineup(match.awayTeamId),
        storage.getPitcherRotation(match.homeTeamId),
        storage.getPitcherRotation(match.awayTeamId),
        storage.getTactics(match.homeTeamId),
        storage.getTactics(match.awayTeamId),
      ]);

      const homeTeam: SimTeam = {
        id: match.homeTeamId,
        name: homeTeamData?.name || 'Home',
        division: match.division,
      };
      const awayTeam: SimTeam = {
        id: match.awayTeamId,
        name: awayTeamData?.name || 'Away',
        division: match.division,
      };

      const homeSimPlayers = homePlayers as SimPlayer[];
      const awaySimPlayers = awayPlayers as SimPlayer[];

      const homeBuiltLineup = buildLineupFromSaved(homeLineup, homeSimPlayers, homeRotation);
      const awayBuiltLineup = buildLineupFromSaved(awayLineup, awaySimPlayers, awayRotation);

      const simConfig: SimConfig = {
        homeLineup: homeBuiltLineup.length >= 9 ? homeBuiltLineup : undefined,
        awayLineup: awayBuiltLineup.length >= 9 ? awayBuiltLineup : undefined,
        homePitching: buildPitchingConfig(homeRotation, homeSimPlayers),
        awayPitching: buildPitchingConfig(awayRotation, awaySimPlayers),
        homeTactics: buildTactics(homeTactics),
        awayTactics: buildTactics(awayTactics),
      };

      resetRng();
      const gameResult = simulateGame(homeTeam, awayTeam, homeSimPlayers, awaySimPlayers, simConfig);

      await storage.updateMatchResult(match.id, gameResult.homeScore, gameResult.awayScore);

      const details = {
        boxScore: gameResult.boxScore,
        flavorTexts: gameResult.flavorTexts,
        mvp: gameResult.mvp,
        homeLineup: { playerIds: (simConfig.homeLineup || homeSimPlayers.slice(0, 9)).map(p => p.id), pitcherId: gameResult.boxScore.homePitcher.playerId },
        awayLineup: { playerIds: (simConfig.awayLineup || awaySimPlayers.slice(0, 9)).map(p => p.id), pitcherId: gameResult.boxScore.awayPitcher.playerId },
        homeBatters: gameResult.boxScore.homeBatters,
        awayBatters: gameResult.boxScore.awayBatters,
        homePitcher: gameResult.boxScore.homePitcher,
        awayPitcher: gameResult.boxScore.awayPitcher,
        homePitchers: gameResult.boxScore.homePitchers || [gameResult.boxScore.homePitcher],
        awayPitchers: gameResult.boxScore.awayPitchers || [gameResult.boxScore.awayPitcher],
      };

      try {
        await storage.createMatchDetails({
          matchId: match.id,
          ...details,
        });
      } catch (err) {
        console.error(`Failed to save details for match ${match.id}:`, err);
      }

      results.push({
        matchId: match.id,
        homeScore: gameResult.homeScore,
        awayScore: gameResult.awayScore,
        details,
      });
    } catch (err) {
      console.error(`Failed to simulate match ${match.id}:`, err);
    }
  }

  return results;
}
