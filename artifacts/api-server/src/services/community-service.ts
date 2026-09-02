import { db } from "@workspace/db";
import {
  communityPostsTable,
  communityTrackedKeywordsTable,
  communityRefreshLogsTable,
} from "@workspace/db";
import { eq, desc, sql, and, gte, ilike } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ALL_TRACKED } from "./competitors.js";

export const DEFAULT_KEYWORDS = [
  "cloudways",
  "managed wordpress hosting",
  "wp engine vs kinsta",
  "best managed wordpress",
  "cloud hosting comparison",
];

const SOURCES = {
  reddit: "reddit",
  hackernews: "hackernews",
  stackoverflow: "stackoverflow",
  github: "github",
} as const;

// Build regex patterns per competitor once at startup
const COMPETITOR_PATTERNS: Array<{ pattern: RegExp; name: string }> = (
  ALL_TRACKED as unknown as string[]
).map((name) => ({
  name,
  // word-boundary match, case-insensitive
  pattern: new RegExp(`(?<![a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i"),
}));

export function detectCompetitors(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const { pattern, name } of COMPETITOR_PATTERNS) {
    if (pattern.test(text)) found.add(name);
  }
  return [...found].sort();
}

const OPPORTUNITY_TYPES = [
  "advice_seeking",
  "comparison",
  "complaint",
  "recommendation",
  "news",
  "general",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchUrl(url: string, retries = 2, attempt = 0): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MediaIntelBot/1.0; +https://cloudways.com)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (res.status === 429) {
      if (retries > 0) {
        // Exponential backoff: 15s, 30s, 60s
        const backoff = 15000 * Math.pow(2, attempt);
        await sleep(backoff);
        return fetchUrl(url, retries - 1, attempt + 1);
      }
      throw new Error(`HTTP 429`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (retries > 0 && !(err instanceof Error && err.message.startsWith("HTTP"))) {
      await sleep(2000);
      return fetchUrl(url, retries - 1, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&hellip;/g, "…").replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

function stripHtml(html: string): string {
  return decodeEntities(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractXml(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata) return stripHtml(cdata[1]).trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (plain) return stripHtml(plain[1]).trim();
  return "";
}

interface FetchedPost {
  source: string;
  subreddit: string | null;
  title: string;
  url: string;
  snippet: string;
  author: string | null;
  score: number;
  postedAt: Date;
  keyword: string;
}

async function fetchRedditSearch(keyword: string): Promise<FetchedPost[]> {
  const encoded = encodeURIComponent(keyword);
  const url = `https://www.reddit.com/search.rss?q=${encoded}&sort=new&limit=25`;
  try {
    const xml = await fetchUrl(url);
    if (!xml.includes("<feed") && !xml.includes("<channel")) return [];
    return parseRedditFeed(xml, keyword, null);
  } catch (err) {
    logger.warn({ err, keyword }, "Reddit search fetch failed");
    return [];
  }
}

async function fetchHNSearch(keyword: string): Promise<FetchedPost[]> {
  const encoded = encodeURIComponent(keyword);
  const url = `https://hnrss.org/newest?q=${encoded}&count=20`;
  try {
    const xml = await fetchUrl(url);
    if (!xml.includes("<rss") && !xml.includes("<channel")) return [];
    return parseHNFeed(xml, keyword);
  } catch (err) {
    logger.warn({ err, keyword }, "HN search fetch failed");
    return [];
  }
}

function parseRedditFeed(xml: string, keyword: string, subredditOverride: string | null): FetchedPost[] {
  const posts: FetchedPost[] = [];
  const items = xml.split(/<entry[\s>]|<item[\s>]/i).slice(1);

  for (const item of items) {
    const title = extractXml(item, "title");
    if (!title) continue;

    const linkMatch = item.match(/<link[^>]+href="([^"]+)"/i) || item.match(/<link[^>]*>([^<]+)<\/link>/i);
    const url = linkMatch?.[1]?.trim() ?? "";
    if (!url || !url.startsWith("http")) continue;

    const subredditMatch = url.match(/reddit\.com\/r\/([^/]+)\//i);
    const subreddit = subredditOverride ?? subredditMatch?.[1] ?? null;

    const rawSnippet = extractXml(item, "content") || extractXml(item, "description") || extractXml(item, "summary") || "";
    const snippet = rawSnippet.slice(0, 300);

    const author = extractXml(item, "author") || extractXml(item, "name") || null;

    const dateStr = extractXml(item, "updated") || extractXml(item, "published") || extractXml(item, "pubDate");
    const postedAt = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(postedAt.getTime())) continue;

    // Try to extract score from Reddit Atom feed
    const scoreMatch = item.match(/<score>(\d+)<\/score>/i) || item.match(/<ups>(\d+)<\/ups>/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    posts.push({ source: SOURCES.reddit, subreddit, title, url, snippet, author, score, postedAt, keyword });
  }
  return posts;
}

function parseHNFeed(xml: string, keyword: string): FetchedPost[] {
  const posts: FetchedPost[] = [];
  const items = xml.split(/<item[\s>]/i).slice(1);

  for (const item of items) {
    const title = extractXml(item, "title");
    if (!title) continue;

    const linkMatch = item.match(/<link>([^<]+)<\/link>/i);
    const url = linkMatch?.[1]?.trim() ?? "";
    if (!url || !url.startsWith("http")) continue;

    const rawSnippet = extractXml(item, "description") || "";
    const snippet = rawSnippet.slice(0, 300);

    const author = extractXml(item, "dc:creator") || null;

    const dateStr = extractXml(item, "pubDate");
    const postedAt = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(postedAt.getTime())) continue;

    // HN hnrss.org description sometimes includes "Points: N"
    const pointsMatch = rawSnippet.match(/Points:\s*(\d+)/i);
    const score = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;

    posts.push({ source: SOURCES.hackernews, subreddit: null, title, url, snippet, author, score, postedAt, keyword });
  }
  return posts;
}

async function fetchStackOverflow(keyword: string): Promise<FetchedPost[]> {
  const encoded = encodeURIComponent(keyword);
  const url = `https://api.stackexchange.com/2.3/search?order=desc&sort=activity&intitle=${encoded}&site=stackoverflow&pagesize=20`;
  try {
    const text = await fetchUrl(url);
    const data = JSON.parse(text) as {
      items?: Array<{
        title: string;
        link: string;
        body?: string;
        score: number;
        creation_date: number;
        last_activity_date: number;
        owner?: { display_name?: string };
        tags?: string[];
      }>;
    };
    if (!data.items) return [];
    return data.items.map((item) => ({
      source: SOURCES.stackoverflow,
      subreddit: item.tags?.[0] ?? null,
      title: decodeEntities(item.title),
      url: item.link,
      snippet: item.body ? stripHtml(item.body).slice(0, 300) : "",
      author: item.owner?.display_name ?? null,
      score: item.score,
      // Use last_activity_date so old questions with recent answers pass the 90-day filter
      postedAt: new Date((item.last_activity_date ?? item.creation_date) * 1000),
      keyword,
    }));
  } catch (err) {
    logger.warn({ err, keyword }, "Stack Overflow fetch failed");
    return [];
  }
}

async function fetchGitHub(keyword: string): Promise<FetchedPost[]> {
  const encoded = encodeURIComponent(keyword);
  const url = `https://api.github.com/search/issues?q=${encoded}&sort=created&order=desc&per_page=20`;
  try {
    const text = await fetchUrl(url);
    const data = JSON.parse(text) as {
      items?: Array<{
        title: string;
        html_url: string;
        body?: string | null;
        comments: number;
        created_at: string;
        user?: { login?: string };
        repository_url?: string;
        pull_request?: unknown;
      }>;
    };
    if (!data.items) return [];
    return data.items
      .filter((item) => !item.pull_request)
      .map((item) => {
        const repoMatch = item.repository_url?.match(/repos\/([^/]+\/[^/]+)$/);
        const repo = repoMatch?.[1] ?? null;
        return {
          source: SOURCES.github,
          subreddit: repo,
          title: item.title,
          url: item.html_url,
          snippet: item.body ? stripHtml(item.body).slice(0, 300) : "",
          author: item.user?.login ?? null,
          score: item.comments,
          postedAt: new Date(item.created_at),
          keyword,
        };
      });
  } catch (err) {
    logger.warn({ err, keyword }, "GitHub search fetch failed");
    return [];
  }
}

async function fetchAllForKeyword(keyword: string): Promise<FetchedPost[]> {
  const [reddit, hn, so, gh] = await Promise.allSettled([
    fetchRedditSearch(keyword),
    fetchHNSearch(keyword),
    fetchStackOverflow(keyword),
    fetchGitHub(keyword),
  ]);
  const posts: FetchedPost[] = [];
  if (reddit.status === "fulfilled") posts.push(...reddit.value);
  if (hn.status === "fulfilled") posts.push(...hn.value);
  if (so.status === "fulfilled") posts.push(...so.value);
  if (gh.status === "fulfilled") posts.push(...gh.value);
  return posts;
}

// --- AI Opportunity Analysis ---

interface OpportunityResult {
  opportunityType: OpportunityType;
  opportunityScore: number;
  opportunitySummary: string;
}

function parseJsonSafe<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as T;
    return null;
  } catch {
    return null;
  }
}

