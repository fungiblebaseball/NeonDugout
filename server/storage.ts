import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  users, teams, players, matches, lineups, pitcherRotations, tactics, matchDetails, playerSeasonStats,
  type User, type InsertUser, type Team, type InsertTeam,
  type Player, type Match, type Lineup, type InsertLineup,
  type PitcherRotation, type InsertPitcherRotation,
  type Tactics, type InsertTactics,
  type MatchDetails, type InsertMatchDetails,
  type PlayerSeasonStats,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTeam(userId: number, teamId: number): Promise<void>;

  getTeams(division?: string): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  assignTeamOwner(teamId: number, wallet: string): Promise<Team>;
  getUnownedTeam(): Promise<Team | undefined>;

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

  updateMatchTeams(matchId: number, homeTeamId: number, awayTeamId: number): Promise<Match>;
  updateTeamDivision(teamId: number, series: string, division: string): Promise<Team>;
  updateTeamLeague(teamId: number, league: string, series: string, division: string): Promise<Team>;
  deleteMatchesBySeason(seasonId: number): Promise<void>;
  resetMatchDetails(seasonId: number): Promise<void>;

  upsertPlayerSeasonStats(playerId: number, teamId: number, seasonId: number, batting: { ab: number; hits: number; hr: number; rbi: number; bb: number; so: number } | null, pitching: { ip: number; h: number; er: number; bb: number; so: number; pitchCount: number; started: boolean } | null, won: boolean): Promise<void>;
  getPlayerSeasonStats(playerId: number, seasonId?: number): Promise<PlayerSeasonStats[]>;
  getTeamSeasonStats(teamId: number, seasonId?: number): Promise<PlayerSeasonStats[]>;
  getCurrentSeasonId(): Promise<number>;
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

  async getUnownedTeam(): Promise<Team | undefined> {
    const allTeams = await db.select().from(teams);
    const unowned = allTeams.filter(t => !t.ownerWallet);
    unowned.sort((a, b) => {
      const leagueA = parseInt(a.league.replace('L', '')) || 0;
      const leagueB = parseInt(b.league.replace('L', '')) || 0;
      if (leagueA !== leagueB) return leagueA - leagueB;
      return a.series.localeCompare(b.series);
    });
    return unowned[0];
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
    const allTeams = await db.select().from(teams).limit(1);
    const currentSeason = allTeams.length > 0 ? allTeams[0].seasonId : 1;
    return db.select().from(matches).where(eq(matches.seasonId, currentSeason));
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

  async updateMatchTeams(matchId: number, homeTeamId: number, awayTeamId: number): Promise<Match> {
    const [updated] = await db.update(matches)
      .set({ homeTeamId, awayTeamId })
      .where(eq(matches.id, matchId))
      .returning();
    return updated;
  }

  async updateTeamDivision(teamId: number, series: string, division: string): Promise<Team> {
    const [updated] = await db.update(teams)
      .set({ series, division })
      .where(eq(teams.id, teamId))
      .returning();
    return updated;
  }

  async updateTeamLeague(teamId: number, league: string, series: string, division: string): Promise<Team> {
    const [updated] = await db.update(teams)
      .set({ league, series, division })
      .where(eq(teams.id, teamId))
      .returning();
    return updated;
  }

  async deleteMatchesBySeason(seasonId: number): Promise<void> {
    const seasonMatches = await db.select({ id: matches.id }).from(matches).where(eq(matches.seasonId, seasonId));
    const matchIds = seasonMatches.map(m => m.id);
    if (matchIds.length > 0) {
      for (const mid of matchIds) {
        await db.delete(matchDetails).where(eq(matchDetails.matchId, mid));
      }
      await db.delete(matches).where(eq(matches.seasonId, seasonId));
    }
  }

  async resetMatchDetails(seasonId: number): Promise<void> {
    const seasonMatches = await db.select({ id: matches.id }).from(matches).where(eq(matches.seasonId, seasonId));
    for (const m of seasonMatches) {
      await db.delete(matchDetails).where(eq(matchDetails.matchId, m.id));
    }
  }

  async getCurrentSeasonId(): Promise<number> {
    const allTeams = await db.select().from(teams).limit(1);
    return allTeams.length > 0 ? allTeams[0].seasonId : 1;
  }

  async upsertPlayerSeasonStats(
    playerId: number,
    teamId: number,
    seasonId: number,
    batting: { ab: number; hits: number; hr: number; rbi: number; bb: number; so: number } | null,
    pitching: { ip: number; h: number; er: number; bb: number; so: number; pitchCount: number; started: boolean } | null,
    won: boolean,
  ): Promise<void> {
    const [existing] = await db.select().from(playerSeasonStats)
      .where(and(eq(playerSeasonStats.playerId, playerId), eq(playerSeasonStats.seasonId, seasonId)));

    if (existing) {
      const updates: Record<string, any> = {};
      if (batting) {
        updates.gamesPlayed = existing.gamesPlayed + 1;
        updates.ab = existing.ab + batting.ab;
        updates.hits = existing.hits + batting.hits;
        updates.hr = existing.hr + batting.hr;
        updates.rbi = existing.rbi + batting.rbi;
        updates.bb = existing.bb + batting.bb;
        updates.so = existing.so + batting.so;
        if (won) updates.wins = existing.wins + 1;
        else updates.losses = existing.losses + 1;
      }
      if (pitching) {
        if (!batting) {
          updates.gamesPlayed = existing.gamesPlayed + 1;
          if (won) updates.wins = existing.wins + 1;
          else updates.losses = existing.losses + 1;
        }
        updates.ip = existing.ip + pitching.ip;
        updates.pitcherH = existing.pitcherH + pitching.h;
        updates.er = existing.er + pitching.er;
        updates.pitcherBb = existing.pitcherBb + pitching.bb;
        updates.pitcherSo = existing.pitcherSo + pitching.so;
        updates.pitchCount = existing.pitchCount + pitching.pitchCount;
        if (pitching.started) updates.gamesStarted = existing.gamesStarted + 1;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(playerSeasonStats).set(updates).where(eq(playerSeasonStats.id, existing.id));
      }
    } else {
      await db.insert(playerSeasonStats).values({
        playerId,
        teamId,
        seasonId,
        gamesPlayed: 1,
        ab: batting?.ab ?? 0,
        hits: batting?.hits ?? 0,
        hr: batting?.hr ?? 0,
        rbi: batting?.rbi ?? 0,
        bb: batting?.bb ?? 0,
        so: batting?.so ?? 0,
        ip: pitching?.ip ?? 0,
        pitcherH: pitching?.h ?? 0,
        er: pitching?.er ?? 0,
        pitcherBb: pitching?.bb ?? 0,
        pitcherSo: pitching?.so ?? 0,
        pitchCount: pitching?.pitchCount ?? 0,
        gamesStarted: pitching?.started ? 1 : 0,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
      });
    }
  }

  async getPlayerSeasonStats(playerId: number, seasonId?: number): Promise<PlayerSeasonStats[]> {
    if (seasonId !== undefined) {
      return db.select().from(playerSeasonStats)
        .where(and(eq(playerSeasonStats.playerId, playerId), eq(playerSeasonStats.seasonId, seasonId)));
    }
    return db.select().from(playerSeasonStats).where(eq(playerSeasonStats.playerId, playerId));
  }

  async getTeamSeasonStats(teamId: number, seasonId?: number): Promise<PlayerSeasonStats[]> {
    if (seasonId !== undefined) {
      return db.select().from(playerSeasonStats)
        .where(and(eq(playerSeasonStats.teamId, teamId), eq(playerSeasonStats.seasonId, seasonId)));
    }
    return db.select().from(playerSeasonStats).where(eq(playerSeasonStats.teamId, teamId));
  }
}

export const storage = new DatabaseStorage();
