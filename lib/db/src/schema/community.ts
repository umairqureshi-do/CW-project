import { pgTable, text, serial, timestamp, integer, varchar, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communityTrackedKeywordsTable = pgTable("community_tracked_keywords", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunityKeywordSchema = createInsertSchema(communityTrackedKeywordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCommunityKeyword = z.infer<typeof insertCommunityKeywordSchema>;
export type CommunityTrackedKeyword = typeof communityTrackedKeywordsTable.$inferSelect;

export const communityPostsTable = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 20 }).notNull(),
  subreddit: text("subreddit"),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  snippet: text("snippet").notNull().default(""),
  author: text("author"),
  keyword: text("keyword").notNull(),
  matchedKeywords: text("matched_keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  score: integer("score").notNull().default(0),
  postedAt: timestamp("posted_at").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  opportunityType: varchar("opportunity_type", { length: 30 }),
  opportunityScore: integer("opportunity_score"),
  opportunitySummary: text("opportunity_summary"),
  detectedCompetitors: text("detected_competitors").array().notNull().default(sql`ARRAY[]::text[]`),
});

export const insertCommunityPostSchema = createInsertSchema(communityPostsTable).omit({
  id: true,
  fetchedAt: true,
});
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPostsTable.$inferSelect;

export const communityRefreshLogsTable = pgTable("community_refresh_logs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  fetched: integer("fetched").default(0),
  analyzed: integer("analyzed").default(0),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  message: text("message").default(""),
});

export type CommunityRefreshLog = typeof communityRefreshLogsTable.$inferSelect;