async function analyzeOpportunities(
  posts: Array<{ id: number; title: string; source: string; snippet: string; keyword: string }>
): Promise<Map<number, OpportunityResult>> {
  const results = new Map<number, OpportunityResult>();
  if (posts.length === 0) return results;

  const BATCH_SIZE = 10;
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    try {
      const postsList = batch
        .map(
          (p, idx) =>
            `[${idx + 1}] Title: "${p.title}"\n    Source: ${p.source}\n    Keyword: "${p.keyword}"\n    Snippet: "${p.snippet.slice(0, 200)}"`
        )
        .join("\n\n");

      const prompt = `You are a PR analyst for Cloudways (managed WordPress/cloud hosting platform).

Analyze these ${batch.length} community posts from Reddit/Hacker News and classify each as an engagement opportunity for Cloudways.

Posts:
${postsList}

For each post respond with:
- opportunityType: one of advice_seeking, comparison, complaint, recommendation, news, general
  - advice_seeking: user asking for hosting recommendations/help
  - comparison: user comparing hosting providers
  - complaint: user unhappy with a competitor
  - recommendation: user recommending a hosting provider
  - news: industry news/announcement
  - general: general discussion, not directly actionable
- opportunityScore: 1-10 (10 = highest priority for Cloudways to engage/monitor)
  - 8-10: someone actively seeking recommendations, comparing providers, or complaining about a competitor
  - 5-7: relevant discussion with moderate engagement value
  - 1-4: general news or low relevance
- opportunitySummary: 1 sentence explaining why this is or isn't an opportunity for Cloudways

Respond ONLY with a JSON array of ${batch.length} objects (same order as input):
[{"opportunityType":"...","opportunityScore":N,"opportunitySummary":"..."},...]`;

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const text = message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseJsonSafe<OpportunityResult[]>(text);

      if (parsed && Array.isArray(parsed)) {
        batch.forEach((post, idx) => {
          const r = parsed[idx];
          if (r && OPPORTUNITY_TYPES.includes(r.opportunityType as OpportunityType)) {
            results.set(post.id, {
              opportunityType: r.opportunityType as OpportunityType,
              opportunityScore: Math.min(10, Math.max(1, Math.round(r.opportunityScore))),
              opportunitySummary: String(r.opportunitySummary || "").slice(0, 300),
            });
          }
        });
      }
    } catch (err) {
      logger.warn({ err, batchStart: i }, "Community AI analysis batch failed");
    }

    if (i + BATCH_SIZE < posts.length) await sleep(500);
  }

  return results;
}

