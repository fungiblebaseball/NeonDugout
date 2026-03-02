import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  teamId: integer("team_id"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  primaryColor: text("primary_color").notNull().default("#ec4899"),
  league: text("league").notNull().default("L1"),
  series: text("series").notNull().default("A"),
  division: text("division").notNull(),
  ownerWallet: text("owner_wallet"),
  seasonId: integer("season_id").notNull().default(1),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teamId: integer("team_id"),
  positions: text("positions").array().notNull(),
  pow: integer("pow").notNull(),
  con: integer("con").notNull(),
  spd: integer("spd").notNull(),
  eye: integer("eye").notNull(),
  vel: integer("vel").notNull(),
  ctl: integer("ctl").notNull(),
  mov: integer("mov").notNull(),
  sta: integer("sta").notNull(),
  def: integer("def").notNull(),
  powAdd: integer("pow_add").notNull().default(0),
  conAdd: integer("con_add").notNull().default(0),
  spdAdd: integer("spd_add").notNull().default(0),
  eyeAdd: integer("eye_add").notNull().default(0),
  velAdd: integer("vel_add").notNull().default(0),
  ctlAdd: integer("ctl_add").notNull().default(0),
  movAdd: integer("mov_add").notNull().default(0),
  staAdd: integer("sta_add").notNull().default(0),
  defAdd: integer("def_add").notNull().default(0),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().default(1),
  division: text("division").notNull(),
  day: integer("day").notNull(),
  matchDate: text("match_date").notNull(),
  homeTeamId: integer("home_team_id").notNull(),
  awayTeamId: integer("away_team_id").notNull(),
  played: boolean("played").notNull().default(false),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  matchType: text("match_type").notNull().default("regular"),
});

export const lineups = pgTable("lineups", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  fieldPositions: jsonb("field_positions").notNull().$type<Record<string, number | null>>(),
  battingOrder: jsonb("batting_order").notNull().$type<number[]>(),
});

export interface PitcherRoleConfig {
  maxPitches: number;
  maxInnings: number;
  maxBb: number;
  maxEr: number;
  pitcherStyle: string;
}

export interface PitcherConfigs {
  sp: PitcherRoleConfig;
  r1: PitcherRoleConfig;
  closer: PitcherRoleConfig;
}

export const DEFAULT_PITCHER_CONFIGS: PitcherConfigs = {
  sp: { maxPitches: 100, maxInnings: 7, maxBb: 4, maxEr: 4, pitcherStyle: 'command' },
  r1: { maxPitches: 40, maxInnings: 9, maxBb: 4, maxEr: 3, pitcherStyle: 'command' },
  closer: { maxPitches: 30, maxInnings: 9, maxBb: 4, maxEr: 2, pitcherStyle: 'command' },
};

export const pitcherRotations = pgTable("pitcher_rotations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  rotationOrder: jsonb("rotation_order").notNull().$type<number[]>(),
  roles: jsonb("roles").notNull().$type<{ sp: number | null; r1: number | null; closer: number | null; nextSp: number | null }>().default({ sp: null, r1: null, closer: null, nextSp: null }),
  pitcherConfigs: jsonb("pitcher_configs").$type<PitcherConfigs>().default(DEFAULT_PITCHER_CONFIGS),
});

export interface TacticSwitchConditions {
  maxInning?: number;
  maxStrikeouts?: number;
  maxRunsAllowed?: number;
  maxHitsAllowed?: number;
}

export interface TacticSlot {
  value: string;
  conditions: TacticSwitchConditions;
}

export interface TacticSchedule {
  primary: TacticSlot;
  secondary: TacticSlot;
  optional: TacticSlot;
}

export const DEFAULT_BATTER_APPROACH_SCHEDULE: TacticSchedule = {
  primary: { value: 'contact', conditions: { maxInning: 5 } },
  secondary: { value: 'power', conditions: { maxInning: 8 } },
  optional: { value: 'patient', conditions: {} },
};

export const DEFAULT_ATTACK_STYLE_SCHEDULE: TacticSchedule = {
  primary: { value: 'neutral', conditions: { maxInning: 5 } },
  secondary: { value: 'neutral', conditions: { maxInning: 8 } },
  optional: { value: 'neutral', conditions: {} },
};

export const DEFAULT_OFFENSIVE_ATTACK_SCHEDULE: TacticSchedule = {
  primary: { value: 'balanced', conditions: { maxInning: 5 } },
  secondary: { value: 'balanced', conditions: { maxInning: 8 } },
  optional: { value: 'balanced', conditions: {} },
};

