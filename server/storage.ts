import { db, pool } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  users, teams, players, matches, lineups, pitcherRotations, tactics, matchDetails, playerSeasonStats, teamSnapshots,
  trainingResults, trainingConfig, userTokens, tokenConfig, tacticCoefficients, adminMessages, dismissedMessages,
  marketListings,
  type User, type InsertUser, type Team, type InsertTeam,
  type Player, type Match, type Lineup, type InsertLineup,
  type PitcherRotation, type InsertPitcherRotation,
  type Tactics, type InsertTactics,
  type MatchDetails, type InsertMatchDetails,
  type PlayerSeasonStats, type TeamSnapshot,
  type TrainingResult, type InsertTrainingResult,
  type TrainingConfig, type InsertTrainingConfig,
  type UserTokens, type TokenConfig,
  type TacticCoefficient, type InsertTacticCoefficients,
  type MarketListing,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getOrCreateUser(walletAddress: string): Promise<User>;
  updateUserTeam(userId: number, teamId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  setUserAdmin(userId: number, isAdmin: boolean): Promise<void>;
  wipeAllData(): Promise<void>;
  resetCurrentSeason(): Promise<void>;

  getTeams(division?: string): Promise<Team[]>;
  getTeamsByLeagueSeries(league: string, series: string): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  renameTeam(teamId: number, newName: string): Promise<Team>;
  assignTeamOwner(teamId: number, wallet: string): Promise<Team>;
  getUnownedTeam(): Promise<Team | undefined>;
  claimUnownedTeam(walletAddress: string): Promise<Team | null>;

  getPlayersByTeam(teamId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;

  getMatchesByDivision(division: string): Promise<Match[]>;
  getAllMatches(seasonId?: number): Promise<Match[]>;
  updateMatchResult(matchId: number, homeScore: number, awayScore: number): Promise<Match>;

  getLineup(teamId: number): Promise<Lineup | undefined>;
  upsertLineup(data: InsertLineup): Promise<Lineup>;

  getPitcherRotation(teamId: number): Promise<PitcherRotation | undefined>;
  upsertPitcherRotation(data: InsertPitcherRotation): Promise<PitcherRotation>;

  getTactics(teamId: number): Promise<Tactics | undefined>;
  upsertTactics(data: InsertTactics): Promise<Tactics>;

  getAllTacticCoefficients(): Promise<TacticCoefficient[]>;
  updateTacticCoefficient(layer: string, tacticValue: string, data: { hr: number; xbh: number; single: number; bb: number; so: number; go: number; fo: number; tacSt: number }): Promise<TacticCoefficient>;
  seedDefaultTacticCoefficients(): Promise<void>;
  resetTacticCoefficients(): Promise<void>;

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

  createTeamSnapshots(seasonId: number): Promise<void>;
  getTeamSnapshots(seasonId: number): Promise<TeamSnapshot[]>;

  saveTrainingResult(result: InsertTrainingResult): Promise<TrainingResult>;
  getTrainingRankings(gameType: string, limit: number): Promise<TrainingResult[]>;
  getUserTrainingResults(userId: number, gameType: string): Promise<TrainingResult[]>;
  boostPlayerAttribute(playerId: number, attribute: string, amount: number): Promise<void>;
  boostPlayerAttributes(playerId: number, attributes: string[], amount: number): Promise<void>;
  countSeasonBoosts(userId: number, gameType: string): Promise<number>;
  getTrainingConfig(gameType: string): Promise<TrainingConfig | undefined>;
  upsertTrainingConfig(config: InsertTrainingConfig): Promise<TrainingConfig>;
  getAllTrainingConfigs(): Promise<TrainingConfig[]>;
  getTrainingResult(resultId: number): Promise<TrainingResult | undefined>;
  confirmTrainingResult(resultId: number): Promise<void>;

  getUserTokens(userId: number): Promise<UserTokens | undefined>;
  claimTokens(userId: number, claimAmount: number, intervalHours: number): Promise<UserTokens | null>;
  resetAllTokens(): Promise<void>;
  getTokenConfig(): Promise<TokenConfig | undefined>;
  updateTokenConfig(claimAmount: number, claimIntervalHours: number): Promise<TokenConfig>;
  updateTeamColor(teamId: number, color: string): Promise<Team>;
  consolidatePlayerBonuses(): Promise<void>;

  createAdminMessage(message: string, targetType: string, targetValue: string | null): Promise<any>;
  getAdminMessages(): Promise<any[]>;
  deactivateAdminMessage(id: number): Promise<void>;
  getActiveMessagesForTeam(league: string, series: string, teamName: string): Promise<any[]>;
  dismissMessage(messageId: number, walletAddress: string): Promise<void>;
  getDismissedMessageIds(walletAddress: string): Promise<number[]>;

  listPlayerForSale(playerId: number, sellerWallet: string, sellerTeamId: number, price: number): Promise<MarketListing>;
  buyPlayer(listingId: number, buyerWallet: string, buyerTeamId: number): Promise<MarketListing>;
  cancelListing(listingId: number, sellerWallet: string): Promise<MarketListing>;
  getActiveListings(): Promise<(MarketListing & { player: Player })[]>;
  getListingById(id: number): Promise<MarketListing | undefined>;
  getPlayerCountForTeam(teamId: number): Promise<number>;
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

  async getOrCreateUser(walletAddress: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING RETURNING *`,
      [walletAddress]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return { id: row.id, walletAddress: row.wallet_address, teamId: row.team_id, isAdmin: row.is_admin, createdAt: row.created_at };
    }
    const existing = await this.getUserByWallet(walletAddress);
    if (!existing) throw new Error("Failed to create or find user");
    return existing;
  }

  async updateUserTeam(userId: number, teamId: number): Promise<void> {
    await db.update(users).set({ teamId }).where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async setUserAdmin(userId: number, isAdmin: boolean): Promise<void> {
    await db.update(users).set({ isAdmin }).where(eq(users.id, userId));
  }

  async wipeAllData(): Promise<void> {
    await db.delete(marketListings);
    await db.delete(matchDetails);
    await db.delete(playerSeasonStats);
    await db.delete(trainingResults);
    await db.delete(userTokens);
    await db.delete(tokenConfig);
    await db.delete(trainingConfig);
    await db.delete(tacticCoefficients);
    await db.delete(lineups);
    await db.delete(pitcherRotations);
    await db.delete(tactics);
    await db.delete(matches);
    await db.delete(teamSnapshots);
    await db.delete(players);
    await db.delete(teams);
    await db.delete(users);
  }

  async resetCurrentSeason(): Promise<void> {
    const allTeams = await db.select().from(teams);
    if (allTeams.length === 0) return;
    const currentSeasonId = Math.max(...allTeams.map(t => t.seasonId));
    const currentSeasonMatchIds = (await db.select({ id: matches.id }).from(matches).where(eq(matches.seasonId, currentSeasonId))).map(m => m.id);
    if (currentSeasonMatchIds.length > 0) {
      for (let i = 0; i < currentSeasonMatchIds.length; i += 100) {
        const batch = currentSeasonMatchIds.slice(i, i + 100);
        await db.delete(matchDetails).where(sql`${matchDetails.matchId} IN (${sql.join(batch.map(id => sql`${id}`), sql`, `)})`);
      }
    }
    await db.delete(matches).where(eq(matches.seasonId, currentSeasonId));
    await db.delete(teamSnapshots).where(eq(teamSnapshots.seasonId, currentSeasonId));
    await db.delete(trainingResults);
    for (const team of allTeams) {
      await db.update(players).set({
        powAdd: 0, conAdd: 0, spdAdd: 0, eyeAdd: 0,
        velAdd: 0, ctlAdd: 0, movAdd: 0, staAdd: 0, defAdd: 0,
      }).where(eq(players.teamId, team.id));
    }
  }

  async getTeams(division?: string): Promise<Team[]> {
    if (division) {
      return db.select().from(teams).where(eq(teams.division, division));
    }
    return db.select().from(teams);
  }

  async getTeamsByLeagueSeries(league: string, series: string): Promise<Team[]> {
    return db.select().from(teams).where(and(eq(teams.league, league), eq(teams.series, series)));
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async renameTeam(teamId: number, newName: string): Promise<Team> {
    const [updated] = await db.update(teams).set({ name: newName }).where(eq(teams.id, teamId)).returning();
    return updated;
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
      if (leagueA !== leagueB) return leagueB - leagueA;
      return b.series.localeCompare(a.series);
    });
    return unowned[0];
  }

  async claimUnownedTeam(walletAddress: string): Promise<Team | null> {
    const result = await pool.query(
      `UPDATE teams SET owner_wallet = $1
       WHERE id = (
         SELECT id FROM teams
         WHERE owner_wallet IS NULL
         ORDER BY
           CAST(REPLACE(league, 'L', '') AS INTEGER) DESC,
           series DESC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [walletAddress]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      primaryColor: row.primary_color,
      league: row.league,
      series: row.series,
      division: row.division,
      ownerWallet: row.owner_wallet,
      seasonId: row.season_id,
    };
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

  async getAllMatches(seasonId?: number): Promise<Match[]> {
    if (seasonId !== undefined) {
      return db.select().from(matches).where(eq(matches.seasonId, seasonId));
    }
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

  async createTeamSnapshots(seasonId: number): Promise<void> {
    const existing = await db.select().from(teamSnapshots).where(eq(teamSnapshots.seasonId, seasonId));
    if (existing.length > 0) return;
    const allTeams = await db.select().from(teams).where(eq(teams.seasonId, seasonId));

    const seasonMatches = await db.select().from(matches).where(
      and(eq(matches.seasonId, seasonId), eq(matches.played, true))
    );

    const standings = new Map<number, { w: number; l: number; rf: number; ra: number }>();
    for (const t of allTeams) {
      standings.set(t.id, { w: 0, l: 0, rf: 0, ra: 0 });
    }
    for (const m of seasonMatches) {
      const hs = standings.get(m.homeTeamId);
      const as_ = standings.get(m.awayTeamId);
      if (hs) {
        hs.rf += m.homeScore ?? 0;
        hs.ra += m.awayScore ?? 0;
        if ((m.homeScore ?? 0) > (m.awayScore ?? 0)) hs.w++; else hs.l++;
      }
      if (as_) {
        as_.rf += m.awayScore ?? 0;
        as_.ra += m.homeScore ?? 0;
        if ((m.awayScore ?? 0) > (m.homeScore ?? 0)) as_.w++; else as_.l++;
      }
    }

    const snapshots = allTeams.map(t => {
      const s = standings.get(t.id) || { w: 0, l: 0, rf: 0, ra: 0 };
      return {
        teamId: t.id,
        seasonId,
        name: t.name,
        division: t.division,
        league: t.league,
        series: t.series,
        primaryColor: t.primaryColor,
        ownerWallet: t.ownerWallet,
        wins: s.w,
        losses: s.l,
        runsFor: s.rf,
        runsAgainst: s.ra,
      };
    });
    for (let i = 0; i < snapshots.length; i += 50) {
      await db.insert(teamSnapshots).values(snapshots.slice(i, i + 50));
    }
  }

  async getTeamSnapshots(seasonId: number): Promise<TeamSnapshot[]> {
    return db.select().from(teamSnapshots).where(eq(teamSnapshots.seasonId, seasonId));
  }

  async saveTrainingResult(result: InsertTrainingResult): Promise<TrainingResult> {
    const [created] = await db.insert(trainingResults).values(result).returning();
    return created;
  }

  async getTrainingRankings(gameType: string, limit: number): Promise<TrainingResult[]> {
    const bestPerUser = await db.execute(sql`
      SELECT DISTINCT ON (user_id) *
      FROM training_results
      WHERE game_type = ${gameType}
      ORDER BY user_id, score DESC, created_at DESC
    `);
    const mapped = bestPerUser.rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      teamId: r.team_id,
      gameType: r.game_type,
      score: r.score,
      rawData: r.raw_data,
      rewardAttribute: r.reward_attribute,
      rewardPlayerId: r.reward_player_id,
      rewardAmount: r.reward_amount,
      createdAt: r.created_at,
    })) as TrainingResult[];
    mapped.sort((a, b) => b.score - a.score);
    return mapped.slice(0, limit);
  }

  async getUserTrainingResults(userId: number, gameType: string): Promise<TrainingResult[]> {
    return db.select().from(trainingResults)
      .where(and(eq(trainingResults.userId, userId), eq(trainingResults.gameType, gameType)))
      .orderBy(desc(trainingResults.createdAt));
  }

  async boostPlayerAttribute(playerId: number, attribute: string, amount: number): Promise<void> {
    const addCol = `${attribute}_add` as const;
    const baseCol = attribute as keyof typeof players.$inferSelect;
    const player = await this.getPlayer(playerId);
    if (!player) return;
    const baseVal = (player as any)[attribute] ?? 0;
    const currentAdd = (player as any)[`${attribute}Add`] ?? 0;
    const maxAdd = 99 - baseVal - currentAdd;
    const actualAmount = Math.min(amount, Math.max(0, maxAdd));
    if (actualAmount <= 0) return;
    await db.update(players).set({
      [`${attribute}Add`]: currentAdd + actualAmount,
    } as any).where(eq(players.id, playerId));
  }

  async boostPlayerAttributes(playerId: number, attributes: string[], amount: number): Promise<void> {
    for (const attribute of attributes) {
      await this.boostPlayerAttribute(playerId, attribute, amount);
    }
  }

  async getTrainingResult(resultId: number): Promise<TrainingResult | undefined> {
    const [result] = await db.select().from(trainingResults).where(eq(trainingResults.id, resultId));
    return result;
  }

  async confirmTrainingResult(resultId: number): Promise<void> {
    await db.update(trainingResults).set({ confirmed: true }).where(eq(trainingResults.id, resultId));
  }

  async countSeasonBoosts(userId: number, gameType: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(trainingResults)
      .where(and(
        eq(trainingResults.userId, userId),
        eq(trainingResults.gameType, gameType),
        sql`reward_amount > 0`,
        eq(trainingResults.confirmed, true)
      ));
    return Number(result[0]?.count ?? 0);
  }

  async getTrainingConfig(gameType: string): Promise<TrainingConfig | undefined> {
    const [config] = await db.select().from(trainingConfig).where(eq(trainingConfig.gameType, gameType));
    return config;
  }

  async upsertTrainingConfig(config: InsertTrainingConfig): Promise<TrainingConfig> {
    const existing = await this.getTrainingConfig(config.gameType);
    if (existing) {
      const [updated] = await db.update(trainingConfig).set(config).where(eq(trainingConfig.gameType, config.gameType)).returning();
      return updated;
    }
    const [created] = await db.insert(trainingConfig).values(config).returning();
    return created;
  }

  async getAllTrainingConfigs(): Promise<TrainingConfig[]> {
    return db.select().from(trainingConfig);
  }

  async getUserTokens(userId: number): Promise<UserTokens | undefined> {
    const [record] = await db.select().from(userTokens).where(eq(userTokens.userId, userId));
    return record;
  }

  async claimTokens(userId: number, claimAmount: number, intervalHours: number): Promise<UserTokens | null> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - intervalHours * 60 * 60 * 1000);

    const existing = await this.getUserTokens(userId);
    if (existing) {
      const [updated] = await db.update(userTokens)
        .set({ balance: sql`${userTokens.balance} + ${claimAmount}`, lastClaimAt: now })
        .where(and(
          eq(userTokens.userId, userId),
          sql`(${userTokens.lastClaimAt} IS NULL OR ${userTokens.lastClaimAt} <= ${cutoff})`
        ))
        .returning();
      return updated || null;
    }
    const [created] = await db.insert(userTokens)
      .values({ userId, balance: claimAmount, lastClaimAt: now })
      .returning();
    return created;
  }

  async resetAllTokens(): Promise<void> {
    await db.delete(userTokens);
  }

  async getTokenConfig(): Promise<TokenConfig | undefined> {
    const [config] = await db.select().from(tokenConfig);
    return config;
  }

  async updateTokenConfig(claimAmount: number, claimIntervalHours: number): Promise<TokenConfig> {
    const existing = await this.getTokenConfig();
    if (existing) {
      const [updated] = await db.update(tokenConfig)
        .set({ claimAmount, claimIntervalHours })
        .where(eq(tokenConfig.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(tokenConfig)
      .values({ claimAmount, claimIntervalHours })
      .returning();
    return created;
  }
  async updateTeamColor(teamId: number, color: string): Promise<Team> {
    const [updated] = await db.update(teams).set({ primaryColor: color }).where(eq(teams.id, teamId)).returning();
    return updated;
  }

  async getAllTacticCoefficients(): Promise<TacticCoefficient[]> {
    return db.select().from(tacticCoefficients);
  }

  async updateTacticCoefficient(layer: string, tacticValue: string, data: { hr: number; xbh: number; single: number; bb: number; so: number; go: number; fo: number; tacSt: number }): Promise<TacticCoefficient> {
    const [existing] = await db.select().from(tacticCoefficients)
      .where(and(eq(tacticCoefficients.layer, layer), eq(tacticCoefficients.tacticValue, tacticValue)));
    if (existing) {
      const [updated] = await db.update(tacticCoefficients).set(data)
        .where(eq(tacticCoefficients.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(tacticCoefficients)
      .values({ layer, tacticValue, ...data }).returning();
    return created;
  }

  async seedDefaultTacticCoefficients(): Promise<void> {
    const existing = await db.select().from(tacticCoefficients).limit(1);
    if (existing.length > 0) return;

    const defaults: InsertTacticCoefficients[] = [
      { layer: 'batter_approach', tacticValue: 'power', hr: 12, xbh: 10, single: 0, bb: 0, so: 0, go: -5, fo: -5, tacSt: 0 },
      { layer: 'batter_approach', tacticValue: 'contact', hr: 0, xbh: 5, single: 12, bb: 5, so: -10, go: 0, fo: 0, tacSt: 0 },
      { layer: 'batter_approach', tacticValue: 'patient', hr: 0, xbh: 6, single: 8, bb: 10, so: -8, go: -4, fo: 0, tacSt: 0 },
      { layer: 'pitcher_style', tacticValue: 'velocity', hr: -8, xbh: -6, single: 0, bb: 0, so: 12, go: 0, fo: 5, tacSt: 0 },
      { layer: 'pitcher_style', tacticValue: 'movement', hr: -5, xbh: -8, single: -4, bb: 0, so: 5, go: 10, fo: 5, tacSt: 0 },
      { layer: 'pitcher_style', tacticValue: 'command', hr: -6, xbh: -5, single: -5, bb: -8, so: 8, go: 6, fo: 6, tacSt: 0 },
      { layer: 'offensive_attack', tacticValue: 'aggressive', hr: 5, xbh: 8, single: 0, bb: 0, so: 0, go: -6, fo: -4, tacSt: 12 },
      { layer: 'offensive_attack', tacticValue: 'balanced', hr: 0, xbh: 4, single: 6, bb: 4, so: -4, go: -4, fo: 0, tacSt: 0 },
      { layer: 'offensive_attack', tacticValue: 'conservative', hr: 0, xbh: 0, single: 8, bb: 6, so: -6, go: 0, fo: 4, tacSt: -8 },
      { layer: 'defense_setup', tacticValue: 'aggressive', hr: -6, xbh: -5, single: -4, bb: 0, so: 8, go: 8, fo: 0, tacSt: -6 },
      { layer: 'defense_setup', tacticValue: 'balanced', hr: -3, xbh: -3, single: 0, bb: 0, so: 4, go: 4, fo: 4, tacSt: 0 },
      { layer: 'defense_setup', tacticValue: 'protective', hr: -8, xbh: -6, single: 0, bb: 4, so: 0, go: 0, fo: 10, tacSt: 4 },
      { layer: 'attack_style', tacticValue: 'bunt', hr: -20, xbh: -20, single: 15, bb: 0, so: 0, go: 10, fo: 0, tacSt: 10 },
      { layer: 'attack_style', tacticValue: 'hit_and_run', hr: -25, xbh: -15, single: 15, bb: 0, so: 5, go: 0, fo: 0, tacSt: 15 },
      { layer: 'attack_style', tacticValue: 'swing_on_sight', hr: 15, xbh: 20, single: 0, bb: 0, so: 20, go: 0, fo: 10, tacSt: -10 },
      { layer: 'defense_counter_infield', tacticValue: 'short', hr: 0, xbh: 0, single: -12, bb: 0, so: 0, go: 10, fo: 0, tacSt: -8 },
      { layer: 'defense_counter_infield', tacticValue: 'deep', hr: 0, xbh: 0, single: -5, bb: 0, so: 0, go: 5, fo: 0, tacSt: 5 },
      { layer: 'defense_counter_outfield', tacticValue: 'short', hr: 0, xbh: 0, single: -5, bb: 0, so: 0, go: 0, fo: 4, tacSt: -5 },
      { layer: 'defense_counter_outfield', tacticValue: 'deep', hr: -8, xbh: -6, single: 0, bb: 0, so: 0, go: 0, fo: 8, tacSt: 3 },
    ];

    await db.insert(tacticCoefficients).values(defaults);
    console.log('Seeded 19 default tactic coefficients');
  }

  async resetTacticCoefficients(): Promise<void> {
    await db.delete(tacticCoefficients);
    await this.seedDefaultTacticCoefficients();
  }

  async consolidatePlayerBonuses(): Promise<void> {
    await db.update(players).set({
      pow: sql`${players.pow} + floor(coalesce(${players.powAdd}, 0)::numeric / 2)`,
      con: sql`${players.con} + floor(coalesce(${players.conAdd}, 0)::numeric / 2)`,
      spd: sql`${players.spd} + floor(coalesce(${players.spdAdd}, 0)::numeric / 2)`,
      eye: sql`${players.eye} + floor(coalesce(${players.eyeAdd}, 0)::numeric / 2)`,
      vel: sql`${players.vel} + floor(coalesce(${players.velAdd}, 0)::numeric / 2)`,
      ctl: sql`${players.ctl} + floor(coalesce(${players.ctlAdd}, 0)::numeric / 2)`,
      mov: sql`${players.mov} + floor(coalesce(${players.movAdd}, 0)::numeric / 2)`,
      sta: sql`${players.sta} + floor(coalesce(${players.staAdd}, 0)::numeric / 2)`,
      def: sql`${players.def} + floor(coalesce(${players.defAdd}, 0)::numeric / 2)`,
      powAdd: 0,
      conAdd: 0,
      spdAdd: 0,
      eyeAdd: 0,
      velAdd: 0,
      ctlAdd: 0,
      movAdd: 0,
      staAdd: 0,
      defAdd: 0,
    } as any);
    console.log('Consolidated player bonuses: floor(add/2) merged into base attributes, _add reset to 0');
  }

  async createAdminMessage(message: string, targetType: string, targetValue: string | null): Promise<any> {
    const [msg] = await db.insert(adminMessages).values({ message, targetType, targetValue: targetValue || null, active: true }).returning();
    return msg;
  }

  async getAdminMessages(): Promise<any[]> {
    return db.select().from(adminMessages).orderBy(desc(adminMessages.createdAt));
  }

  async deactivateAdminMessage(id: number): Promise<void> {
    await db.update(adminMessages).set({ active: false }).where(eq(adminMessages.id, id));
  }

  async getActiveMessagesForTeam(league: string, series: string, teamName: string): Promise<any[]> {
    const allActive = await db.select().from(adminMessages).where(eq(adminMessages.active, true)).orderBy(desc(adminMessages.createdAt));
    return allActive.filter(m => {
      if (m.targetType === 'all') return true;
      if (m.targetType === 'league') return m.targetValue === league;
      if (m.targetType === 'series') return m.targetValue === series;
      if (m.targetType === 'team') return m.targetValue === teamName;
      return false;
    });
  }

  async dismissMessage(messageId: number, walletAddress: string): Promise<void> {
    await db.insert(dismissedMessages).values({ messageId, walletAddress });
  }

  async getDismissedMessageIds(walletAddress: string): Promise<number[]> {
    const rows = await db.select({ messageId: dismissedMessages.messageId }).from(dismissedMessages).where(eq(dismissedMessages.walletAddress, walletAddress));
    return rows.map(r => r.messageId);
  }

  async listPlayerForSale(playerId: number, sellerWallet: string, sellerTeamId: number, price: number): Promise<MarketListing> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existingListings } = await client.query(
        `SELECT id FROM market_listings WHERE player_id = $1 AND status = 'active'`, [playerId]
      );
      if (existingListings.length > 0) throw new Error('Player already has an active listing');
      const updateResult = await client.query('UPDATE players SET team_id = NULL WHERE id = $1 AND team_id = $2', [playerId, sellerTeamId]);
      if (updateResult.rowCount === 0) throw new Error('Player not found or not owned by seller');
      const listingResult = await client.query(
        `INSERT INTO market_listings (player_id, seller_wallet, seller_team_id, price, status) VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
        [playerId, sellerWallet, sellerTeamId, price]
      );
      await client.query('COMMIT');
      const r = listingResult.rows[0];
      return { id: r.id, playerId: r.player_id, sellerWallet: r.seller_wallet, sellerTeamId: r.seller_team_id, price: r.price, status: r.status, buyerWallet: r.buyer_wallet, listedAt: r.listed_at };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async buyPlayer(listingId: number, buyerWallet: string, buyerTeamId: number): Promise<MarketListing> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [listing] } = await client.query('SELECT * FROM market_listings WHERE id = $1 AND status = $2 FOR UPDATE', [listingId, 'active']);
      if (!listing) throw new Error('Listing not found or already sold');

      if (listing.seller_wallet !== 'FREE_AGENT') {
        const { rows: [buyer] } = await client.query('SELECT id FROM users WHERE wallet_address = $1', [buyerWallet]);
        const { rows: [buyerTokens] } = await client.query('SELECT * FROM user_tokens WHERE user_id = $1 FOR UPDATE', [buyer.id]);
        if (!buyerTokens || buyerTokens.balance < listing.price) throw new Error('Insufficient tokens');

        await client.query('UPDATE user_tokens SET balance = balance - $1 WHERE user_id = $2', [listing.price, buyer.id]);

        const { rows: [seller] } = await client.query('SELECT id FROM users WHERE wallet_address = $1', [listing.seller_wallet]);
        if (seller) {
          const { rows: [sellerTokens] } = await client.query('SELECT * FROM user_tokens WHERE user_id = $1', [seller.id]);
          if (sellerTokens) {
            await client.query('UPDATE user_tokens SET balance = balance + $1 WHERE user_id = $2', [listing.price, seller.id]);
          } else {
            await client.query('INSERT INTO user_tokens (user_id, balance) VALUES ($1, $2)', [seller.id, listing.price]);
          }
        }
      }

      await client.query('UPDATE players SET team_id = $1 WHERE id = $2', [buyerTeamId, listing.player_id]);
      const { rows: [updated] } = await client.query(
        `UPDATE market_listings SET status = 'sold', buyer_wallet = $1 WHERE id = $2 RETURNING *`,
        [buyerWallet, listingId]
      );
      await client.query('COMMIT');
      return { id: updated.id, playerId: updated.player_id, sellerWallet: updated.seller_wallet, sellerTeamId: updated.seller_team_id, price: updated.price, status: updated.status, buyerWallet: updated.buyer_wallet, listedAt: updated.listed_at };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelListing(listingId: number, sellerWallet: string): Promise<MarketListing> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [listing] } = await client.query('SELECT * FROM market_listings WHERE id = $1 AND status = $2 AND seller_wallet = $3 FOR UPDATE', [listingId, 'active', sellerWallet]);
      if (!listing) throw new Error('Listing not found or not yours');

      await client.query('UPDATE players SET team_id = $1 WHERE id = $2', [listing.seller_team_id, listing.player_id]);
      const { rows: [updated] } = await client.query(
        `UPDATE market_listings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
        [listingId]
      );
      await client.query('COMMIT');
      return { id: updated.id, playerId: updated.player_id, sellerWallet: updated.seller_wallet, sellerTeamId: updated.seller_team_id, price: updated.price, status: updated.status, buyerWallet: updated.buyer_wallet, listedAt: updated.listed_at };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getActiveListings(): Promise<(MarketListing & { player: Player })[]> {
    const result = await pool.query(
      `SELECT ml.*, p.name as p_name, p.positions as p_positions,
        p.pow, p.con, p.spd, p.eye, p.vel, p.ctl, p.mov, p.sta, p.def,
        p.pow_add, p.con_add, p.spd_add, p.eye_add, p.vel_add, p.ctl_add, p.mov_add, p.sta_add, p.def_add
       FROM market_listings ml
       JOIN players p ON ml.player_id = p.id
       WHERE ml.status = 'active'
       ORDER BY ml.listed_at DESC`
    );
    return result.rows.map((r: any) => ({
      id: r.id,
      playerId: r.player_id,
      sellerWallet: r.seller_wallet,
      sellerTeamId: r.seller_team_id,
      price: r.price,
      status: r.status,
      buyerWallet: r.buyer_wallet,
      listedAt: r.listed_at,
      player: {
        id: r.player_id,
        name: r.p_name,
        teamId: null,
        positions: r.p_positions,
        pow: r.pow, con: r.con, spd: r.spd, eye: r.eye,
        vel: r.vel, ctl: r.ctl, mov: r.mov, sta: r.sta, def: r.def,
        powAdd: r.pow_add ?? 0, conAdd: r.con_add ?? 0, spdAdd: r.spd_add ?? 0, eyeAdd: r.eye_add ?? 0,
        velAdd: r.vel_add ?? 0, ctlAdd: r.ctl_add ?? 0, movAdd: r.mov_add ?? 0, staAdd: r.sta_add ?? 0, defAdd: r.def_add ?? 0,
      },
    }));
  }

  async getListingById(id: number): Promise<MarketListing | undefined> {
    const [listing] = await db.select().from(marketListings).where(eq(marketListings.id, id));
    return listing;
  }

  async getPlayerCountForTeam(teamId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(players).where(eq(players.teamId, teamId));
    return Number(result[0]?.count ?? 0);
  }
}

export const storage = new DatabaseStorage();
