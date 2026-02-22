import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/connect", async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ message: "walletAddress required" });

    let user = await storage.getUserByWallet(walletAddress);
    if (!user) {
      user = await storage.createUser({ walletAddress });
    }

    if (!user.teamId) {
      const unownedTeam = await storage.getUnownedTeam("B");
      if (unownedTeam) {
        await storage.assignTeamOwner(unownedTeam.id, walletAddress);
        await storage.updateUserTeam(user.id, unownedTeam.id);
        user = await storage.getUser(user.id) as typeof user;
      }
    }

    const team = user.teamId ? await storage.getTeam(user.teamId) : null;
    const playersList = team ? await storage.getPlayersByTeam(team.id) : [];

    res.json({ user, team, players: playersList });
  });

  app.get("/api/teams", async (_req, res) => {
    const allTeams = await storage.getTeams();
    res.json(allTeams);
  });

  app.get("/api/teams/:division", async (req, res) => {
    const teamsList = await storage.getTeams(req.params.division);
    res.json(teamsList);
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
        });
      } catch (err) {
        console.error('Failed to save match details:', err);
        return res.status(500).json({ message: "Match result saved but details failed to persist", match: updated });
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
    const { teamId, attackStyle, infieldPosition, outfieldPosition } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const tac = await storage.upsertTactics({
      teamId,
      attackStyle: attackStyle || "neutral",
      infieldPosition: infieldPosition || "neutral",
      outfieldPosition: outfieldPosition || "neutral",
    });
    res.json(tac);
  });

  return httpServer;
}