export const tactics = pgTable("tactics", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  attackStyle: text("attack_style").notNull().default("neutral"),
  infieldPosition: text("infield_position").notNull().default("neutral"),
  outfieldPosition: text("outfield_position").notNull().default("neutral"),
  batterApproach: text("batter_approach").notNull().default("contact"),
  offensiveAttack: text("offensive_attack").notNull().default("balanced"),
  defenseSetup: text("defense_setup").notNull().default("balanced"),
  batterApproachSchedule: jsonb("batter_approach_schedule").$type<TacticSchedule>(),
  attackStyleSchedule: jsonb("attack_style_schedule").$type<TacticSchedule>(),
  offensiveAttackSchedule: jsonb("offensive_attack_schedule").$type<TacticSchedule>(),
});

export const tacticCoefficients = pgTable("tactic_coefficients", {
  id: serial("id").primaryKey(),
  layer: text("layer").notNull(),
  tacticValue: text("tactic_value").notNull(),
  hr: integer("hr").notNull().default(0),
  xbh: integer("xbh").notNull().default(0),
  single: integer("single").notNull().default(0),
  bb: integer("bb").notNull().default(0),
  so: integer("so").notNull().default(0),
  go: integer("go").notNull().default(0),
  fo: integer("fo").notNull().default(0),
  tacSt: integer("tac_st").notNull().default(0),
});

export const matchDetails = pgTable("match_details", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().unique(),
  boxScore: jsonb("box_score").notNull(),
  flavorTexts: jsonb("flavor_texts").notNull().$type<string[]>(),
  mvp: jsonb("mvp").notNull().$type<{ name: string; reason: string }>(),
  homeLineup: jsonb("home_lineup").notNull().$type<{ playerIds: number[]; pitcherId: number }>(),
  awayLineup: jsonb("away_lineup").notNull().$type<{ playerIds: number[]; pitcherId: number }>(),
  homeBatters: jsonb("home_batters").notNull(),
  awayBatters: jsonb("away_batters").notNull(),
  homePitcher: jsonb("home_pitcher").notNull(),
  awayPitcher: jsonb("away_pitcher").notNull(),
  homePitchers: jsonb("home_pitchers").$type<any[]>(),
  awayPitchers: jsonb("away_pitchers").$type<any[]>(),
  playLog: jsonb("play_log").$type<any[]>(),
});

export const teamSnapshots = pgTable("team_snapshots", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  seasonId: integer("season_id").notNull(),
  name: text("name").notNull(),
  division: text("division").notNull(),
  league: text("league").notNull(),
  series: text("series").notNull(),
  primaryColor: text("primary_color").notNull().default("#ec4899"),
  ownerWallet: text("owner_wallet"),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  runsFor: integer("runs_for").notNull().default(0),
  runsAgainst: integer("runs_against").notNull().default(0),
});

export const playerSeasonStats = pgTable("player_season_stats", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  seasonId: integer("season_id").notNull().default(1),
  teamId: integer("team_id").notNull(),
  gamesPlayed: integer("games_played").notNull().default(0),
  ab: integer("ab").notNull().default(0),
  hits: integer("hits").notNull().default(0),
  hr: integer("hr").notNull().default(0),
  rbi: integer("rbi").notNull().default(0),
  bb: integer("bb").notNull().default(0),
  so: integer("so").notNull().default(0),
  ip: integer("ip").notNull().default(0),
  pitcherH: integer("pitcher_h").notNull().default(0),
  er: integer("er").notNull().default(0),
  pitcherBb: integer("pitcher_bb").notNull().default(0),
  pitcherSo: integer("pitcher_so").notNull().default(0),
  pitchCount: integer("pitch_count").notNull().default(0),
  gamesStarted: integer("games_started").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
});

export const trainingResults = pgTable("training_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id").notNull(),
  gameType: text("game_type").notNull(),
  score: integer("score").notNull(),
  rawData: jsonb("raw_data").notNull().$type<Record<string, any>>(),
  rewardAttribute: text("reward_attribute").notNull(),
  rewardPlayerId: integer("reward_player_id").notNull(),
  rewardAmount: integer("reward_amount").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
  rewardPlayerIds: jsonb("reward_player_ids").$type<number[]>(),
  rewardAttributes: text("reward_attributes").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainingConfig = pgTable("training_config", {
  id: serial("id").primaryKey(),
  gameType: text("game_type").notNull().unique(),
  rewardAttributes: text("reward_attributes").array().notNull(),
  rewardAmount: integer("reward_amount").notNull().default(1),
  minScoreForReward: integer("min_score_for_reward").notNull().default(200),
  maxBoostPerSeason: integer("max_boost_per_season").notNull().default(10),
  rewardTarget: text("reward_target").notNull().default("random"),
  rewardTargetRole: text("reward_target_role"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true });
export const insertLineupSchema = createInsertSchema(lineups).omit({ id: true });
export const insertPitcherRotationSchema = createInsertSchema(pitcherRotations).omit({ id: true });
export const insertTacticsSchema = createInsertSchema(tactics).omit({ id: true });
export const insertMatchDetailsSchema = createInsertSchema(matchDetails).omit({ id: true });
export const insertTeamSnapshotSchema = createInsertSchema(teamSnapshots).omit({ id: true });
export const insertPlayerSeasonStatsSchema = createInsertSchema(playerSeasonStats).omit({ id: true });
export const insertTrainingResultSchema = createInsertSchema(trainingResults).omit({ id: true, createdAt: true, confirmed: true });
export const userTokens = pgTable("user_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  lastClaimAt: timestamp("last_claim_at"),
});

