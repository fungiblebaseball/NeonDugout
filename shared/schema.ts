import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  teamId: integer("team_id"),
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
  teamId: integer("team_id").notNull(),
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

export const pitcherRotations = pgTable("pitcher_rotations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  rotationOrder: jsonb("rotation_order").notNull().$type<number[]>(),
  roles: jsonb("roles").notNull().$type<{ sp: number | null; r1: number | null; closer: number | null; nextSp: number | null }>().default({ sp: null, r1: null, closer: null, nextSp: null }),
  maxPitches: integer("max_pitches").notNull().default(100),
  maxInnings: integer("max_innings").notNull().default(7),
  maxBb: integer("max_bb").notNull().default(4),
  maxEr: integer("max_er").notNull().default(4),
  r1MaxPitches: integer("r1_max_pitches").notNull().default(40),
  r1MaxEr: integer("r1_max_er").notNull().default(3),
  closerMaxPitches: integer("closer_max_pitches").notNull().default(30),
  closerMaxEr: integer("closer_max_er").notNull().default(2),
});

export const tactics = pgTable("tactics", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  attackStyle: text("attack_style").notNull().default("neutral"),
  infieldPosition: text("infield_position").notNull().default("neutral"),
  outfieldPosition: text("outfield_position").notNull().default("neutral"),
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
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true });
export const insertLineupSchema = createInsertSchema(lineups).omit({ id: true });
export const insertPitcherRotationSchema = createInsertSchema(pitcherRotations).omit({ id: true });
export const insertTacticsSchema = createInsertSchema(tactics).omit({ id: true });
export const insertMatchDetailsSchema = createInsertSchema(matchDetails).omit({ id: true });

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
