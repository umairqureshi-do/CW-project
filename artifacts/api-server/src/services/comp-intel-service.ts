import { db } from "@workspace/db";
import { compIntelArticlesTable, compIntelRefreshLogsTable } from "@workspace/db";
import { eq, desc, sql, and, gte, like } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export const COMP_INTEL_FEEDS = [
  // Original 4 (confirmed working)
  { competitor: "Hostinger",    blogName: "Hostinger Blog",      url: "https://hostinger.com/blog/feed" },
  { competitor: "Kinsta",       blogName: "Kinsta Blog",         url: "https://kinsta.com/blog/feed" },
  { competitor: "WP Engine",    blogName: "WP Engine Blog",      url: "https://wpengine.com/feed/" },
  { competitor: "Bluehost",     blogName: "Bluehost Blog",       url: "https://www.bluehost.com/blog/feed" },
  // Shared/cPanel Hosting
  { competitor: "GreenGeeks",   blogName: "GreenGeeks Blog",     url: "https://www.greengeeks.com/blog/feed/" },
  { competitor: "HostArmada",   blogName: "HostArmada Blog",     url: "https://hostarmada.com/blog/feed/" },
  { competitor: "Ultahost",     blogName: "Ultahost Blog",       url: "https://ultahost.com/blog/feed/" },
  // Enterprise / Managed WP
  { competitor: "WPX Hosting",  blogName: "WPX Blog",            url: "https://wpx.net/blog/feed/" },
  { competitor: "Pressable",    blogName: "Pressable Blog",      url: "https://pressable.com/blog/feed/" },
  { competitor: "WPMU DEV",     blogName: "WPMU DEV Blog",       url: "https://wpmudev.com/blog/feed/" },
  // WP Infrastructure / DevOps
  { competitor: "Rocket.net",   blogName: "Rocket.net Blog",     url: "https://rocket.net/blog/feed/" },
  { competitor: "RunCloud",     blogName: "RunCloud Blog",       url: "https://runcloud.io/blog/feed" },
  { competitor: "DreamHost",    blogName: "DreamHost Blog",      url: "https://www.dreamhost.com/blog/feed/" },
  { competitor: "GridPane",     blogName: "GridPane Blog",       url: "https://gridpane.com/blog/feed/" },
  { competitor: "ServerAvatar", blogName: "ServerAvatar Blog",   url: "https://serveravatar.com/blog/feed" },
] as const;
// No public RSS found: SiteGround (403), GoDaddy (403), HostGator (403), InMotion (403),
// Vultr (403), Linode (404), IONOS (404), Ploi (404), DigitalOcean (404),
// Kamatera (domain NXDOMAIN), Verpex (404), Hostwinds (404), A2 Hosting (HTML only),
// Nexcess (HTML only), Pantheon (HTML only), Convesio (404), Flywheel (acquired → WP Engine),
// LiquidWeb/Pagely/xCloud (RSS exists but empty — 0 articles, < 1.5 KB).

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

function extractText(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata) return stripHtml(cdata[1]).trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (plain) return stripHtml(plain[1]).trim();
  return "";
}

function parseDate(str: string | undefined): Date {
  if (!str) return new Date();
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const m of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)) {
    const item = m[1];
    const title = extractText(item, "title");
    const description = extractText(item, "description") || extractText(item, "summary");
    const pubDate = extractText(item, "pubDate") || extractText(item, "published");
    const linkMatch = item.match(/<link>([^<]+)<\/link>/i);
    const linkHref = item.match(/<link[^>]+href="([^"]+)"/i);
    const link = (linkMatch?.[1] || linkHref?.[1] || "").trim();
    if (title && link) items.push({ title, link, pubDate, description });
  }
  for (const m of xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi)) {
    const entry = m[1];
    const title = extractText(entry, "title");
    const description = extractText(entry, "content") || extractText(entry, "summary") || extractText(entry, "description");
    const pubDate = extractText(entry, "published") || extractText(entry, "updated");
    const linkHref = entry.match(/<link[^>]+href="([^"]+)"/i);
    const linkMatch = entry.match(/<link>([^<]+)<\/link>/i);
    const link = (linkHref?.[1] || linkMatch?.[1] || "").trim();
    if (title && link) items.push({ title, link, pubDate, description });
  }
  return items;
}

async function fetchFeed(feed: typeof COMP_INTEL_FEEDS[number]): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "MediaIntel/1.0 RSS Reader", Accept: "application/rss+xml, application/xml, text/xml" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn({ feed: feed.url, status: res.status }, "CompIntel feed non-OK");
      return [];
    }
    return parseItems(await res.text());
  } catch (err) {
    clearTimeout(timeout);
    logger.warn({ feed: feed.url, err }, "CompIntel feed fetch failed");
    return [];
  }
}

