import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  users, teams, players, matches, lineups, pitcherRotations, tactics, matchDetails,
  type User, type InsertUser, type Team, type InsertTeam,
  type Player, type Match, type Lineup, type InsertLineup,
  type PitcherRotation, type InsertPitcherRotation,
  type Tactics, type InsertTactics,
  type MatchDetails, type InsertMatchDetails,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTeam(userId: number, teamId: number): Promise<void>;

  getTeams(division?: string): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  assignTeamOwner(teamId: number, wallet: string): Promise<Team>;
  getUnownedTeam(division: string): Promise<Team | undefined>;

  getPlayersByTeam(teamId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;

  getMatchesByDivision(division: string): Promise<Match[]>;
  getAllMatches(): Promise<Match[]>;
  updateMatchResult(matchId: number, homeScore: number, awayScore: number): Promise<Match>;

  getLineup(teamId: number): Promise<Lineup | undefined>;
  upsertLineup(data: InsertLineup): Promise<Lineup>;

  getPitcherRotation(teamId: number): Promise<PitcherRotation | undefined>;
  upsertPitcherRotation(data: InsertPitcherRotation): Promise<PitcherRotation>;

  getTactics(teamId: number): Promise<Tactics | undefined>;
  upsertTactics(data: InsertTactics): Promise<Tactics>;

  createMatchDetails(data: InsertMatchDetails): Promise<MatchDetails>;
  getMatchDetails(matchId: number): Promise<MatchDetails | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUserTeam(userId: number, teamId: number): Promise<void> {
    await db.update(users).set({ teamId }).where(eq(users.id, userId));
  }

  async getTeams(division?: string): Promise<Team[]> {
    if (division) {
      return db.select().from(teams).where(eq(teams.division, division));
    }
    return db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async assignTeamOwner(teamId: number, wallet: string): Promise<Team> {
    const [updated] = await db.update(teams).set({ ownerWallet: wallet }).where(eq(teams.id, teamId)).returning();
    return updated;
  }

  async getUnownedTeam(division: string): Promise<Team | undefined> {
    const allTeams = await db.select().from(teams).where(
      and(eq(teams.division, division), eq(teams.ownerWallet, ''))
    );
    if (allTeams.length === 0) {
      const nullTeams = await db.select().from(teams).where(eq(teams.division, division));
      return nullTeams.find(t => t.ownerWallet === null);
    }
    return allTeams[0];
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    return db.select().from(players).where(eq(players.teamId, teamId));
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async getMatchesByDivision(division: string): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.division, division));
  }

  async getAllMatches(): Promise<Match[]> {
    return db.select().from(matches);
  }

  async updateMatchResult(matchId: number, homeScore: number, awayScore: number): Promise<Match> {
    const [updated] = await db.update(matches)
      .set({ played: true, homeScore, awayScore })
      .where(eq(matches.id, matchId))
      .returning();
    return updated;
  }

  async getLineup(teamId: number): Promise<Lineup | undefined> {
    const [lineup] = await db.select().from(lineups).where(eq(lineups.teamId, teamId));
    return lineup;
  }

  async upsertLineup(data: InsertLineup): Promise<Lineup> {
    const existing = await this.getLineup(data.teamId);
    if (existing) {
      const [updated] = await db.update(lineups).set(data).where(eq(lineups.teamId, data.teamId)).returning();
      return updated;
    }
    const [created] = await db.insert(lineups).values(data).returning();
    return created;
  }

  async getPitcherRotation(teamId: number): Promise<PitcherRotation | undefined> {
    const [rot] = await db.select().from(pitcherRotations).where(eq(pitcherRotations.teamId, teamId));
    return rot;
  }

  async upsertPitcherRotation(data: InsertPitcherRotation): Promise<PitcherRotation> {
    const existing = await this.getPitcherRotation(data.teamId);
    if (existing) {
      const [updated] = await db.update(pitcherRotations).set(data).where(eq(pitcherRotations.teamId, data.teamId)).returning();
      return updated;
    }
    const [created] = await db.insert(pitcherRotations).values(data).returning();
    return created;
  }

  async getTactics(teamId: number): Promise<Tactics | undefined> {
    const [tac] = await db.select().from(tactics).where(eq(tactics.teamId, teamId));
    return tac;
  }

  async upsertTactics(data: InsertTactics): Promise<Tactics> {
    const existing = await this.getTactics(data.teamId);
    if (existing) {
      const [updated] = await db.update(tactics).set(data).where(eq(tactics.teamId, data.teamId)).returning();
      return updated;
    }
    const [created] = await db.insert(tactics).values(data).returning();
    return created;
  }

  async createMatchDetails(data: InsertMatchDetails): Promise<MatchDetails> {
    const [created] = await db.insert(matchDetails).values(data).returning();
    return created;
  }

  async getMatchDetails(matchId: number): Promise<MatchDetails | undefined> {
    const [detail] = await db.select().from(matchDetails).where(eq(matchDetails.matchId, matchId));
    return detail;
  }
}

export const storage = new DatabaseStorage();
