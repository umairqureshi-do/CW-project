import { db } from "@workspace/db";
import { mentionsTable, refreshLogsTable } from "@workspace/db";
import { and, eq, gte, desc, count, sql, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { fetchAllFeeds } from "./rss-fetcher.js";
import { fetchNewsApiMentions } from "./newsapi-fetcher.js";
import { fetchGlobeNewsWireMentions } from "./gnw-fetcher.js";
import { analyzeMention } from "./ai-analyzer.js";
import { batchProcess } from "@workspace/integrations-anthropic-ai/batch";
import type { RawArticle } from "./rss-fetcher.js";
import { COMPETITORS, getCompetitorSlug } from "./competitors.js";

const PUBLISHER_TIER_SCORES: Record<string, number> = {
  "TechCrunch": 40, "Wired": 40, "Forbes": 40, "Ars Technica": 40,
  "PCMag": 35, "TechRadar": 35, "CNET": 35, "ZDNet": 35,
  "Search Engine Journal": 30, "BleepingComputer": 30, "G2": 30, "Capterra": 30,
  "Smashingmagazine.com": 25, "SitePoint": 25, "WPBeginner": 25,
};

const MENTION_TYPE_SCORES: Record<string, number> = {
  review: 30, comparison: 30, ranking: 25, customer_story: 20,
  news: 15, sponsored: 10, other: 5,
};

export function computeScore(params: {
  publisher: string;
  publisherType: string;
  mentionType: string;
  sentiment: string;
  publishedAt: Date;
}): number {
  const publisherScore = PUBLISHER_TIER_SCORES[params.publisher] ??
    (params.publisherType === "tech_media" ? 30 :
     params.publisherType === "review_site" ? 25 :
     params.publisherType === "saas_blog" ? 20 : 15);

  const typeScore = MENTION_TYPE_SCORES[params.mentionType] ?? 5;

  const daysAgo = (Date.now() - params.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore =
    daysAgo <= 1 ? 30 :
    daysAgo <= 3 ? 25 :
    daysAgo <= 7 ? 20 :
    daysAgo <= 14 ? 15 :
    daysAgo <= 30 ? 10 :
    daysAgo <= 60 ? 5 : 0;

  return Math.min(100, publisherScore + typeScore + recencyScore);
}

export function getTimeRangeCutoff(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    case "90d":
      now.setDate(now.getDate() - 90);
      break;
    default:
      now.setDate(now.getDate() - 30);
  }
  return now;
}

export async function getMentions(params: {
  competitor?: string;
  timeRange?: string;
  mentionType?: string;
  publisher?: string;
  sentiment?: string;
  status?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}) {
  const {
    competitor,
    timeRange = "30d",
    mentionType,
    publisher,
    sentiment,
    status,
    sortBy = "date",
    limit = 50,
    offset = 0,
  } = params;

  const cutoff = getTimeRangeCutoff(timeRange);

  const conditions = [gte(mentionsTable.publishedAt, cutoff)];

  if (competitor) conditions.push(eq(mentionsTable.competitor, competitor));
  if (mentionType) conditions.push(eq(mentionsTable.mentionType, mentionType));
  if (publisher) conditions.push(eq(mentionsTable.publisher, publisher));
  if (sentiment) conditions.push(eq(mentionsTable.sentiment, sentiment));
  if (status) conditions.push(eq(mentionsTable.status, status));

  const orderBy = sortBy === "score"
    ? [desc(mentionsTable.score), desc(mentionsTable.publishedAt)]
    : [desc(mentionsTable.publishedAt)];

  const [mentions, totalResult] = await Promise.all([
    db
      .select()
      .from(mentionsTable)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(mentionsTable)
      .where(and(...conditions)),
  ]);

  return {
    mentions,
    total: totalResult[0]?.count ?? 0,
  };
}

export async function updateMentionStatus(id: number, status: string) {
  const [updated] = await db
    .update(mentionsTable)
    .set({ status })
    .where(eq(mentionsTable.id, id))
    .returning();

  return updated ?? null;
}

export async function getMentionStats(timeRange = "30d", competitor?: string) {
  const cutoff = getTimeRangeCutoff(timeRange);
  const baseConditions = competitor
    ? [gte(mentionsTable.publishedAt, cutoff), eq(mentionsTable.competitor, competitor)]
    : [gte(mentionsTable.publishedAt, cutoff)];
  const condition = and(...baseConditions);

  const [
    totalResult,
    byCompetitor,
    byType,
    bySentiment,
    topPublishers,
    opportunityResult,
    lastRefresh,
  ] = await Promise.all([
    db.select({ count: count() }).from(mentionsTable).where(condition),
    db
      .select({ competitor: mentionsTable.competitor, count: count() })
      .from(mentionsTable)
      .where(condition)
      .groupBy(mentionsTable.competitor)
      .orderBy(desc(count())),
    db
      .select({ type: mentionsTable.mentionType, count: count() })
      .from(mentionsTable)
      .where(condition)
      .groupBy(mentionsTable.mentionType)
      .orderBy(desc(count())),
    db
      .select({ sentiment: mentionsTable.sentiment, count: count() })
      .from(mentionsTable)
      .where(condition)
      .groupBy(mentionsTable.sentiment),
    db
      .select({ publisher: mentionsTable.publisher, count: count() })
      .from(mentionsTable)
      .where(condition)
      .groupBy(mentionsTable.publisher)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({ count: count() })
      .from(mentionsTable)
      .where(
        and(
          condition,
          isNotNull(mentionsTable.opportunityInsight),
          sql`${mentionsTable.opportunityInsight} != ''`,
          sql`${mentionsTable.mentionType} NOT IN ('sponsored', 'other')`
        )
      ),
    db
      .select({ completedAt: refreshLogsTable.completedAt })
      .from(refreshLogsTable)
      .where(eq(refreshLogsTable.status, "completed"))
      .orderBy(desc(refreshLogsTable.completedAt))
      .limit(1),
  ]);

  return {
    totalMentions: totalResult[0]?.count ?? 0,
    byCompetitor: byCompetitor.map((r) => ({
      competitor: r.competitor,
      count: r.count,
    })),
    byType: byType.map((r) => ({ type: r.type, count: r.count })),
    bySentiment: bySentiment.map((r) => ({
      sentiment: r.sentiment,
      count: r.count,
    })),
    topPublishers: topPublishers.map((r) => ({
      publisher: r.publisher,
      count: r.count,
    })),
    opportunityCount: opportunityResult[0]?.count ?? 0,
    lastRefreshedAt: lastRefresh[0]?.completedAt?.toISOString() ?? null,
  };
}

export async function getRecentActivity(limit = 10) {
  const mentions = await db
    .select()
    .from(mentionsTable)
    .orderBy(desc(mentionsTable.publishedAt))
    .limit(limit);

  return { mentions, total: mentions.length };
}

export async function getMentionsByCompetitor(timeRange = "30d") {
  const cutoff = getTimeRangeCutoff(timeRange);

  const counts = await db
    .select({ competitor: mentionsTable.competitor, count: count() })
    .from(mentionsTable)
    .where(gte(mentionsTable.publishedAt, cutoff))
    .groupBy(mentionsTable.competitor)
    .orderBy(desc(count()));

  return { counts: counts.map((r) => ({ competitor: r.competitor, count: r.count })) };
}

export async function getCompetitors() {
  const counts = await db
    .select({ competitor: mentionsTable.competitor, count: count() })
    .from(mentionsTable)
    .groupBy(mentionsTable.competitor)
    .orderBy(desc(count()));

  const countMap = new Map(counts.map((r) => [r.competitor, r.count]));

  return {
    competitors: COMPETITORS.map((name) => ({
      name,
      slug: getCompetitorSlug(name),
      mentionCount: countMap.get(name) ?? 0,
    })),
  };
}

export async function getRefreshLogs(limit = 5) {
  const logs = await db
    .select()
    .from(refreshLogsTable)
    .orderBy(desc(refreshLogsTable.startedAt))
    .limit(limit);

  return { logs };
}

export async function getPublishers() {
  const publishers = await db
    .select({
      publisher: mentionsTable.publisher,
      publisherType: mentionsTable.publisherType,
      count: count(),
    })
    .from(mentionsTable)
    .groupBy(mentionsTable.publisher, mentionsTable.publisherType)
    .orderBy(desc(count()));

  return {
    publishers: publishers.map((p) => ({
      name: p.publisher,
      type: p.publisherType,
      mentionCount: p.count,
    })),
  };
}

export async function refreshMentions(specificCompetitors?: string[]): Promise<{
  success: boolean;
  fetched: number;
  analyzed: number;
  message: string;
}> {
  const [logEntry] = await db
    .insert(refreshLogsTable)
    .values({ status: "running" })
    .returning();

  try {
    logger.info("Starting mentions refresh from RSS feeds and NewsAPI");
    const [rssArticles, newsApiArticles] = await Promise.all([
      fetchAllFeeds(),
      fetchNewsApiMentions(),
    ]);

    const seen = new Set<string>();
    const articles: RawArticle[] = [];
    for (const a of [...rssArticles, ...newsApiArticles]) {
      const key = `${a.url}:${a.competitors[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        articles.push(a);
      }
    }

    logger.info({ rss: rssArticles.length, newsApi: newsApiArticles.length, total: articles.length }, "Articles fetched");

    let filtered = articles;
    if (specificCompetitors && specificCompetitors.length > 0) {
      filtered = articles.filter((a) =>
        a.competitors.some((c) => specificCompetitors.includes(c))
      );
    }

    logger.info({ count: filtered.length }, "Articles with competitor mentions");

    const existing = await db
      .select({ url: mentionsTable.url, competitor: mentionsTable.competitor })
      .from(mentionsTable);

    const existingKeys = new Set(
      existing.map((e) => `${e.url}:${e.competitor}`)
    );

    const newArticles = filtered.filter(
      (a) => !existingKeys.has(`${a.url}:${a.competitors[0]}`)
    );

    logger.info({ count: newArticles.length }, "New articles to analyze");

    if (newArticles.length === 0) {
      await db
        .update(refreshLogsTable)
        .set({
          completedAt: new Date(),
          status: "completed",
          fetched: filtered.length,
          analyzed: 0,
          message: "No new articles found",
        })
        .where(eq(refreshLogsTable.id, logEntry.id));

      return {
        success: true,
        fetched: filtered.length,
        analyzed: 0,
        message: "No new articles to analyze",
      };
    }

    const analyzed = await batchProcess<RawArticle, boolean>(
      newArticles,
      async (article) => {
        try {
          const analysis = await analyzeMention(article);

          const score = computeScore({
            publisher: article.publisher,
            publisherType: article.publisherType,
            mentionType: analysis.mentionType,
            sentiment: analysis.sentiment,
            publishedAt: article.publishedAt,
          });

          // Layer 2: AI relevance gate — discard if AI deems it non-hosting-related
          if (!analysis.isHostingRelated) {
            logger.debug(
              { url: article.url, competitor: article.competitors[0] },
              "Skipping non-hosting-related article (AI gate)"
            );
            return false;
          }

          await db.insert(mentionsTable).values({
            title: article.title,
            url: article.url,
            publisher: article.publisher,
            publisherType: article.publisherType,
            publishedAt: article.publishedAt,
            snippet: article.snippet,
            competitor: article.competitors[0],
            mentionType: analysis.mentionType,
            sentiment: analysis.sentiment,
            opportunityInsight: analysis.opportunityInsight,
            opportunityAngle: analysis.opportunityAngle,
            outreachTarget: analysis.outreachTarget,
            score,
            analyzedAt: new Date(),
          }).onConflictDoNothing();

          return true;
        } catch (err) {
          logger.warn({ err, url: article.url }, "Failed to save mention");
          return false;
        }
      },
      { concurrency: 3, retries: 2 }
    );

    const successCount = analyzed.filter(Boolean).length;

    await db
      .update(refreshLogsTable)
      .set({
        completedAt: new Date(),
        status: "completed",
        fetched: filtered.length,
        analyzed: successCount,
        message: `Analyzed and saved ${successCount} new mentions`,
      })
      .where(eq(refreshLogsTable.id, logEntry.id));

    logger.info({ fetched: filtered.length, analyzed: successCount }, "Refresh complete");

    return {
      success: true,
      fetched: filtered.length,
      analyzed: successCount,
      message: `Successfully analyzed ${successCount} new mentions from ${filtered.length} articles`,
    };
  } catch (err) {
    logger.error({ err }, "Refresh failed");

    await db
      .update(refreshLogsTable)
      .set({
        completedAt: new Date(),
        status: "failed",
        message: err instanceof Error ? err.message : "Unknown error",
      })
      .where(eq(refreshLogsTable.id, logEntry.id));

    return {
      success: false,
      fetched: 0,
      analyzed: 0,
      message: "Refresh failed: " + (err instanceof Error ? err.message : "Unknown error"),
    };
  }
}
