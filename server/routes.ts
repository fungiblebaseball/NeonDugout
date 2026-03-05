import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { simulateMatchDay, updatePlayoffMatchups } from "./simulation";
import { generateNewSeason } from "./season";
import { generateChallenge, verifySignature, createToken, verifyToken, generateClaimChallenge, verifyClaimSignature, generateTrainingChallenge, verifyTrainingSignature, generateMarketChallenge, verifyMarketSignature } from "./auth";
import { expandLeague, ensureExtraLeague } from "./expansion";
import { verifySolanaPayment } from "./solana";
import { v4 as uuidv4 } from "uuid";
import bs58 from "bs58";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
  });

  app.post("/api/auth/challenge", asyncHandler(async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ message: "walletAddress required" });

    const challenge = generateChallenge(walletAddress);
    res.json(challenge);
  }));

  app.post("/api/auth/verify", asyncHandler(async (req, res) => {
    const { walletAddress, signature, message } = req.body;
    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ message: "walletAddress, signature, and message required" });
    }

    console.log(`[auth] verify attempt for ${walletAddress.slice(0, 8)}...`);

    const valid = verifySignature(walletAddress, signature, message);
    if (!valid) {
      console.log(`[auth] invalid signature for ${walletAddress.slice(0, 8)}...`);
      return res.status(401).json({ message: "Invalid signature" });
    }

    console.log(`[auth] signature valid for ${walletAddress.slice(0, 8)}...`);

    const allUsers = await storage.getAllUsers();
    const isFirstUser = allUsers.length === 0;

    let user = await storage.getOrCreateUser(walletAddress);
    console.log(`[auth] user ${user.id} (new=${!user.teamId}, firstUser=${isFirstUser})`);

    if (isFirstUser && !user.isAdmin) {
      await storage.setUserAdmin(user.id, true);
      user = await storage.getUser(user.id) as typeof user;
      console.log(`[auth] first user ${walletAddress} auto-promoted to admin`);
    }

    if (!user.teamId) {
      let claimedTeam = await storage.claimUnownedTeam(walletAddress);

      if (!claimedTeam) {
        try {
          await ensureExtraLeague();
          claimedTeam = await storage.claimUnownedTeam(walletAddress);
        } catch (err) {
          console.error("[auth] ensureExtraLeague pre-assign failed:", err);
        }
      }

      if (!claimedTeam) {
        try {
          const expansion = await expandLeague();
          console.log(`[auth] dynamic expansion triggered: ${expansion.league}`);
          claimedTeam = await storage.claimUnownedTeam(walletAddress);
        } catch (err) {
          console.error("[auth] league expansion failed:", err);
        }
      }

      if (claimedTeam) {
        await storage.updateUserTeam(user.id, claimedTeam.id);
        user = await storage.getUser(user.id) as typeof user;
        console.log(`[auth] team ${claimedTeam.id} (${claimedTeam.name}) claimed by ${walletAddress.slice(0, 8)}...`);

        try {
          await ensureExtraLeague();
        } catch (err) {
          console.error("[auth] ensureExtraLeague post-assign failed:", err);
        }
      } else {
        return res.status(503).json({ message: "No teams available. League expansion failed." });
      }
    }

    const token = createToken(user.id, walletAddress);
    const team = user.teamId ? await storage.getTeam(user.teamId) : null;
    const playersList = team ? await storage.getPlayersByTeam(team.id) : [];

    console.log(`[auth] login success for ${walletAddress.slice(0, 8)}... (team: ${team?.name || 'none'})`);
    res.json({ token, user: { ...user, isAdmin: user.isAdmin }, team, players: playersList });
  }));

  app.get("/api/auth/me", asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const tokenData = verifyToken(authHeader.split(" ")[1]);
    if (!tokenData) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await storage.getUser(tokenData.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = user.teamId ? await storage.getTeam(user.teamId) : null;
    const playersList = team ? await storage.getPlayersByTeam(team.id) : [];

    res.json({ user: { ...user, isAdmin: user.isAdmin }, team, players: playersList });
  }));

  app.get("/api/teams", asyncHandler(async (_req, res) => {
    const allTeams = await storage.getTeams();
    res.json(allTeams);
  }));

  app.get("/api/teams/league/:league/series/:series", asyncHandler(async (req, res) => {
    const teamsList = await storage.getTeamsByLeagueSeries(req.params.league, req.params.series);
    res.json(teamsList);
  }));

  app.get("/api/teams/:division", asyncHandler(async (req, res) => {
    const teamsList = await storage.getTeams(req.params.division);
    res.json(teamsList);
  }));

  app.patch("/api/teams/:id/name", asyncHandler(async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 30) {
        return res.status(400).json({ message: "Name must be 1-30 characters" });
      }
      const updated = await storage.renameTeam(teamId, name.trim());
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to rename team" });
    }
  }));

  app.patch("/api/team/:id/color", asyncHandler(async (req, res) => {
    try {
      const tokenData = await authenticateUser(req, res);
      if (!tokenData) return;

      const teamId = parseInt(req.params.id);
      const { color } = req.body;
      if (!color || typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return res.status(400).json({ message: "color must be a valid hex color (e.g. #ff0000)" });
      }

      const team = await storage.getTeam(teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });

      const user = await storage.getUser(tokenData.userId);
      if (!user || user.teamId !== teamId) {
        return res.status(403).json({ message: "You don't own this team" });
      }

      const updated = await storage.updateTeamColor(teamId, color);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update team color" });
    }
  }));

  app.get("/api/team/:id/players", asyncHandler(async (req, res) => {
    const teamId = parseInt(req.params.id);
    const playersList = await storage.getPlayersByTeam(teamId);
    res.json(playersList);
  }));

  app.get("/api/matches", asyncHandler(async (req, res) => {
    const seasonParam = req.query.season ? parseInt(req.query.season as string) : undefined;
    const allMatches = await storage.getAllMatches(seasonParam && !isNaN(seasonParam) ? seasonParam : undefined);
    res.json(allMatches);
  }));

  app.get("/api/matches/:division", asyncHandler(async (req, res) => {
    const matchesList = await storage.getMatchesByDivision(req.params.division);
    res.json(matchesList);
  }));

  app.get("/api/player/:id", asyncHandler(async (req, res) => {
    const playerId = parseInt(req.params.id);
    const player = await storage.getPlayer(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json(player);
  }));

  app.get("/api/player/:id/stats", asyncHandler(async (req, res) => {
    const playerId = parseInt(req.params.id);
    const seasonId = req.query.season ? parseInt(req.query.season as string) : undefined;
    const stats = await storage.getPlayerSeasonStats(playerId, seasonId);
    res.json(stats);
  }));

  app.get("/api/team/:teamId/stats", asyncHandler(async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const seasonId = req.query.season ? parseInt(req.query.season as string) : undefined;
    const stats = await storage.getTeamSeasonStats(teamId, seasonId);
    res.json(stats);
  }));

  app.get("/api/season", asyncHandler(async (_req, res) => {
    const seasonId = await storage.getCurrentSeasonId();
    res.json({ seasonId });
  }));

  app.get("/api/team-snapshots", asyncHandler(async (req, res) => {
    const seasonId = parseInt(req.query.season as string);
    if (isNaN(seasonId)) return res.status(400).json({ message: "season query parameter required" });
    const snapshots = await storage.getTeamSnapshots(seasonId);
    res.json(snapshots);
  }));

  app.post("/api/matches/:id/result", asyncHandler(async (req, res) => {
    const matchId = parseInt(req.params.id);
    const { homeScore, awayScore, details } = req.body;
    if (homeScore === undefined || awayScore === undefined ||
        typeof homeScore !== 'number' || typeof awayScore !== 'number' ||
        homeScore < 0 || awayScore < 0) {
      return res.status(400).json({ message: "homeScore and awayScore must be non-negative numbers" });
    }
    const allMatches = await storage.getAllMatches();
    const match = allMatches.find(m => m.id === matchId);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.played) return res.status(409).json({ message: "Match already played" });
    const updated = await storage.updateMatchResult(matchId, homeScore, awayScore);

    if (details) {
      try {
        await storage.createMatchDetails({
          matchId,
          boxScore: details.boxScore,
          flavorTexts: details.flavorTexts || [],
          mvp: details.mvp || { name: 'Unknown', reason: '' },
          homeLineup: details.homeLineup || { playerIds: [], pitcherId: 0 },
          awayLineup: details.awayLineup || { playerIds: [], pitcherId: 0 },
          homeBatters: details.homeBatters || [],
          awayBatters: details.awayBatters || [],
          homePitcher: details.homePitcher || {},
          awayPitcher: details.awayPitcher || {},
          homePitchers: details.homePitchers || (details.homePitcher ? [details.homePitcher] : []),
          awayPitchers: details.awayPitchers || (details.awayPitcher ? [details.awayPitcher] : []),
          playLog: details.playLog || [],
        });
      } catch (err) {
        console.error('Failed to save match details:', err);
        return res.status(500).json({ message: "Match result saved but details failed to persist", match: updated });
      }

      try {
        const seasonId = await storage.getCurrentSeasonId();
        const homeWon = homeScore > awayScore;
        const box = details.boxScore || details;
        const homePitcherIds = new Set(
          ((box.homePitchers || (box.homePitcher ? [box.homePitcher] : [])) as any[]).map((p: any) => p.playerId)
        );
        const awayPitcherIds = new Set(
          ((box.awayPitchers || (box.awayPitcher ? [box.awayPitcher] : [])) as any[]).map((p: any) => p.playerId)
        );
        const homePitcherMap = new Map<number, any>();
        const hpList = box.homePitchers || (box.homePitcher ? [box.homePitcher] : []);
        for (let i = 0; i < hpList.length; i++) {
          const p = hpList[i];
          homePitcherMap.set(p.playerId, { ip: p.ip, h: p.h, er: p.er, bb: p.bb, so: p.so, pitchCount: p.pitchCount, started: i === 0 });
        }
        const awayPitcherMap = new Map<number, any>();
        const apList = box.awayPitchers || (box.awayPitcher ? [box.awayPitcher] : []);
        for (let i = 0; i < apList.length; i++) {
          const p = apList[i];
          awayPitcherMap.set(p.playerId, { ip: p.ip, h: p.h, er: p.er, bb: p.bb, so: p.so, pitchCount: p.pitchCount, started: i === 0 });
        }

        for (const batter of (details.homeBatters || box.homeBatters || [])) {
          const pitching = homePitcherIds.has(batter.playerId) ? homePitcherMap.get(batter.playerId) || null : null;
          await storage.upsertPlayerSeasonStats(batter.playerId, match.homeTeamId, seasonId,
            { ab: batter.ab, hits: batter.hits, hr: batter.hr, rbi: batter.rbi, bb: batter.bb, so: batter.so },
            pitching, homeWon);
          if (pitching) homePitcherMap.delete(batter.playerId);
        }
        for (const [pid, pitching] of homePitcherMap) {
          await storage.upsertPlayerSeasonStats(pid, match.homeTeamId, seasonId, null, pitching, homeWon);
        }
        for (const batter of (details.awayBatters || box.awayBatters || [])) {
          const pitching = awayPitcherIds.has(batter.playerId) ? awayPitcherMap.get(batter.playerId) || null : null;
          await storage.upsertPlayerSeasonStats(batter.playerId, match.awayTeamId, seasonId,
            { ab: batter.ab, hits: batter.hits, hr: batter.hr, rbi: batter.rbi, bb: batter.bb, so: batter.so },
            pitching, !homeWon);
          if (pitching) awayPitcherMap.delete(batter.playerId);
        }
        for (const [pid, pitching] of awayPitcherMap) {
          await storage.upsertPlayerSeasonStats(pid, match.awayTeamId, seasonId, null, pitching, !homeWon);
        }
      } catch (err) {
        console.error('Failed to accumulate player stats:', err);
      }
    }

    res.json(updated);
  }));

  app.get("/api/match-details/:matchId", asyncHandler(async (req, res) => {
    const matchId = parseInt(req.params.matchId);
    const detail = await storage.getMatchDetails(matchId);
    if (!detail) return res.status(404).json({ message: "Match details not found" });
    res.json(detail);
  }));

  app.get("/api/lineup/:teamId", asyncHandler(async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const lineup = await storage.getLineup(teamId);
    res.json(lineup || null);
  }));

  app.post("/api/lineup", asyncHandler(async (req, res) => {
    const { teamId, fieldPositions, battingOrder } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const lineup = await storage.upsertLineup({
      teamId,
      fieldPositions: fieldPositions || {},
      battingOrder: battingOrder || [],
    });
    res.json(lineup);
  }));

  app.get("/api/pitcher-rotation/:teamId", asyncHandler(async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const rotation = await storage.getPitcherRotation(teamId);
    res.json(rotation || null);
  }));

  app.post("/api/pitcher-rotation", asyncHandler(async (req, res) => {
    const { teamId, rotationOrder, roles, pitcherConfigs } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const { DEFAULT_PITCHER_CONFIGS } = await import("@shared/schema");
    const mergedConfigs = {
      sp: { ...DEFAULT_PITCHER_CONFIGS.sp, ...(pitcherConfigs?.sp || {}) },
      r1: { ...DEFAULT_PITCHER_CONFIGS.r1, ...(pitcherConfigs?.r1 || {}) },
      closer: { ...DEFAULT_PITCHER_CONFIGS.closer, ...(pitcherConfigs?.closer || {}) },
    };

    const rotation = await storage.upsertPitcherRotation({
      teamId,
      rotationOrder: rotationOrder || [],
      roles: roles || { sp: null, r1: null, closer: null, nextSp: null },
      pitcherConfigs: mergedConfigs,
    });
    res.json(rotation);
  }));

  app.get("/api/tactics/:teamId", asyncHandler(async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const tac = await storage.getTactics(teamId);
    res.json(tac || null);
  }));

  app.post("/api/tactics", asyncHandler(async (req, res) => {
    const { teamId, attackStyle, infieldPosition, outfieldPosition, batterApproach, offensiveAttack, defenseSetup,
      batterApproachSchedule, attackStyleSchedule, offensiveAttackSchedule } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const tac = await storage.upsertTactics({
      teamId,
      attackStyle: attackStyle || "neutral",
      infieldPosition: infieldPosition || "neutral",
      outfieldPosition: outfieldPosition || "neutral",
      batterApproach: batterApproach || "contact",
      offensiveAttack: offensiveAttack || "balanced",
      defenseSetup: defenseSetup || "balanced",
      batterApproachSchedule: batterApproachSchedule || undefined,
      attackStyleSchedule: attackStyleSchedule || undefined,
      offensiveAttackSchedule: offensiveAttackSchedule || undefined,
    });
    res.json(tac);
  }));

  app.get("/api/admin/tactic-coefficients", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const coefficients = await storage.getAllTacticCoefficients();
    res.json(coefficients);
  }));

  app.put("/api/admin/tactic-coefficients/:layer/:tacticValue", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const { layer, tacticValue } = req.params;
    const { hr, xbh, single, bb, so, go, fo, tacSt } = req.body;
    if ([hr, xbh, single, bb, so, go, fo, tacSt].some(v => typeof v !== 'number')) {
      return res.status(400).json({ message: "All coefficient fields (hr, xbh, single, bb, so, go, fo, tacSt) must be numbers" });
    }
    const updated = await storage.updateTacticCoefficient(layer, tacticValue, { hr, xbh, single, bb, so, go, fo, tacSt });
    res.json(updated);
  }));

  app.post("/api/admin/reset-tactic-coefficients", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    await storage.resetTacticCoefficients();
    const coefficients = await storage.getAllTacticCoefficients();
    res.json({ message: "Tactic coefficients reset to defaults", coefficients });
  }));

  app.get("/api/tactic-coefficients", asyncHandler(async (_req, res) => {
    const coefficients = await storage.getAllTacticCoefficients();
    res.json(coefficients);
  }));

  app.post("/api/simulate-day", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const { day } = req.body;
    if (!day || typeof day !== 'number' || day < 1 || day > 14) {
      return res.status(400).json({ message: "day must be a number between 1 and 14" });
    }

    try {
      const results = await simulateMatchDay(day);
      res.json({ day, matchesSimulated: results.length, results });
    } catch (err) {
      console.error('Simulate day failed:', err);
      res.status(500).json({ message: "Failed to simulate match day" });
    }
  }));

  app.post("/api/update-playoff-matchups", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    try {
      const result = await updatePlayoffMatchups();
      res.json(result);
    } catch (err) {
      console.error('Playoff matchup update failed:', err);
      res.status(500).json({ message: "Failed to update playoff matchups" });
    }
  }));

  const authenticateUser = async (req: Request, res: Response): Promise<{ userId: number; walletAddress: string } | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "No token provided" });
      return null;
    }
    const tokenData = verifyToken(authHeader.split(" ")[1]);
    if (!tokenData) {
      res.status(401).json({ message: "Invalid or expired token" });
      return null;
    }
    return tokenData;
  };

  const requireAdmin = async (req: Request, res: Response): Promise<{ userId: number; walletAddress: string } | null> => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return null;
    const user = await storage.getUser(tokenData.userId);
    if (!user || !user.isAdmin) {
      res.status(403).json({ message: "Admin access required" });
      return null;
    }
    return tokenData;
  };

  app.post("/api/training/result", asyncHandler(async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;

    const user = await storage.getUser(tokenData.userId);
    if (!user || !user.teamId) return res.status(400).json({ message: "No team assigned" });

    const { gameType, score, rawData } = req.body;
    if (!gameType || score === undefined || !rawData) {
      return res.status(400).json({ message: "gameType, score, and rawData required" });
    }

    const config = await storage.getTrainingConfig(gameType);
    const rewardAttrs = config?.rewardAttributes || ["eye"];
    const rewardAmount = config?.rewardAmount || 1;
    const minScore = config?.minScoreForReward || 200;
    const rewardTarget = (config as any)?.rewardTarget || "random";
    const rewardTargetRole = (config as any)?.rewardTargetRole || null;

    const teamPlayers = await storage.getPlayersByTeam(user.teamId);
    if (teamPlayers.length === 0) return res.status(400).json({ message: "No players on team" });

    let targetPlayers: typeof teamPlayers = [];
    if (rewardTarget === "team") {
      targetPlayers = teamPlayers;
    } else if (rewardTarget === "role" && rewardTargetRole) {
      const rolePlayers = teamPlayers.filter(p => p.positions.includes(rewardTargetRole));
      if (rolePlayers.length > 0) {
        targetPlayers = [rolePlayers[Math.floor(Math.random() * rolePlayers.length)]];
      } else {
        targetPlayers = [teamPlayers[Math.floor(Math.random() * teamPlayers.length)]];
      }
    } else {
      targetPlayers = [teamPlayers[Math.floor(Math.random() * teamPlayers.length)]];
    }

    let actualReward = 0;
    const maxPerSeason = config?.maxBoostPerSeason || 50;
    const boostCount = await storage.countSeasonBoosts(user.id, gameType);

    if (score >= minScore && boostCount < maxPerSeason) {
      actualReward = rewardAmount;
    }

    const primaryPlayer = targetPlayers[0];
    const result = await storage.saveTrainingResult({
      userId: user.id,
      teamId: user.teamId,
      gameType,
      score,
      rawData,
      rewardAttribute: rewardAttrs[0] || "eye",
      rewardPlayerId: primaryPlayer.id,
      rewardAmount: actualReward,
      rewardPlayerIds: targetPlayers.map(p => p.id),
      rewardAttributes: rewardAttrs,
    });

    const rankings = await storage.getTrainingRankings(gameType, 100);
    const rankPosition = rankings.findIndex(r => r.userId === user.id) + 1;

    let challenge: { message: string; nonce: string } | null = null;
    if (actualReward > 0) {
      challenge = generateTrainingChallenge(tokenData.walletAddress, result.id);
    }

    res.json({
      result,
      rankPosition: rankPosition || rankings.length + 1,
      rewardPlayers: targetPlayers.map(p => ({ id: p.id, name: p.name })),
      rewardPlayer: { id: primaryPlayer.id, name: primaryPlayer.name },
      rewardAttributes: rewardAttrs,
      rewardAttribute: rewardAttrs[0] || "eye",
      rewardAmount: actualReward,
      pendingBoost: actualReward > 0 ? {
        resultId: result.id,
        playerIds: targetPlayers.map(p => p.id),
        attributes: rewardAttrs,
        amount: actualReward,
        challenge,
      } : null,
    });
  }));

  app.post("/api/training/confirm", asyncHandler(async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;

    const { resultId, signature, message } = req.body;
    if (!resultId || !signature || !message) {
      return res.status(400).json({ message: "resultId, signature, and message required" });
    }

    const valid = verifyTrainingSignature(tokenData.walletAddress, resultId, signature, message);
    if (!valid) {
      return res.status(401).json({ message: "Invalid training signature" });
    }

    const trainingResult = await storage.getTrainingResult(resultId);
    if (!trainingResult) {
      return res.status(404).json({ message: "Training result not found" });
    }
    if (trainingResult.userId !== tokenData.userId) {
      return res.status(403).json({ message: "Not your training result" });
    }
    if (trainingResult.confirmed) {
      return res.status(400).json({ message: "Training already confirmed" });
    }
    if (trainingResult.rewardAmount <= 0) {
      return res.status(400).json({ message: "No reward to confirm" });
    }

    const playerIds = (trainingResult.rewardPlayerIds as number[]) || [trainingResult.rewardPlayerId];
    const rawAttrs = trainingResult.rewardAttributes as string[] | null;
    const attrs = rawAttrs && rawAttrs.length > 0 ? rawAttrs : [trainingResult.rewardAttribute || "eye"];

    for (const playerId of playerIds) {
      await storage.boostPlayerAttributes(playerId, attrs, trainingResult.rewardAmount);
    }

    await storage.confirmTrainingResult(resultId);

    res.json({ confirmed: true, playerIds, attributes: attrs, amount: trainingResult.rewardAmount });
  }));

  app.get("/api/training/rankings/:gameType", asyncHandler(async (req, res) => {
    const rankings = await storage.getTrainingRankings(req.params.gameType, 20);
    res.json(rankings);
  }));

  app.get("/api/training/history/:gameType", asyncHandler(async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;
    const results = await storage.getUserTrainingResults(tokenData.userId, req.params.gameType);
    res.json(results);
  }));

  app.get("/api/training-configs", asyncHandler(async (_req, res) => {
    const configs = await storage.getAllTrainingConfigs();
    res.json(configs);
  }));

  app.get("/api/admin/training-config", asyncHandler(async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    const configs = await storage.getAllTrainingConfigs();
    res.json(configs);
  }));

  app.put("/api/admin/training-config/:gameType", asyncHandler(async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    const { rewardAttributes, rewardAmount, minScoreForReward, maxBoostPerSeason, rewardTarget, rewardTargetRole } = req.body;
    const config = await storage.upsertTrainingConfig({
      gameType: req.params.gameType,
      rewardAttributes: rewardAttributes || [],
      rewardAmount: rewardAmount ?? 1,
      minScoreForReward: minScoreForReward ?? 200,
      maxBoostPerSeason: maxBoostPerSeason ?? 10,
      rewardTarget: rewardTarget ?? "random",
      rewardTargetRole: rewardTargetRole ?? null,
    });
    res.json(config);
  }));

  app.get("/api/tokens/balance", asyncHandler(async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;
    const userTokenRecord = await storage.getUserTokens(tokenData.userId);
    const config = await storage.getTokenConfig();
    const balance = userTokenRecord?.balance ?? 0;
    const lastClaimAt = userTokenRecord?.lastClaimAt ?? null;
    const intervalHours = config?.claimIntervalHours ?? 24;
    let canClaim = true;
    let nextClaimAt: string | null = null;
    if (lastClaimAt) {
      const nextTime = new Date(lastClaimAt.getTime() + intervalHours * 60 * 60 * 1000);
      if (new Date() < nextTime) {
        canClaim = false;
        nextClaimAt = nextTime.toISOString();
      }
    }
    res.json({ balance, lastClaimAt: lastClaimAt?.toISOString() ?? null, canClaim, nextClaimAt, claimAmount: config?.claimAmount ?? 10 });
  }));

  app.post("/api/tokens/claim-challenge", asyncHandler(async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;
    const challenge = generateClaimChallenge(tokenData.walletAddress);
    res.json(challenge);
  }));

  app.post("/api/tokens/claim", asyncHandler(async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;

    const { signature, message } = req.body;
    if (!signature || !message) {
      return res.status(400).json({ message: "signature and message required" });
    }

    const valid = verifyClaimSignature(tokenData.walletAddress, signature, message);
    if (!valid) {
      return res.status(401).json({ message: "Invalid claim signature" });
    }

    const config = await storage.getTokenConfig();
    const claimAmount = config?.claimAmount ?? 10;
    const intervalHours = config?.claimIntervalHours ?? 24;

    const existing = await storage.getUserTokens(tokenData.userId);
    if (existing?.lastClaimAt) {
      const nextTime = new Date(existing.lastClaimAt.getTime() + intervalHours * 60 * 60 * 1000);
      if (new Date() < nextTime) {
        return res.status(429).json({ message: "Claim not available yet", nextClaimAt: nextTime.toISOString() });
      }
    }

    const updated = await storage.claimTokens(tokenData.userId, claimAmount, intervalHours);
    if (!updated) {
      return res.status(429).json({ message: "Claim not available yet" });
    }
    res.json({ balance: updated.balance, lastClaimAt: updated.lastClaimAt?.toISOString(), claimAmount });
  }));

  app.get("/api/admin/token-config", asyncHandler(async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    const config = await storage.getTokenConfig();
    res.json(config || { claimAmount: 10, claimIntervalHours: 24, merchantWallet: null });
  }));

  app.put("/api/admin/token-config", asyncHandler(async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    const { claimAmount, claimIntervalHours, merchantWallet } = req.body;
    if (typeof claimAmount !== 'number' || typeof claimIntervalHours !== 'number') {
      return res.status(400).json({ message: "claimAmount and claimIntervalHours must be numbers" });
    }
    if (claimAmount < 1 || claimAmount > 1000 || !Number.isInteger(claimAmount)) {
      return res.status(400).json({ message: "claimAmount must be an integer between 1 and 1000" });
    }
    if (claimIntervalHours < 1 || claimIntervalHours > 168 || !Number.isInteger(claimIntervalHours)) {
      return res.status(400).json({ message: "claimIntervalHours must be an integer between 1 and 168" });
    }
    if (merchantWallet !== undefined && merchantWallet !== null && merchantWallet !== '') {
      if (typeof merchantWallet !== 'string' || merchantWallet.length < 32 || merchantWallet.length > 44) {
        return res.status(400).json({ message: "merchantWallet must be a valid Solana address (32-44 characters)" });
      }
      try {
        const decoded = bs58.decode(merchantWallet.trim());
        if (decoded.length !== 32) {
          return res.status(400).json({ message: "merchantWallet is not a valid Solana public key" });
        }
      } catch {
        return res.status(400).json({ message: "merchantWallet contains invalid base58 characters" });
      }
    }
    const trimmedWallet = (merchantWallet && typeof merchantWallet === 'string') ? merchantWallet.trim() : merchantWallet;
    const config = await storage.updateTokenConfig(claimAmount, claimIntervalHours, trimmedWallet);
    res.json(config);
  }));

  app.post("/api/admin/reset-tokens", asyncHandler(async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    await storage.resetAllTokens();
    res.json({ message: "All token balances have been reset" });
  }));

  app.post("/api/new-season", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    try {
      const result = await generateNewSeason();
      res.json(result);
    } catch (err) {
      console.error('New season generation failed:', err);
      res.status(500).json({ message: "Failed to generate new season" });
    }
  }));

  app.post("/api/admin/reset-season", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    try {
      await storage.resetCurrentSeason();
      const result = await generateNewSeason();
      res.json({ message: "Season reset and regenerated", seasonId: result.seasonId, matchCount: result.matchCount });
    } catch (err) {
      console.error('Reset season failed:', err);
      res.status(500).json({ message: "Failed to reset season" });
    }
  }));

  app.post("/api/admin/wipe-database", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    try {
      await storage.wipeAllData();
      const { seedDatabase } = await import("./seed");
      await seedDatabase();

      const defaultConfigs = [
        { gameType: "eye_drill", rewardAttributes: ["eye"], rewardAmount: 1, minScoreForReward: 200, maxBoostPerSeason: 10 },
        { gameType: "batting_practice", rewardAttributes: ["con", "pow"], rewardAmount: 1, minScoreForReward: 200, maxBoostPerSeason: 10 },
        { gameType: "pitch_control", rewardAttributes: ["ctl"], rewardAmount: 1, minScoreForReward: 200, maxBoostPerSeason: 10 },
      ];
      for (const cfg of defaultConfigs) {
        await storage.upsertTrainingConfig(cfg);
      }
      await storage.updateTokenConfig(10, 24);

      res.json({ message: "Database wiped and re-seeded. First user to login will be admin." });
    } catch (err) {
      console.error('Database wipe failed:', err);
      res.status(500).json({ message: "Failed to wipe database" });
    }
  }));

  app.post("/api/admin/messages", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const { message, targetType, targetValue } = req.body;
    if (!message || !targetType) {
      return res.status(400).json({ message: "message and targetType required" });
    }
    const msg = await storage.createAdminMessage(message, targetType, targetValue || null);
    res.json(msg);
  }));

  app.get("/api/admin/messages", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const msgs = await storage.getAdminMessages();
    res.json(msgs);
  }));

  app.delete("/api/admin/messages/:id", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    await storage.deactivateAdminMessage(parseInt(req.params.id));
    res.json({ success: true });
  }));

  app.get("/api/messages", asyncHandler(async (req, res) => {
    const wallet = req.query.wallet as string;
    if (!wallet) return res.json([]);
    const user = await storage.getUserByWallet(wallet);
    if (!user || !user.teamId) return res.json([]);
    const team = await storage.getTeam(user.teamId);
    if (!team) return res.json([]);
    const messages = await storage.getActiveMessagesForTeam(team.league, team.series, team.name);
    const dismissed = await storage.getDismissedMessageIds(wallet);
    const filtered = messages.filter(m => !dismissed.includes(m.id));
    res.json(filtered);
  }));

  app.post("/api/messages/:id/dismiss", asyncHandler(async (req, res) => {
    const wallet = req.body.wallet as string;
    if (!wallet) return res.status(400).json({ message: "wallet required" });
    await storage.dismissMessage(parseInt(req.params.id), wallet);
    res.json({ success: true });
  }));

  app.get("/api/projected-playoffs", asyncHandler(async (_req, res) => {
    const currentSeasonId = await storage.getCurrentSeasonId();
    const allMatchesRaw = await storage.getAllMatches();
    const allMatches = allMatchesRaw.filter(m => m.seasonId === currentSeasonId);
    const allTeamsRaw = await storage.getTeams();
    const allTeams = allTeamsRaw.filter(t => t.seasonId === currentSeasonId);
    const projections: any[] = [];

    const leagues = Array.from(new Set(allTeams.map(t => t.league))).sort((a, b) => (parseInt(a.replace('L', '')) || 0) - (parseInt(b.replace('L', '')) || 0));

    function computeStandings(teamIds: number[]) {
      const records: Record<number, { w: number; l: number; rs: number; ra: number }> = {};
      for (const id of teamIds) records[id] = { w: 0, l: 0, rs: 0, ra: 0 };
      for (const m of allMatches) {
        if (!m.played || m.matchType !== 'regular') continue;
        if (records[m.homeTeamId]) { records[m.homeTeamId].w += (m.homeScore ?? 0) > (m.awayScore ?? 0) ? 1 : 0; records[m.homeTeamId].l += (m.homeScore ?? 0) <= (m.awayScore ?? 0) ? 1 : 0; records[m.homeTeamId].rs += m.homeScore ?? 0; records[m.homeTeamId].ra += m.awayScore ?? 0; }
        if (records[m.awayTeamId]) { records[m.awayTeamId].w += (m.awayScore ?? 0) > (m.homeScore ?? 0) ? 1 : 0; records[m.awayTeamId].l += (m.awayScore ?? 0) <= (m.homeScore ?? 0) ? 1 : 0; records[m.awayTeamId].rs += m.awayScore ?? 0; records[m.awayTeamId].ra += m.homeScore ?? 0; }
      }
      return teamIds.map(id => ({ id, ...records[id] })).sort((a, b) => b.w - a.w || (b.rs - b.ra) - (a.rs - a.ra));
    }

    for (const league of leagues) {
      const leagueTeams = allTeams.filter(t => t.league === league);
      const seriesKeys = Array.from(new Set(leagueTeams.map(t => t.series))).sort();
      if (seriesKeys.length < 2) continue;
      const topSeries = seriesKeys[0];
      const bottomSeries = seriesKeys[seriesKeys.length - 1];
      const topTeams = leagueTeams.filter(t => t.series === topSeries);
      const bottomTeams = leagueTeams.filter(t => t.series === bottomSeries);
      const standingsTop = computeStandings(topTeams.map(t => t.id));
      const standingsBottom = computeStandings(bottomTeams.map(t => t.id));
      const topLen = standingsTop.length;
      if (topLen >= 2 && standingsBottom.length >= 2) {
        projections.push({ type: 'playoff', division: `playoff_${league}`, day: 13, homeTeamId: standingsTop[topLen - 2]?.id, awayTeamId: standingsBottom[0]?.id, homeTeamName: allTeams.find(t => t.id === standingsTop[topLen - 2]?.id)?.name, awayTeamName: allTeams.find(t => t.id === standingsBottom[0]?.id)?.name });
        projections.push({ type: 'playoff', division: `playoff_${league}`, day: 13, homeTeamId: standingsTop[topLen - 1]?.id, awayTeamId: standingsBottom[1]?.id, homeTeamName: allTeams.find(t => t.id === standingsTop[topLen - 1]?.id)?.name, awayTeamName: allTeams.find(t => t.id === standingsBottom[1]?.id)?.name });
      }
    }

    for (let i = 0; i < leagues.length - 1; i++) {
      const upperLeague = leagues[i];
      const lowerLeague = leagues[i + 1];
      const upperTeams = allTeams.filter(t => t.league === upperLeague);
      const lowerTeams = allTeams.filter(t => t.league === lowerLeague);
      const upperSeriesKeys = Array.from(new Set(upperTeams.map(t => t.series))).sort();
      const lowerSeriesKeys = Array.from(new Set(lowerTeams.map(t => t.series))).sort();
      const upperBottomSeries = upperSeriesKeys[upperSeriesKeys.length - 1];
      const lowerTopSeries = lowerSeriesKeys[0];
      const upperBottomTeams = upperTeams.filter(t => t.series === upperBottomSeries);
      const lowerTopTeams = lowerTeams.filter(t => t.series === lowerTopSeries);
      const standingsUB = computeStandings(upperBottomTeams.map(t => t.id));
      const standingsLT = computeStandings(lowerTopTeams.map(t => t.id));
      const ubLen = standingsUB.length;
      if (ubLen >= 2 && standingsLT.length >= 2) {
        projections.push({ type: 'promotion', division: `promo_${lowerLeague}_to_${upperLeague}`, day: 13, homeTeamId: standingsUB[ubLen - 2]?.id, awayTeamId: standingsLT[0]?.id, homeTeamName: allTeams.find(t => t.id === standingsUB[ubLen - 2]?.id)?.name, awayTeamName: allTeams.find(t => t.id === standingsLT[0]?.id)?.name });
        projections.push({ type: 'promotion', division: `promo_${lowerLeague}_to_${upperLeague}`, day: 13, homeTeamId: standingsUB[ubLen - 1]?.id, awayTeamId: standingsLT[1]?.id, homeTeamName: allTeams.find(t => t.id === standingsUB[ubLen - 1]?.id)?.name, awayTeamName: allTeams.find(t => t.id === standingsLT[1]?.id)?.name });
      }
    }

    res.json(projections);
  }));

  app.get("/api/market/listings", asyncHandler(async (_req, res) => {
    const listings = await storage.getActiveListings();
    res.json(listings);
  }));

  app.get("/api/market/listing/:id/stats", asyncHandler(async (req, res) => {
    const listing = await storage.getListingById(Number(req.params.id));
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    const stats = await storage.getPlayerSeasonStats(listing.playerId);
    res.json(stats);
  }));

  app.post("/api/market/sell/challenge", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { playerId, price } = req.body;
    if (!playerId || !price || price < 1) return res.status(400).json({ message: "playerId and price required" });

    const user = await storage.getUser(decoded.userId);
    if (!user?.teamId) return res.status(400).json({ message: "No team" });

    const player = await storage.getPlayer(playerId);
    if (!player || player.teamId !== user.teamId) return res.status(403).json({ message: "Not your player" });

    const lineup = await storage.getLineup(user.teamId);
    if (lineup) {
      const inBatting = lineup.battingOrder.includes(playerId);
      const inField = Object.values(lineup.fieldPositions).includes(playerId);
      if (inBatting || inField) return res.status(400).json({ message: "Remove player from lineup first" });
    }

    const challenge = generateMarketChallenge(decoded.walletAddress, 'sell', playerId);
    res.json({ ...challenge, playerId, price });
  }));

  app.post("/api/market/sell/confirm", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { playerId, price, signature, message } = req.body;
    if (!playerId || !price || !signature || !message) return res.status(400).json({ message: "Missing fields" });

    const valid = verifyMarketSignature(decoded.walletAddress, 'sell', playerId, signature, message);
    if (!valid) return res.status(401).json({ message: "Invalid signature" });

    const user = await storage.getUser(decoded.userId);
    if (!user?.teamId) return res.status(400).json({ message: "No team" });

    const player = await storage.getPlayer(playerId);
    if (!player || player.teamId !== user.teamId) return res.status(403).json({ message: "Not your player" });

    const lineup = await storage.getLineup(user.teamId);
    if (lineup) {
      const inBatting = lineup.battingOrder.includes(playerId);
      const inField = Object.values(lineup.fieldPositions).includes(playerId);
      if (inBatting || inField) return res.status(400).json({ message: "Remove player from lineup first" });
    }

    const listing = await storage.listPlayerForSale(playerId, decoded.walletAddress, user.teamId, price);
    res.json(listing);
  }));

  app.post("/api/market/buy/challenge", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ message: "listingId required" });

    const listing = await storage.getListingById(listingId);
    if (!listing || listing.status !== 'active') return res.status(404).json({ message: "Listing not found" });
    if (listing.sellerWallet === decoded.walletAddress) return res.status(400).json({ message: "Cannot buy your own player" });

    const user = await storage.getUser(decoded.userId);
    if (!user?.teamId) return res.status(400).json({ message: "No team" });

    const rosterCount = await storage.getPlayerCountForTeam(user.teamId);
    if (rosterCount >= 20) return res.status(400).json({ message: "Roster full (max 20)" });

    const tokens = await storage.getUserTokens(decoded.userId);
    if (!tokens || tokens.balance < listing.price) return res.status(400).json({ message: "Insufficient tokens" });

    const challenge = generateMarketChallenge(decoded.walletAddress, 'buy', listingId);
    res.json({ ...challenge, listingId });
  }));

  app.post("/api/market/buy/confirm", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { listingId, signature, message } = req.body;
    if (!listingId || !signature || !message) return res.status(400).json({ message: "Missing fields" });

    const valid = verifyMarketSignature(decoded.walletAddress, 'buy', listingId, signature, message);
    if (!valid) return res.status(401).json({ message: "Invalid signature" });

    const user = await storage.getUser(decoded.userId);
    if (!user?.teamId) return res.status(400).json({ message: "No team" });

    const rosterCount = await storage.getPlayerCountForTeam(user.teamId);
    if (rosterCount >= 20) return res.status(400).json({ message: "Roster full (max 20)" });

    const result = await storage.buyPlayer(listingId, decoded.walletAddress, user.teamId);
    res.json(result);
  }));

  app.post("/api/market/cancel/challenge", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ message: "listingId required" });

    const listing = await storage.getListingById(listingId);
    if (!listing || listing.status !== 'active') return res.status(404).json({ message: "Listing not found" });
    if (listing.sellerWallet !== decoded.walletAddress) return res.status(403).json({ message: "Not your listing" });

    const challenge = generateMarketChallenge(decoded.walletAddress, 'cancel', listingId);
    res.json({ ...challenge, listingId });
  }));

  app.post("/api/market/cancel/confirm", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { listingId, signature, message } = req.body;
    if (!listingId || !signature || !message) return res.status(400).json({ message: "Missing fields" });

    const valid = verifyMarketSignature(decoded.walletAddress, 'cancel', listingId, signature, message);
    if (!valid) return res.status(401).json({ message: "Invalid signature" });

    const result = await storage.cancelListing(listingId, decoded.walletAddress);
    res.json(result);
  }));

  setInterval(async () => {
    try {
      const expired = await storage.expireStaleOrders();
      if (expired > 0) console.log(`[cleanup] Expired ${expired} stale prepared orders`);
    } catch {}
  }, 60_000);

  app.get("/api/solana/rpc-url", (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });
    res.json({ rpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com" });
  });

  app.get("/api/token-packages", asyncHandler(async (req, res) => {
    const packages = await storage.getActiveTokenPackages();
    res.json(packages);
  }));

  async function getMerchantWallet(): Promise<string | null> {
    const config = await storage.getTokenConfig();
    return config?.merchantWallet || process.env.MERCHANT_WALLET || null;
  }

  app.get("/api/tokens/merchant-info", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const merchantAddress = await getMerchantWallet();
    if (!merchantAddress) return res.status(500).json({ message: "Merchant wallet not configured" });
    res.json({ merchantAddress });
  }));

  app.post("/api/tokens/purchase/prepare", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ message: "packageId required" });

    const pendingCount = await storage.countPreparedOrdersForUser(decoded.userId);
    if (pendingCount >= 3) return res.status(429).json({ message: "Too many pending orders. Please wait." });

    const packages = await storage.getActiveTokenPackages();
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    const merchantAddress = await getMerchantWallet();
    if (!merchantAddress) return res.status(500).json({ message: "Merchant wallet not configured" });

    const orderId = uuidv4().slice(0, 12);
    const memo = `neon-dugout:${orderId}:${pkg.tokens}`;

    await storage.createPreparedOrder({
      orderId,
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
      packageId: pkg.id,
      tokens: pkg.tokens,
      priceLamports: pkg.priceLamports,
      memo,
    });

    res.json({ orderId, memo, merchantAddress, priceLamports: pkg.priceLamports, tokens: pkg.tokens });
  }));

  app.post("/api/tokens/purchase/confirm", asyncHandler(async (req, res) => {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(auth);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const { orderId, txSignature } = req.body;
    if (!orderId || !txSignature) return res.status(400).json({ message: "orderId and txSignature required" });

    const order = await storage.getPreparedOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== 'prepared') return res.status(409).json({ message: "Order already processed" });
    if (order.userId !== decoded.userId) return res.status(403).json({ message: "Order belongs to another user" });

    const orderAge = Date.now() - new Date(order.createdAt!).getTime();
    if (orderAge > 300_000) {
      await storage.failTokenPurchase(order.id);
      return res.status(410).json({ message: "Order expired (>5 minutes)" });
    }

    const existingPurchase = await storage.getPurchaseBySignature(txSignature);
    if (existingPurchase) return res.status(409).json({ message: "Transaction already processed" });

    const merchantAddress = await getMerchantWallet();
    if (!merchantAddress) return res.status(500).json({ message: "Merchant wallet not configured" });

    const verification = await verifySolanaPayment(
      txSignature,
      BigInt(order.priceLamports),
      order.memo,
      merchantAddress,
      order.walletAddress
    );

    if (!verification.valid) {
      await storage.failTokenPurchase(order.id);
      return res.status(400).json({ message: verification.error || "Payment verification failed" });
    }

    const confirmed = await storage.confirmTokenPurchase(order.id, order.userId, order.tokens, txSignature);
    res.json({ success: true, tokens: confirmed.tokens, message: `${confirmed.tokens} tokens credited!` });
  }));

  app.get("/api/admin/token-packages", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const packages = await storage.getAllTokenPackages();
    res.json(packages);
  }));

  app.post("/api/admin/token-packages", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const { tokens, priceLamports, label, active, sortOrder } = req.body;
    if (!tokens || !priceLamports || !label) return res.status(400).json({ message: "tokens, priceLamports, and label required" });
    const pkg = await storage.createTokenPackage({ tokens, priceLamports: String(priceLamports), label, active, sortOrder });
    res.json(pkg);
  }));

  app.put("/api/admin/token-packages/:id", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const id = parseInt(req.params.id);
    const updates: any = {};
    if (req.body.tokens !== undefined) updates.tokens = req.body.tokens;
    if (req.body.priceLamports !== undefined) updates.priceLamports = String(req.body.priceLamports);
    if (req.body.label !== undefined) updates.label = req.body.label;
    if (req.body.active !== undefined) updates.active = req.body.active;
    if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
    const pkg = await storage.updateTokenPackage(id, updates);
    res.json(pkg);
  }));

  app.delete("/api/admin/token-packages/:id", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const id = parseInt(req.params.id);
    await storage.deleteTokenPackage(id);
    res.json({ success: true });
  }));

  app.get("/api/admin/token-economy-stats", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const stats = await storage.getTokenEconomyStats();
    res.json(stats);
  }));

  app.get("/api/admin/purchase-history/market", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const history = await storage.getMarketPurchaseHistory();
    res.json(history);
  }));

  app.get("/api/admin/purchase-history/tokens", asyncHandler(async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const history = await storage.getTokenPurchaseHistory();
    res.json(history);
  }));

  const defaultConfigs = [
    { gameType: "eye_drill", rewardAttributes: ["eye"], rewardAmount: 1, minScoreForReward: 200, maxBoostPerSeason: 10 },
    { gameType: "batting_practice", rewardAttributes: ["con", "pow"], rewardAmount: 1, minScoreForReward: 200, maxBoostPerSeason: 10 },
    { gameType: "pitch_control", rewardAttributes: ["ctl"], rewardAmount: 1, minScoreForReward: 200, maxBoostPerSeason: 10 },
  ];
  for (const cfg of defaultConfigs) {
    const existing = await storage.getTrainingConfig(cfg.gameType);
    if (!existing) {
      await storage.upsertTrainingConfig(cfg);
    }
  }

  const existingTokenConfig = await storage.getTokenConfig();
  if (!existingTokenConfig) {
    await storage.updateTokenConfig(10, 24);
  }

  return httpServer;
}
