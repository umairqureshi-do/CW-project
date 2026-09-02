import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const competitorPagesTable = pgTable("competitor_pages", {
  id: serial("id").primaryKey(),
  competitor: text("competitor").notNull(),
  url: text("url").notNull().unique(),
  title: text("title").notNull().default(""),
  pageType: varchar("page_type", { length: 50 }).notNull().default("page"),
  section: text("section").notNull().default(""),
  lastmod: timestamp("lastmod"),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export const insertCompetitorPageSchema = createInsertSchema(competitorPagesTable).omit({
  id: true,
  firstSeenAt: true,
  lastSeenAt: true,
});
export type InsertCompetitorPage = z.infer<typeof insertCompetitorPageSchema>;
export type CompetitorPage = typeof competitorPagesTable.$inferSelect;

export const competitorPagesRefreshLogsTable = pgTable("competitor_pages_refresh_logs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  fetched: text("fetched").default("0"),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  message: text("message").default(""),
});

export type CompetitorPagesRefreshLog = typeof competitorPagesRefreshLogsTable.$inferSelect;
