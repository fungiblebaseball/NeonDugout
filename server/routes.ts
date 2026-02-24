import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { simulateMatchDay, updatePlayoffMatchups } from "./simulation";
import { generateNewSeason } from "./season";
import { generateChallenge, verifySignature, createToken, verifyToken } from "./auth";
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
      user = await storage.createUser({ walletAddress });
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

    res.json({ token, user, team, players: playersList });
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

    res.json({ user, team, players: playersList });
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
    const { teamId, rotationOrder, roles, maxPitches, maxInnings, maxBb, maxEr, r1MaxPitches, r1MaxEr, closerMaxPitches, closerMaxEr } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const rotation = await storage.upsertPitcherRotation({
      teamId,
      rotationOrder: rotationOrder || [],
      roles: roles || { sp: null, r1: null, closer: null, nextSp: null },
      maxPitches: maxPitches ?? 100,
      maxInnings: maxInnings ?? 7,
      maxBb: maxBb ?? 4,
      maxEr: maxEr ?? 4,
      r1MaxPitches: r1MaxPitches ?? 40,
      r1MaxEr: r1MaxEr ?? 3,
      closerMaxPitches: closerMaxPitches ?? 30,
      closerMaxEr: closerMaxEr ?? 2,
    });
    res.json(rotation);
  });

  app.get("/api/tactics/:teamId", async (req, res) => {
    const teamId = parseInt(req.params.teamId);
    const tac = await storage.getTactics(teamId);
    res.json(tac || null);
  });

  app.post("/api/tactics", async (req, res) => {
    const { teamId, attackStyle, infieldPosition, outfieldPosition, batterApproach, pitcherStyle, offensiveAttack, defenseSetup } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const tac = await storage.upsertTactics({
      teamId,
      attackStyle: attackStyle || "neutral",
      infieldPosition: infieldPosition || "neutral",
      outfieldPosition: outfieldPosition || "neutral",
      batterApproach: batterApproach || "contact",
      pitcherStyle: pitcherStyle || "command",
      offensiveAttack: offensiveAttack || "balanced",
      defenseSetup: defenseSetup || "balanced",
    });
    res.json(tac);
  });

  app.post("/api/simulate-day", async (req, res) => {
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

  app.post("/api/update-playoff-matchups", async (_req, res) => {
    try {
      const result = await updatePlayoffMatchups();
      res.json(result);
    } catch (err) {
      console.error('Playoff matchup update failed:', err);
      res.status(500).json({ message: "Failed to update playoff matchups" });
    }
  });

  app.post("/api/new-season", async (_req, res) => {
    try {
      const result = await generateNewSeason();

      try {
        await ensureExtraLeague();
      } catch (err) {
        console.error("ensureExtraLeague after new season failed:", err);
      }

      res.json(result);
    } catch (err) {
      console.error('New season generation failed:', err);
      res.status(500).json({ message: "Failed to generate new season" });
    }
  });

  return httpServer;
}
