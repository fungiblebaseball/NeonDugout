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

  app.get("/api/matches/:division", async (req, res) => {
    const matchesList = await storage.getMatchesByDivision(req.params.division);
    res.json(matchesList);
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
    const { teamId, rotationOrder, maxPitches, maxInnings, maxBb, maxEr } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId required" });

    const rotation = await storage.upsertPitcherRotation({
      teamId,
      rotationOrder: rotationOrder || [],
      maxPitches: maxPitches ?? 100,
      maxInnings: maxInnings ?? 7,
      maxBb: maxBb ?? 4,
      maxEr: maxEr ?? 4,
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