async function seedDefaultKeywords() {
  const existing = await db.select().from(communityTrackedKeywordsTable);
  if (existing.length > 0) return;
  for (const keyword of DEFAULT_KEYWORDS) {
    await db
      .insert(communityTrackedKeywordsTable)
      .values({ keyword, active: true })
      .onConflictDoNothing();
  }
  logger.info({ count: DEFAULT_KEYWORDS.length }, "Seeded default community keywords");
}

export async function refreshCommunity(): Promise<{ fetched: number; analyzed: number }> {
  await seedDefaultKeywords();

  const [log] = await db
    .insert(communityRefreshLogsTable)
    .values({ status: "running" })
    .returning();

  const maxAge = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let fetched = 0;
  const newPostIds: number[] = [];

  try {
    const keywords = await db
      .select()
      .from(communityTrackedKeywordsTable)
      .where(eq(communityTrackedKeywordsTable.active, true));

    for (let i = 0; i < keywords.length; i++) {
      const { keyword } = keywords[i];
      if (i > 0) await sleep(2500);

      try {
        const posts = await fetchAllForKeyword(keyword);
        for (const post of posts) {
          if (post.postedAt < maxAge) continue;

          const detected = detectCompetitors(post.title);

          // Skip posts that don't mention a competitor in the title
          if (detected.length === 0) continue;

          // Upsert: on URL conflict, merge the keyword into matched_keywords array
          // and update score if higher
          const [row] = await db
            .insert(communityPostsTable)
            .values({
              source: post.source,
              subreddit: post.subreddit,
              title: post.title,
              url: post.url,
              snippet: post.snippet,
              author: post.author,
              keyword: post.keyword,
              matchedKeywords: [post.keyword],
              score: post.score,
              postedAt: post.postedAt,
              detectedCompetitors: detected,
            })
            .onConflictDoUpdate({
              target: communityPostsTable.url,
              set: {
                matchedKeywords: sql`(
                  SELECT array_agg(DISTINCT k)
                  FROM unnest(array_append(${communityPostsTable.matchedKeywords}, ${post.keyword})) AS k
                )`,
                score: sql`GREATEST(${communityPostsTable.score}, ${post.score})`,
              },
            })
            .returning({ id: communityPostsTable.id, isNew: sql<boolean>`xmax = 0` });

          if (row) {
            fetched++;
            // xmax = 0 means it was a fresh INSERT (not an UPDATE)
            if (row.isNew) newPostIds.push(row.id);
          }
        }
      } catch (err) {
        logger.warn({ err, keyword }, "Community keyword fetch error");
      }
    }

    // AI-analyze newly fetched posts
    let analyzed = 0;
    if (newPostIds.length > 0) {
      const newPosts = await db
        .select({
          id: communityPostsTable.id,
          title: communityPostsTable.title,
          source: communityPostsTable.source,
          snippet: communityPostsTable.snippet,
          keyword: communityPostsTable.keyword,
        })
        .from(communityPostsTable)
        .where(sql`${communityPostsTable.id} = ANY(${sql.raw(`ARRAY[${newPostIds.join(",")}]::int[]`)})`)
        .limit(500);

      const opResults = await analyzeOpportunities(newPosts);
      analyzed = opResults.size;

      for (const [id, result] of opResults.entries()) {
        await db
          .update(communityPostsTable)
          .set({
            opportunityType: result.opportunityType,
            opportunityScore: result.opportunityScore,
            opportunitySummary: result.opportunitySummary,
          })
          .where(eq(communityPostsTable.id, id));
      }

      logger.info({ analyzed }, "Community AI opportunity analysis complete");
    }

    await db
      .update(communityRefreshLogsTable)
      .set({ status: "completed", completedAt: new Date(), fetched, analyzed })
      .where(eq(communityRefreshLogsTable.id, log.id));

    logger.info({ fetched, analyzed }, "Community refresh complete");
    return { fetched, analyzed };
  } catch (err) {
    await db
      .update(communityRefreshLogsTable)
      .set({ status: "failed", completedAt: new Date(), message: String(err) })
      .where(eq(communityRefreshLogsTable.id, log.id));
    throw err;
  }
}

