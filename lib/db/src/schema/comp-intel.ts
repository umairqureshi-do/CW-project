import { pgTable, text, serial, timestamp, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const compIntelArticlesTable = pgTable("comp_intel_articles", {
  id: serial("id").primaryKey(),
  competitor: text("competitor").notNull(),
  blogName: text("blog_name").notNull(),
  blogUrl: text("blog_url").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  publishedAt: timestamp("published_at").notNull(),
  snippet: text("snippet").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompIntelArticleSchema = createInsertSchema(compIntelArticlesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCompIntelArticle = z.infer<typeof insertCompIntelArticleSchema>;
export type CompIntelArticle = typeof compIntelArticlesTable.$inferSelect;

export const compIntelRefreshLogsTable = pgTable("comp_intel_refresh_logs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  fetched: integer("fetched").default(0),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  message: text("message").default(""),
});

export type CompIntelRefreshLog = typeof compIntelRefreshLogsTable.$inferSelect;