export const tokenConfig = pgTable("token_config", {
  id: serial("id").primaryKey(),
  claimAmount: integer("claim_amount").notNull().default(10),
  claimIntervalHours: integer("claim_interval_hours").notNull().default(24),
});

export const insertTacticCoefficientsSchema = createInsertSchema(tacticCoefficients).omit({ id: true });
export const insertTrainingConfigSchema = createInsertSchema(trainingConfig).omit({ id: true });
export const insertUserTokensSchema = createInsertSchema(userTokens).omit({ id: true });
export const insertTokenConfigSchema = createInsertSchema(tokenConfig).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertLineup = z.infer<typeof insertLineupSchema>;
export type Lineup = typeof lineups.$inferSelect;
export type InsertPitcherRotation = z.infer<typeof insertPitcherRotationSchema>;
export type PitcherRotation = typeof pitcherRotations.$inferSelect;
export type InsertTactics = z.infer<typeof insertTacticsSchema>;
export type Tactics = typeof tactics.$inferSelect;
export type InsertMatchDetails = z.infer<typeof insertMatchDetailsSchema>;
export type MatchDetails = typeof matchDetails.$inferSelect;
export type InsertTeamSnapshot = z.infer<typeof insertTeamSnapshotSchema>;
export type TeamSnapshot = typeof teamSnapshots.$inferSelect;
export type InsertPlayerSeasonStats = z.infer<typeof insertPlayerSeasonStatsSchema>;
export type PlayerSeasonStats = typeof playerSeasonStats.$inferSelect;
export type InsertTrainingResult = z.infer<typeof insertTrainingResultSchema>;
export type TrainingResult = typeof trainingResults.$inferSelect;
export type InsertTrainingConfig = z.infer<typeof insertTrainingConfigSchema>;
export type TrainingConfig = typeof trainingConfig.$inferSelect;
export type InsertUserTokens = z.infer<typeof insertUserTokensSchema>;
export type UserTokens = typeof userTokens.$inferSelect;
export type InsertTacticCoefficients = z.infer<typeof insertTacticCoefficientsSchema>;
export type TacticCoefficient = typeof tacticCoefficients.$inferSelect;
export type InsertTokenConfig = z.infer<typeof insertTokenConfigSchema>;
export type TokenConfig = typeof tokenConfig.$inferSelect;

export const adminMessages = pgTable("admin_messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  targetType: text("target_type").notNull().default("all"),
  targetValue: text("target_value"),
  createdAt: timestamp("created_at").defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const insertAdminMessageSchema = createInsertSchema(adminMessages).omit({ id: true, createdAt: true });
export type InsertAdminMessage = z.infer<typeof insertAdminMessageSchema>;
export type AdminMessage = typeof adminMessages.$inferSelect;

export const dismissedMessages = pgTable("dismissed_messages", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  dismissedAt: timestamp("dismissed_at").defaultNow(),
});

export const insertDismissedMessageSchema = createInsertSchema(dismissedMessages).omit({ id: true, dismissedAt: true });
export type InsertDismissedMessage = z.infer<typeof insertDismissedMessageSchema>;
export type DismissedMessage = typeof dismissedMessages.$inferSelect;

export const marketListings = pgTable("market_listings", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  sellerWallet: text("seller_wallet").notNull(),
  sellerTeamId: integer("seller_team_id").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("active"),
  buyerWallet: text("buyer_wallet"),
  listedAt: timestamp("listed_at").defaultNow(),
});

export const insertMarketListingSchema = createInsertSchema(marketListings).omit({ id: true, listedAt: true });
export type InsertMarketListing = z.infer<typeof insertMarketListingSchema>;
export type MarketListing = typeof marketListings.$inferSelect;