export async function searchCommunityLive(keyword: string): Promise<FetchedPost[]> {
  const posts = await fetchAllForKeyword(keyword);
  const kw = keyword.toLowerCase();
  return posts.filter((p) => p.title.toLowerCase().includes(kw));
}

export async function saveSearchResults(keyword: string): Promise<{ saved: number; skipped: number }> {
  const allPosts = await fetchAllForKeyword(keyword);
  const kw = keyword.toLowerCase();
  const posts = allPosts.filter((p) => p.title.toLowerCase().includes(kw));
  let saved = 0;
  let skipped = 0;

  for (const post of posts) {
    const detected = detectCompetitors(post.title);
    if (detected.length === 0) { skipped++; continue; }

    await db
      .insert(communityPostsTable)
      .values({
        source: post.source,
        subreddit: post.subreddit,
        title: post.title,
        url: post.url,
        snippet: post.snippet,
        author: post.author,
        keyword: post.keyword,
        matchedKeywords: [post.keyword],
        score: post.score,
        postedAt: post.postedAt,
        detectedCompetitors: detected,
      })
      .onConflictDoUpdate({
        target: communityPostsTable.url,
        set: {
          matchedKeywords: sql`(
            SELECT array_agg(DISTINCT k)
            FROM unnest(array_append(${communityPostsTable.matchedKeywords}, ${post.keyword})) AS k
          )`,
          score: sql`GREATEST(${communityPostsTable.score}, ${post.score})`,
        },
      });
    saved++;
  }

  return { saved, skipped };
}