export async function refreshCompIntel(): Promise<{ fetched: number }> {
  const [log] = await db
    .insert(compIntelRefreshLogsTable)
    .values({ status: "running" })
    .returning();

  const logId = log.id;

  // Clean up existing WordPress RSS footer from any already-saved snippets
  const dirty = await db
    .select({ id: compIntelArticlesTable.id, snippet: compIntelArticlesTable.snippet })
    .from(compIntelArticlesTable)
    .where(like(compIntelArticlesTable.snippet, "%appeared first on%"));
  for (const row of dirty) {
    const clean = row.snippet.replace(/The post .+ appeared first on .+\.\s*$/, "").trim();
    if (clean !== row.snippet) {
      await db.update(compIntelArticlesTable).set({ snippet: clean }).where(eq(compIntelArticlesTable.id, row.id));
    }
  }

  // Use 180-day window for competitor blogs — they publish less frequently than news sites
  const maxAge = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  let fetched = 0;

  try {
    const results = await Promise.allSettled(COMP_INTEL_FEEDS.map(fetchFeed));

    for (let i = 0; i < COMP_INTEL_FEEDS.length; i++) {
      const feed = COMP_INTEL_FEEDS[i];
      const result = results[i];
      if (result.status !== "fulfilled") continue;

      for (const item of result.value) {
        const pubDate = parseDate(item.pubDate);
        if (pubDate < maxAge) continue;

        // Strip common WordPress RSS footer ("The post X appeared first on Blog Name.")
        const cleanDesc = item.description.replace(/The post .+ appeared first on .+\.\s*$/, "").trim();
        const snippet = cleanDesc.slice(0, 400) + (cleanDesc.length > 400 ? "..." : "");

        await db
          .insert(compIntelArticlesTable)
          .values({
            competitor: feed.competitor,
            blogName: feed.blogName,
            blogUrl: feed.url,
            title: item.title.slice(0, 500),
            url: item.link,
            publishedAt: pubDate,
            snippet: snippet || item.title,
          })
          .onConflictDoNothing();

        fetched++;
      }
    }

    await db
      .update(compIntelRefreshLogsTable)
      .set({ status: "completed", completedAt: new Date(), fetched, message: `Saved ${fetched} articles` })
      .where(eq(compIntelRefreshLogsTable.id, logId));

    logger.info({ fetched }, "CompIntel refresh complete");
    return { fetched };
  } catch (err) {
    await db
      .update(compIntelRefreshLogsTable)
      .set({ status: "failed", completedAt: new Date(), message: String(err) })
      .where(eq(compIntelRefreshLogsTable.id, logId));
    logger.error({ err }, "CompIntel refresh failed");
    throw err;
  }
}

export async function getCompIntelArticles(opts: {
  competitor?: string;
  timeRange?: "7d" | "30d" | "90d";
  limit?: number;
  offset?: number;
}) {
  const { competitor, timeRange, limit = 50, offset = 0 } = opts;

  const dayMap = { "7d": 7, "30d": 30, "90d": 90 };
  const days = timeRange ? dayMap[timeRange] : null;

  const conditions = [];
  if (competitor) conditions.push(eq(compIntelArticlesTable.competitor, competitor));
  if (days) conditions.push(gte(compIntelArticlesTable.publishedAt, new Date(Date.now() - days * 86400000)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [articles, [{ count }]] = await Promise.all([
    db
      .select()
      .from(compIntelArticlesTable)
      .where(where)
      .orderBy(desc(compIntelArticlesTable.publishedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(compIntelArticlesTable)
      .where(where),
  ]);

  return { articles, total: count };
}

export async function getCompIntelRefreshLogs(limit = 5) {
  const logs = await db
    .select()
    .from(compIntelRefreshLogsTable)
    .orderBy(desc(compIntelRefreshLogsTable.startedAt))
    .limit(Math.min(limit, 20));
  return { logs };
}

export async function getCompIntelStats() {
  const byCompetitor = await db
    .select({ competitor: compIntelArticlesTable.competitor, count: sql<number>`count(*)::int` })
    .from(compIntelArticlesTable)
    .groupBy(compIntelArticlesTable.competitor)
    .orderBy(desc(sql`count(*)`));

  const [lastLog] = await db
    .select()
    .from(compIntelRefreshLogsTable)
    .where(eq(compIntelRefreshLogsTable.status, "completed"))
    .orderBy(desc(compIntelRefreshLogsTable.completedAt))
    .limit(1);

  return { byCompetitor, lastRefreshedAt: lastLog?.completedAt ?? null, feeds: COMP_INTEL_FEEDS.length };
}
