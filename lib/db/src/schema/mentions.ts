import { pgTable, text, serial, timestamp, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mentionsTable = pgTable("mentions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  publisher: text("publisher").notNull(),
  publisherType: varchar("publisher_type", { length: 50 }).notNull().default("general"),
  publishedAt: timestamp("published_at").notNull(),
  snippet: text("snippet").notNull().default(""),
  competitor: text("competitor").notNull(),
  mentionType: varchar("mention_type", { length: 50 }).notNull().default("other"),
  sentiment: varchar("sentiment", { length: 20 }).notNull().default("neutral"),
  opportunityInsight: text("opportunity_insight").notNull().default(""),
  opportunityAngle: text("opportunity_angle").notNull().default(""),
  outreachTarget: varchar("outreach_target", { length: 50 }).notNull().default("other"),
  score: integer("score").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("unread"),
  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMentionSchema = createInsertSchema(mentionsTable).omit({ id: true, createdAt: true });
export type InsertMention = z.infer<typeof insertMentionSchema>;
export type Mention = typeof mentionsTable.$inferSelect;

export const refreshLogsTable = pgTable("refresh_logs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  fetched: integer("fetched").default(0),
  analyzed: integer("analyzed").default(0),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  message: text("message").default(""),
});

export type RefreshLog = typeof refreshLogsTable.$inferSelect;