export interface ImportPost {
  source: string;
  subreddit: string | null;
  title: string;
  url: string;
  snippet: string | null;
  author: string | null;
  keyword: string;
  matchedKeywords: string[];
  score: number;
  postedAt: string;
  detectedCompetitors: string[];
  opportunityType: string | null;
  opportunityScore: number | null;
  opportunitySummary: string | null;
}

export async function importCommunityPosts(posts: ImportPost[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const post of posts) {
    const [row] = await db
      .insert(communityPostsTable)
      .values({
        source: post.source,
        subreddit: post.subreddit ?? undefined,
        title: post.title,
        url: post.url,
        snippet: post.snippet ?? undefined,
        author: post.author ?? undefined,
        keyword: post.keyword,
        matchedKeywords: post.matchedKeywords,
        score: post.score,
        postedAt: new Date(post.postedAt),
        detectedCompetitors: post.detectedCompetitors,
        opportunityType: post.opportunityType as any ?? undefined,
        opportunityScore: post.opportunityScore ?? undefined,
        opportunitySummary: post.opportunitySummary ?? undefined,
      })
      .onConflictDoUpdate({
        target: communityPostsTable.url,
        set: {
          matchedKeywords: sql`(
            SELECT array_agg(DISTINCT k)
            FROM unnest(${communityPostsTable.matchedKeywords} || ${sql.raw(
              post.matchedKeywords.length > 0
                ? `ARRAY[${post.matchedKeywords.map(k => `'${k.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`).join(",")}]::text[]`
                : "ARRAY[]::text[]"
            )}) AS k
          )`,
          score: sql`GREATEST(${communityPostsTable.score}, ${post.score})`,
          opportunityType: post.opportunityType as any,
          opportunityScore: post.opportunityScore,
          opportunitySummary: post.opportunitySummary,
          detectedCompetitors: post.detectedCompetitors,
        },
      })
      .returning({ id: communityPostsTable.id, isNew: sql<boolean>`xmax = 0` });

    if (row?.isNew) inserted++;
    else if (row) updated++;
  }

  return { inserted, updated };
}

