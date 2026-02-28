import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { simulateMatchDay, updatePlayoffMatchups } from "./simulation";
import { generateNewSeason } from "./season";
import { generateChallenge, verifySignature, createToken, verifyToken, generateClaimChallenge, verifyClaimSignature, generateTrainingChallenge, verifyTrainingSignature } from "./auth";
import { expandLeague, ensureExtraLeague } from "./expansion";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/challenge", async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ message: "walletAddress required" });

    const challenge = generateChallenge(walletAddress);
    res.json(challenge);
  });

  app.post("/api/auth/verify", async (req, res) => {
    const { walletAddress, signature, message } = req.body;
    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ message: "walletAddress, signature, and message required" });
    }

    const valid = verifySignature(walletAddress, signature, message);
    if (!valid) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    let user = await storage.getUserByWallet(walletAddress);
    if (!user) {
      const allUsers = await storage.getAllUsers();
      const isFirstUser = allUsers.length === 0;
      user = await storage.createUser({ walletAddress });
      if (isFirstUser) {
        await storage.setUserAdmin(user.id, true);
        user = await storage.getUser(user.id) as typeof user;
        console.log(`First user ${walletAddress} auto-promoted to admin`);
      }
    }

    if (!user.teamId) {
      let unownedTeam = await storage.getUnownedTeam();

      if (!unownedTeam) {
        try {
          await ensureExtraLeague();
          unownedTeam = await storage.getUnownedTeam();
        } catch (err) {
          console.error("ensureExtraLeague pre-assign failed:", err);
        }
      }

      if (!unownedTeam) {
        try {
          const expansion = await expandLeague();
          console.log(`Dynamic expansion triggered: ${expansion.league}`);
          unownedTeam = await storage.getUnownedTeam();
        } catch (err) {
          console.error("League expansion failed:", err);
        }
      }

      if (unownedTeam) {
        await storage.assignTeamOwner(unownedTeam.id, walletAddress);
        await storage.updateUserTeam(user.id, unownedTeam.id);
        user = await storage.getUser(user.id) as typeof user;

        try {
          await ensureExtraLeague();
        } catch (err) {
          console.error("ensureExtraLeague failed:", err);
        }
      } else {
        return res.status(503).json({ message: "No teams available. League expansion failed." });
      }
    }

    const token = createToken(user.id, walletAddress);
    const team = user.teamId ? await storage.getTeam(user.teamId) : null;
    const playersList = team ? await storage.getPlayersByTeam(team.id) : [];

    res.json({ token, user: { ...user, isAdmin: user.isAdmin }, team, players: playersList });
  });

  app.get("/api/auth/me", async (req, res) => {
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
  });

  app.get("/api/teams", async (_req, res) => {
    const allTeams = await storage.getTeams();
    res.json(allTeams);
  });

  app.get("/api/teams/league/:league/series/:series", async (req, res) => {
    const teamsList = await storage.getTeamsByLeagueSeries(req.params.league, req.params.series);
    res.json(teamsList);
  });

  app.get("/api/teams/:division", async (req, res) => {
    const teamsList = await storage.getTeams(req.params.division);
    res.json(teamsList);
  });

  app.patch("/api/teams/:id/name", async (req, res) => {
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
  });

  app.patch("/api/team/:id/color", async (req, res) => {
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
  });

  app.get("/api/team/:id/players", async (req, res) => {
    const teamId = parseInt(req.params.id);
    const playersList = await storage.getPlayersByTeam(teamId);
    res.json(playersList);
  });

  app.get("/api/matches", async (_req, res) => {
    const allMatches = await storage.getAllMatches();
    res.json(allMatches);
  });

  app.get("/api/matches/:division", async (req, res) => {
    const matchesList = await storage.getMatchesByDivision(req.params.division);
    res.json(matchesList);
  });

  app.get("/api/player/:id", async (req, res) => {
    const playerId = parseInt(req.params.id);
    const player = await storage.getPlayer(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json(player);
  });

  app.get("/api/player/:id/stats", async (req, res) => {
    const playerId = parseInt(req.params.id);
    const seasonId = req.query.season ? parseInt(req.query.season as string) : undefined;
    const stats = await storage.getPlayerSeasonStats(playerId, seasonId);
    res.json(stats);
  });

  app.get("/api/team/:teamId/stats", async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const seasonId = req.query.season ? parseInt(req.query.season as string) : undefined;
    const stats = await storage.getTeamSeasonStats(teamId, seasonId);
    res.json(stats);
  });

  app.get("/api/season", async (_req, res) => {
    const seasonId = await storage.getCurrentSeasonId();
    res.json({ seasonId });
  });

  app.get("/api/team-snapshots", async (req, res) => {
    const seasonId = parseInt(req.query.season as string);
    if (isNaN(seasonId)) return res.status(400).json({ message: "season query parameter required" });
    const snapshots = await storage.getTeamSnapshots(seasonId);
    res.json(snapshots);
  });

  app.post("/api/matches/:id/result", async (req, res) => {
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
  });

  app.get("/api/match-details/:matchId", async (req, res) => {
    const matchId = parseInt(req.params.matchId);
    const detail = await storage.getMatchDetails(matchId);
    if (!detail) return res.status(404).json({ message: "Match details not found" });
    res.json(detail);
  });

  app.get("/api/lineup/:teamId", async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const lineup = await storage.getLineup(teamId);
    res.json(lineup || null);
  });

  app.post("/api/lineup", async (req, res) => {
    const { teamId, fieldPositions, battingOrder } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const lineup = await storage.upsertLineup({
      teamId,
      fieldPositions: fieldPositions || {},
      battingOrder: battingOrder || [],
    });
    res.json(lineup);
  });

  app.get("/api/pitcher-rotation/:teamId", async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const rotation = await storage.getPitcherRotation(teamId);
    res.json(rotation || null);
  });

  app.post("/api/pitcher-rotation", async (req, res) => {
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
  });

  app.get("/api/tactics/:teamId", async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const tac = await storage.getTactics(teamId);
    res.json(tac || null);
  });

  app.post("/api/tactics", async (req, res) => {
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
  });

  app.get("/api/admin/tactic-coefficients", async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const coefficients = await storage.getAllTacticCoefficients();
    res.json(coefficients);
  });

  app.put("/api/admin/tactic-coefficients/:layer/:tacticValue", async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    const { layer, tacticValue } = req.params;
    const { hr, xbh, single, bb, so, go, fo } = req.body;
    if ([hr, xbh, single, bb, so, go, fo].some(v => typeof v !== 'number')) {
      return res.status(400).json({ message: "All coefficient fields (hr, xbh, single, bb, so, go, fo) must be numbers" });
    }
    const updated = await storage.updateTacticCoefficient(layer, tacticValue, { hr, xbh, single, bb, so, go, fo });
    res.json(updated);
  });

  app.post("/api/admin/reset-tactic-coefficients", async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    await storage.resetTacticCoefficients();
    const coefficients = await storage.getAllTacticCoefficients();
    res.json({ message: "Tactic coefficients reset to defaults", coefficients });
  });

  app.get("/api/tactic-coefficients", async (_req, res) => {
    const coefficients = await storage.getAllTacticCoefficients();
    res.json(coefficients);
  });

  app.post("/api/simulate-day", async (req, res) => {
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
  });

  app.post("/api/update-playoff-matchups", async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    try {
      const result = await updatePlayoffMatchups();
      res.json(result);
    } catch (err) {
      console.error('Playoff matchup update failed:', err);
      res.status(500).json({ message: "Failed to update playoff matchups" });
    }
  });

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

  app.post("/api/training/result", async (req, res) => {
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
  });

  app.post("/api/training/confirm", async (req, res) => {
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
  });

  app.get("/api/training/rankings/:gameType", async (req, res) => {
    const rankings = await storage.getTrainingRankings(req.params.gameType, 20);
    res.json(rankings);
  });

  app.get("/api/training/history/:gameType", async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;
    const results = await storage.getUserTrainingResults(tokenData.userId, req.params.gameType);
    res.json(results);
  });

  app.get("/api/training-configs", async (_req, res) => {
    const configs = await storage.getAllTrainingConfigs();
    res.json(configs);
  });

  app.get("/api/admin/training-config", async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    const configs = await storage.getAllTrainingConfigs();
    res.json(configs);
  });

  app.put("/api/admin/training-config/:gameType", async (req, res) => {
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
  });

  app.get("/api/tokens/balance", async (req, res) => {
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
  });

  app.post("/api/tokens/claim-challenge", async (req, res) => {
    const tokenData = await authenticateUser(req, res);
    if (!tokenData) return;
    const challenge = generateClaimChallenge(tokenData.walletAddress);
    res.json(challenge);
  });

  app.post("/api/tokens/claim", async (req, res) => {
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
  });

  app.get("/api/admin/token-config", async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    const config = await storage.getTokenConfig();
    res.json(config || { claimAmount: 10, claimIntervalHours: 24 });
  });

  app.put("/api/admin/token-config", async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    const { claimAmount, claimIntervalHours } = req.body;
    if (typeof claimAmount !== 'number' || typeof claimIntervalHours !== 'number') {
      return res.status(400).json({ message: "claimAmount and claimIntervalHours must be numbers" });
    }
    if (claimAmount < 1 || claimAmount > 1000 || !Number.isInteger(claimAmount)) {
      return res.status(400).json({ message: "claimAmount must be an integer between 1 and 1000" });
    }
    if (claimIntervalHours < 1 || claimIntervalHours > 168 || !Number.isInteger(claimIntervalHours)) {
      return res.status(400).json({ message: "claimIntervalHours must be an integer between 1 and 168" });
    }
    const config = await storage.updateTokenConfig(claimAmount, claimIntervalHours);
    res.json(config);
  });

  app.post("/api/admin/reset-tokens", async (req, res) => {
    const tokenData = await requireAdmin(req, res);
    if (!tokenData) return;
    await storage.resetAllTokens();
    res.json({ message: "All token balances have been reset" });
  });

  app.post("/api/new-season", async (req, res) => {
    const adminData = await requireAdmin(req, res);
    if (!adminData) return;
    try {
      const result = await generateNewSeason();
      res.json(result);
    } catch (err) {
      console.error('New season generation failed:', err);
      res.status(500).json({ message: "Failed to generate new season" });
    }
  });

  app.post("/api/admin/reset-season", async (req, res) => {
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
  });

  app.post("/api/admin/wipe-database", async (req, res) => {
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
  });

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
