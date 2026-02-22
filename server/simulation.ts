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

export async function simulateMatchDay(day: number): Promise<SimulationResult[]> {
  const allMatches = await storage.getAllMatches();
  const dayMatches = allMatches.filter(m => m.day === day && !m.played && m.matchType !== 'playoff');

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