export async function getCommunityPosts(opts: {
  source?: string;
  keyword?: string;
  q?: string;
  days?: number;
  sortBy?: "date" | "score";
  limit?: number;
  offset?: number;
  competitor?: string;
}) {
  const { source, keyword, q, days = 30, sortBy = "date", limit = 50, offset = 0, competitor } = opts;
  const conditions = [];

  if (source) conditions.push(eq(communityPostsTable.source, source));
  if (keyword) conditions.push(eq(communityPostsTable.keyword, keyword));
  if (competitor) conditions.push(sql`${competitor} = ANY(${communityPostsTable.detectedCompetitors})`);
  if (q) conditions.push(ilike(communityPostsTable.title, `%${q}%`));

  // Time range filter
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  conditions.push(gte(communityPostsTable.postedAt, since));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy =
    sortBy === "score"
      ? [desc(communityPostsTable.opportunityScore), desc(communityPostsTable.score), desc(communityPostsTable.postedAt)]
      : [desc(communityPostsTable.postedAt)];

  const [posts, [{ count }]] = await Promise.all([
    db
      .select()
      .from(communityPostsTable)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(communityPostsTable)
      .where(where),
  ]);

  return { posts, total: count };
}

export async function getCommunityStats() {
  const [bySource, lastLog] = await Promise.all([
    db
      .select({ source: communityPostsTable.source, count: sql<number>`count(*)::int` })
      .from(communityPostsTable)
      .groupBy(communityPostsTable.source)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ completedAt: communityRefreshLogsTable.completedAt })
      .from(communityRefreshLogsTable)
      .where(eq(communityRefreshLogsTable.status, "completed"))
      .orderBy(desc(communityRefreshLogsTable.completedAt))
      .limit(1),
  ]);

  const keywords = await db
    .select()
    .from(communityTrackedKeywordsTable)
    .where(eq(communityTrackedKeywordsTable.active, true));

  return {
    bySource,
    lastRefreshedAt: lastLog[0]?.completedAt ?? null,
    trackedKeywords: keywords.length,
  };
}

export async function getCommunityTrackedKeywords() {
  return db
    .select()
    .from(communityTrackedKeywordsTable)
    .orderBy(communityTrackedKeywordsTable.createdAt);
}

export async function addTrackedKeyword(keyword: string) {
  const [row] = await db
    .insert(communityTrackedKeywordsTable)
    .values({ keyword: keyword.toLowerCase().trim(), active: true })
    .onConflictDoUpdate({
      target: communityTrackedKeywordsTable.keyword,
      set: { active: true },
    })
    .returning();
  return row;
}

export async function removeTrackedKeyword(id: number) {
  await db
    .delete(communityTrackedKeywordsTable)
    .where(eq(communityTrackedKeywordsTable.id, id));
}

export async function getCommunityRefreshLogs(limit = 5) {
  const logs = await db
    .select()
    .from(communityRefreshLogsTable)
    .orderBy(desc(communityRefreshLogsTable.startedAt))
    .limit(Math.min(limit, 20));
  return { logs };
}

/** Backfill competitor detection for posts that have an empty array (run once on startup). */
export async function backfillCompetitorDetection(): Promise<void> {
  try {
    const rows = await db
      .select({ id: communityPostsTable.id, title: communityPostsTable.title })
      .from(communityPostsTable)
      .where(sql`array_length(${communityPostsTable.detectedCompetitors}, 1) IS NULL`);

    let updated = 0;
    for (const row of rows) {
      const detected = detectCompetitors(row.title);
      if (detected.length === 0) {
        await db.delete(communityPostsTable).where(eq(communityPostsTable.id, row.id));
      } else {
        await db
          .update(communityPostsTable)
          .set({ detectedCompetitors: detected })
          .where(eq(communityPostsTable.id, row.id));
        updated++;
      }
    }
    if (updated > 0) logger.info({ updated }, "Backfilled competitor detection on community posts");
  } catch (err) {
    logger.warn({ err }, "Community competitor backfill failed");
  }
}

/** Return the top competitors detected across all community posts in the given time range. */
export async function getCommunityCompetitorStats(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ detectedCompetitors: communityPostsTable.detectedCompetitors })
    .from(communityPostsTable)
    .where(gte(communityPostsTable.postedAt, since));

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const c of row.detectedCompetitors ?? []) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}
