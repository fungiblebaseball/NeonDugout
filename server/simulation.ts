import { simulateGame } from '../shared/calculations/simulate';
import { resetRng } from '../shared/calculations/rng';
import type { SimConfig, PitchingConfig, TacticSchedules } from '../shared/calculations/simulate';
import type { TacticsModifiers, TacticCoefficientRow } from '../shared/calculations/probability';
import type { SimPlayer, SimTeam } from '../shared/calculations/types';
import { storage } from './storage';

interface SimulationResult {
  matchId: number;
  homeScore: number;
  awayScore: number;
  details: any;
}

function buildLineupFromSaved(lineup: any, players: SimPlayer[], rotation: any, teamLabel?: string): { lineup: SimPlayer[]; hasDH: boolean } {
  const label = teamLabel || 'team';
  if (!lineup?.fieldPositions) {
    console.warn(`[lineup:${label}] No fieldPositions saved — will use auto-generated lineup`);
    return { lineup: [], hasDH: true };
  }
  const positions = lineup.fieldPositions as Record<string, number | null>;
  const order = lineup.battingOrder as number[] | undefined;

  const hasDH = !!(positions['DH'] && positions['DH'] > 0);

  const savedPositionCount = Object.entries(positions).filter(([pos, id]) => pos !== 'P' && id).length;
  console.log(`[lineup:${label}] fieldPositions: ${savedPositionCount} positions saved, hasDH=${hasDH}, battingOrder has ${order?.length || 0} entries`);

  const positionPlayers: SimPlayer[] = [];
  const missingPlayers: string[] = [];
  for (const [pos, playerId] of Object.entries(positions)) {
    if (!playerId) continue;
    if (pos === 'P') continue;
    const p = players.find(pl => pl.id === playerId);
    if (p) {
      positionPlayers.push(p);
    } else {
      missingPlayers.push(`${pos}:${playerId}`);
    }
  }

  if (missingPlayers.length > 0) {
    console.warn(`[lineup:${label}] Players not found in roster: ${missingPlayers.join(', ')}`);
  }

  if (!hasDH && rotation?.roles?.sp) {
    const sp = players.find(p => p.id === rotation.roles.sp);
    if (sp && !positionPlayers.find(p => p.id === sp.id)) {
      positionPlayers.push(sp);
    }
  }

  if (order && order.length > 0) {
    const validIds = new Set(positionPlayers.map(p => p.id));
    const skippedIds: number[] = [];
    const ordered: SimPlayer[] = [];
    for (const id of order) {
      if (!validIds.has(id)) {
        skippedIds.push(id);
        continue;
      }
      const p = positionPlayers.find(pl => pl.id === id);
      if (p) ordered.push(p);
    }
    for (const p of positionPlayers) {
      if (!ordered.find(o => o.id === p.id)) ordered.push(p);
    }
    if (skippedIds.length > 0) {
      console.warn(`[lineup:${label}] BattingOrder IDs skipped (not in field positions): ${skippedIds.join(', ')}`);
    }
    const final = ordered.slice(0, 9);
    if (final.length < 9) {
      console.warn(`[lineup:${label}] Only ${final.length} valid players (need 9) — simulation may use fallback`);
    }
    console.log(`[lineup:${label}] Batting order: ${final.map((p, i) => `#${i + 1} ${p.name} (${p.id})`).join(' | ')}`);
    return { lineup: final, hasDH };
  }

  const final = positionPlayers.slice(0, 9);
  if (final.length < 9) {
    console.warn(`[lineup:${label}] Only ${final.length} valid players (need 9) — simulation may use fallback`);
  }
  console.log(`[lineup:${label}] Batting order (auto): ${final.map((p, i) => `#${i + 1} ${p.name} (${p.id})`).join(' | ')}`);
  return { lineup: final, hasDH };
}

function buildPitchingConfig(rotation: any, players: SimPlayer[]): PitchingConfig | undefined {
  if (!rotation?.roles) return undefined;
  const findPlayer = (id: number | null) => id ? players.find(p => p.id === id) || null : null;
  const configs = rotation.pitcherConfigs || {};
  const spCfg = configs.sp || {};
  const r1Cfg = configs.r1 || {};
  const closerCfg = configs.closer || {};
  return {
    sp: findPlayer(rotation.roles.sp),
    r1: findPlayer(rotation.roles.r1),
    closer: findPlayer(rotation.roles.closer),
    spConfig: {
      maxPitches: spCfg.maxPitches ?? 100,
      maxInnings: spCfg.maxInnings ?? 7,
      maxBb: spCfg.maxBb ?? 4,
      maxEr: spCfg.maxEr ?? 4,
      pitcherStyle: spCfg.pitcherStyle ?? 'command',
    },
    r1Config: {
      maxPitches: r1Cfg.maxPitches ?? 40,
      maxInnings: r1Cfg.maxInnings ?? 9,
      maxBb: r1Cfg.maxBb ?? 4,
      maxEr: r1Cfg.maxEr ?? 3,
      pitcherStyle: r1Cfg.pitcherStyle ?? 'command',
    },
    closerConfig: {
      maxPitches: closerCfg.maxPitches ?? 30,
      maxInnings: closerCfg.maxInnings ?? 9,
      maxBb: closerCfg.maxBb ?? 4,
      maxEr: closerCfg.maxEr ?? 2,
      pitcherStyle: closerCfg.pitcherStyle ?? 'command',
    },
  };
}

function buildTactics(tac: any): TacticsModifiers | undefined {
  if (!tac) return undefined;
  return {
    attackStyle: tac.attackStyle || 'neutral',
    infieldPosition: tac.infieldPosition || 'neutral',
    outfieldPosition: tac.outfieldPosition || 'neutral',
    batterApproach: tac.batterApproach || 'contact',
    offensiveAttack: tac.offensiveAttack || 'balanced',
    defenseSetup: tac.defenseSetup || 'balanced',
  };
}

function buildTacticSchedules(tac: any): TacticSchedules | undefined {
  if (!tac) return undefined;
  const schedules: TacticSchedules = {};
  if (tac.batterApproachSchedule) schedules.batterApproachSchedule = tac.batterApproachSchedule;
  if (tac.attackStyleSchedule) schedules.attackStyleSchedule = tac.attackStyleSchedule;
  if (tac.offensiveAttackSchedule) schedules.offensiveAttackSchedule = tac.offensiveAttackSchedule;
  return Object.keys(schedules).length > 0 ? schedules : undefined;
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

  const leagues = Array.from(new Set(allTeams.map(t => t.league)))
    .sort((a, b) => (parseInt(a.replace('L', '')) || 0) - (parseInt(b.replace('L', '')) || 0));

  for (const league of leagues) {
    const leagueTeams = allTeams.filter(t => t.league === league);
    const seriesKeys = Array.from(new Set(leagueTeams.map(t => t.series))).sort();
    if (seriesKeys.length < 2) continue;

    const topSeries = seriesKeys[0];
    const bottomSeries = seriesKeys[seriesKeys.length - 1];

    const topTeams = leagueTeams.filter(t => t.series === topSeries);
    const bottomTeams = leagueTeams.filter(t => t.series === bottomSeries);

    const standingsTop = computeDivisionStandings(allMatches, topTeams.map(t => t.id));
    const standingsBottom = computeDivisionStandings(allMatches, bottomTeams.map(t => t.id));

    const topLen = standingsTop.length;
    const top9th = topLen >= 2 ? standingsTop[topLen - 2]?.id : undefined;
    const top10th = topLen >= 1 ? standingsTop[topLen - 1]?.id : undefined;
    const bottom1st = standingsBottom[0]?.id;
    const bottom2nd = standingsBottom[1]?.id;

    if (!top9th || !top10th || !bottom1st || !bottom2nd) continue;

    const playoffDay13 = allMatches.filter(m =>
      m.matchType === 'playoff' && m.day === 13 && m.division === `playoff_${league}`
    );
    const playoffDay14 = allMatches.filter(m =>
      m.matchType === 'playoff' && m.day === 14 && m.division === `playoff_${league}`
    );

    if (playoffDay13.length >= 2) {
      await storage.updateMatchTeams(playoffDay13[0].id, top9th, bottom1st);
      await storage.updateMatchTeams(playoffDay13[1].id, top10th, bottom2nd);
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

  for (let i = 0; i < leagues.length - 1; i++) {
    const upperLeague = leagues[i];
    const lowerLeague = leagues[i + 1];
    const promoDivision = `promo_${lowerLeague}_to_${upperLeague}`;

    const upperTeams = allTeams.filter(t => t.league === upperLeague);
    const lowerTeams = allTeams.filter(t => t.league === lowerLeague);

    const upperSeriesKeys = Array.from(new Set(upperTeams.map(t => t.series))).sort();
    const lowerSeriesKeys = Array.from(new Set(lowerTeams.map(t => t.series))).sort();
    const upperBottomSeries = upperSeriesKeys[upperSeriesKeys.length - 1];
    const lowerTopSeries = lowerSeriesKeys[0];

    const upperBottomTeams = upperTeams.filter(t => t.series === upperBottomSeries);
    const lowerTopTeams = lowerTeams.filter(t => t.series === lowerTopSeries);

    const standingsUpperBottom = computeDivisionStandings(allMatches, upperBottomTeams.map(t => t.id));
    const standingsLowerTop = computeDivisionStandings(allMatches, lowerTopTeams.map(t => t.id));

    const ubLen = standingsUpperBottom.length;
    const upper9th = ubLen >= 2 ? standingsUpperBottom[ubLen - 2]?.id : undefined;
    const upper10th = ubLen >= 1 ? standingsUpperBottom[ubLen - 1]?.id : undefined;
    const lower1st = standingsLowerTop[0]?.id;
    const lower2nd = standingsLowerTop[1]?.id;

    if (!upper9th || !upper10th || !lower1st || !lower2nd) continue;

    const promoDay13 = allMatches.filter(m =>
      m.matchType === 'promotion' && m.day === 13 && m.division === promoDivision
    );
    const promoDay14 = allMatches.filter(m =>
      m.matchType === 'promotion' && m.day === 14 && m.division === promoDivision
    );

    if (promoDay13.length >= 2) {
      await storage.updateMatchTeams(promoDay13[0].id, upper9th, lower1st);
      await storage.updateMatchTeams(promoDay13[1].id, upper10th, lower2nd);
      updated += 2;
    }

    if (promoDay14.length >= 2 && promoDay13.every((m: any) => m.played)) {
      const match1 = allMatches.find(m => m.id === promoDay13[0].id);
      const match2 = allMatches.find(m => m.id === promoDay13[1].id);
      if (match1?.played && match2?.played) {
        const winner1 = (match1.homeScore ?? 0) > (match1.awayScore ?? 0) ? match1.homeTeamId : match1.awayTeamId;
        const loser1 = (match1.homeScore ?? 0) > (match1.awayScore ?? 0) ? match1.awayTeamId : match1.homeTeamId;
        const winner2 = (match2.homeScore ?? 0) > (match2.awayScore ?? 0) ? match2.homeTeamId : match2.awayTeamId;
        const loser2 = (match2.homeScore ?? 0) > (match2.awayScore ?? 0) ? match2.awayTeamId : match2.homeTeamId;
        await storage.updateMatchTeams(promoDay14[0].id, winner1, winner2);
        await storage.updateMatchTeams(promoDay14[1].id, loser1, loser2);
        updated += 2;
      }
    }
  }

  return { updated };
}

async function accumulateMatchStats(
  gameResult: any,
  homeTeamId: number,
  awayTeamId: number,
  seasonId: number,
  homeWon: boolean,
): Promise<void> {
  const box = gameResult.boxScore;

  const homePitcherIds = new Set(
    (box.homePitchers || [box.homePitcher]).map((p: any) => p.playerId)
  );
  const awayPitcherIds = new Set(
    (box.awayPitchers || [box.awayPitcher]).map((p: any) => p.playerId)
  );

  const homePitcherMap = new Map<number, { ip: number; h: number; er: number; bb: number; so: number; pitchCount: number; started: boolean }>();
  const homePitcherList = box.homePitchers || [box.homePitcher];
  for (let i = 0; i < homePitcherList.length; i++) {
    const p = homePitcherList[i];
    homePitcherMap.set(p.playerId, { ip: p.ip, h: p.h, er: p.er, bb: p.bb, so: p.so, pitchCount: p.pitchCount, started: i === 0 });
  }

  const awayPitcherMap = new Map<number, { ip: number; h: number; er: number; bb: number; so: number; pitchCount: number; started: boolean }>();
  const awayPitcherList = box.awayPitchers || [box.awayPitcher];
  for (let i = 0; i < awayPitcherList.length; i++) {
    const p = awayPitcherList[i];
    awayPitcherMap.set(p.playerId, { ip: p.ip, h: p.h, er: p.er, bb: p.bb, so: p.so, pitchCount: p.pitchCount, started: i === 0 });
  }

  for (const batter of box.homeBatters) {
    const pitching = homePitcherIds.has(batter.playerId) ? homePitcherMap.get(batter.playerId) || null : null;
    await storage.upsertPlayerSeasonStats(
      batter.playerId, homeTeamId, seasonId,
      { ab: batter.ab, hits: batter.hits, hr: batter.hr, rbi: batter.rbi, bb: batter.bb, so: batter.so },
      pitching,
      homeWon,
    );
    if (pitching) homePitcherMap.delete(batter.playerId);
  }

  for (const [pitcherId, pitching] of homePitcherMap) {
    await storage.upsertPlayerSeasonStats(pitcherId, homeTeamId, seasonId, null, pitching, homeWon);
  }

  for (const batter of box.awayBatters) {
    const pitching = awayPitcherIds.has(batter.playerId) ? awayPitcherMap.get(batter.playerId) || null : null;
    await storage.upsertPlayerSeasonStats(
      batter.playerId, awayTeamId, seasonId,
      { ab: batter.ab, hits: batter.hits, hr: batter.hr, rbi: batter.rbi, bb: batter.bb, so: batter.so },
      pitching,
      !homeWon,
    );
    if (pitching) awayPitcherMap.delete(batter.playerId);
  }

  for (const [pitcherId, pitching] of awayPitcherMap) {
    await storage.upsertPlayerSeasonStats(pitcherId, awayTeamId, seasonId, null, pitching, !homeWon);
  }
}

export async function simulateMatchDay(day: number): Promise<SimulationResult[]> {
  if (day >= 13) {
    await updatePlayoffMatchups();
  }

  const allMatches = await storage.getAllMatches();
  const dayMatches = allMatches.filter(m => m.day === day && !m.played && m.homeTeamId > 0 && m.awayTeamId > 0);

  if (dayMatches.length === 0) return [];

  const tacticCoefficients = await storage.getAllTacticCoefficients();
  const coefficientRows: TacticCoefficientRow[] = tacticCoefficients.map(c => ({
    layer: c.layer,
    tacticValue: c.tacticValue,
    hr: c.hr, xbh: c.xbh, single: c.single, bb: c.bb, so: c.so, go: c.go, fo: c.fo,
  }));

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

      const homeBuilt = buildLineupFromSaved(homeLineup, homeSimPlayers, homeRotation, homeTeam.name);
      const awayBuilt = buildLineupFromSaved(awayLineup, awaySimPlayers, awayRotation, awayTeam.name);

      const simConfig: SimConfig = {
        homeLineup: homeBuilt.lineup.length >= 9 ? homeBuilt.lineup : undefined,
        awayLineup: awayBuilt.lineup.length >= 9 ? awayBuilt.lineup : undefined,
        homePitching: buildPitchingConfig(homeRotation, homeSimPlayers),
        awayPitching: buildPitchingConfig(awayRotation, awaySimPlayers),
        homeTactics: buildTactics(homeTactics),
        awayTactics: buildTactics(awayTactics),
        homeHasDH: homeBuilt.hasDH,
        awayHasDH: awayBuilt.hasDH,
        homeTacticSchedules: buildTacticSchedules(homeTactics),
        awayTacticSchedules: buildTacticSchedules(awayTactics),
        tacticCoefficients: coefficientRows,
      };

      resetRng();
      const gameResult = simulateGame(homeTeam, awayTeam, homeSimPlayers, awaySimPlayers, simConfig);

      await storage.updateMatchResult(match.id, gameResult.homeScore, gameResult.awayScore);

      const seasonId = await storage.getCurrentSeasonId();
      const homeWon = gameResult.homeScore > gameResult.awayScore;
      try {
        await accumulateMatchStats(gameResult, match.homeTeamId, match.awayTeamId, seasonId, homeWon);
      } catch (err) {
        console.error(`Failed to accumulate stats for match ${match.id}:`, err);
      }

      const details = {
        boxScore: gameResult.boxScore,
        flavorTexts: gameResult.flavorTexts,
        mvp: gameResult.mvp,
        homeLineup: { playerIds: (simConfig.homeLineup || homeSimPlayers.slice(0, 9)).map(p => p.id), pitcherId: gameResult.boxScore.homePitcher.playerId, hasDH: homeBuilt.hasDH },
        awayLineup: { playerIds: (simConfig.awayLineup || awaySimPlayers.slice(0, 9)).map(p => p.id), pitcherId: gameResult.boxScore.awayPitcher.playerId, hasDH: awayBuilt.hasDH },
        homeBatters: gameResult.boxScore.homeBatters,
        awayBatters: gameResult.boxScore.awayBatters,
        homePitcher: gameResult.boxScore.homePitcher,
        awayPitcher: gameResult.boxScore.awayPitcher,
        homePitchers: gameResult.boxScore.homePitchers || [gameResult.boxScore.homePitcher],
        awayPitchers: gameResult.boxScore.awayPitchers || [gameResult.boxScore.awayPitcher],
        playLog: gameResult.playLog || [],
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
