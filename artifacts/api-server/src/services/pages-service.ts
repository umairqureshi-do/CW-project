import { db } from "@workspace/db";
import { competitorPagesTable, competitorPagesRefreshLogsTable } from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export const COMPETITOR_SITEMAPS = [
  { competitor: "Hostinger",  sitemapIndex: "https://www.hostinger.com/sitemap_index.xml" },
  { competitor: "SiteGround", sitemapIndex: "https://www.siteground.com/sitemap_index.xml" },
  { competitor: "Kinsta",     sitemapIndex: "https://kinsta.com/sitemap_index.xml" },
  { competitor: "WP Engine",  sitemapIndex: "https://wpengine.com/sitemap_index.xml" },
  { competitor: "Bluehost",   sitemapIndex: "https://www.bluehost.com/sitemap_index.xml" },
] as const;

// Locale codes used as first URL path segment (e.g. hostinger.com/ae/...)
const LOCALE_SEGMENT_RE = /^[a-z]{2}(-[a-z]{2,4})?$/;

/** Infer page type from URL path, handling locale prefixes */
function classifyPageType(url: string): { pageType: string; section: string } {
  try {
    const parsed = new URL(url);
    const rawPath = parsed.pathname.toLowerCase();
    const segments = rawPath.split("/").filter(Boolean);

    // Strip leading locale prefix (e.g. /ae/, /lt/, /de/) to get effective path
    let localePrefix: string | null = null;
    let effectiveSegments = segments;
    if (segments.length > 0 && LOCALE_SEGMENT_RE.test(segments[0])) {
      localePrefix = segments[0];
      effectiveSegments = segments.slice(1);
    }
    const p = "/" + effectiveSegments.join("/");

    // 1. Comparison pages — highest competitive intelligence value
    if (/-vs-|-vs\/|\/vs-|\/vs\/|\/compare[-/]|\/alternatives[-/]|\/alternative-to-|-comparison[-/]|vs\.html/.test(p))
      return { pageType: "comparison", section: "Comparisons" };

    // 2. Migration pages
    if (/\/migrat|\/switch-from|\/switching-from|\/moving-from|\/transfer-hosting|\/move-to-|\/migrate-to/.test(p))
      return { pageType: "migration", section: "Migration" };

    // 3. Blog / editorial content
    if (/\/(blog|articles?|news|resources?|guides?|tutorials?|learn\/|knowledgebase|how-to[-/]|academy\/)/.test(p))
      return { pageType: "blog", section: "Blog" };

    // 4. Pricing
    if (/\/(pricing|plans?)([/-]|$)/.test(p) || /\/pricing\//.test(p))
      return { pageType: "pricing", section: "Pricing" };

    // 5. Coupon / deals
    if (/\/(coupon|promo-code|discount|black-friday|cyber-monday|special-offer|voucher|deals\/)/.test(p))
      return { pageType: "coupon", section: "Deals & Coupons" };

    // 6. Hosting product pages
    if (/\/(wordpress-hosting|managed-wordpress|woocommerce-hosting|vps-hosting|vps-server|shared-hosting|cloud-hosting|dedicated-hosting|dedicated-server|web-hosting|reseller-hosting|ecommerce-hosting|email-hosting|cpanel-hosting|business-hosting|starter-hosting|premium-hosting|cloud-vps|application-hosting|managed-hosting|litespeed-hosting|php-hosting|mysql-hosting|nodejs-hosting|horizons|bundles\/)/.test(p))
      return { pageType: "product", section: "Products" };

    // 7. Website / app template galleries
    if (/\/templates\/|\/template\//.test(p))
      return { pageType: "template", section: "Website Templates" };

    // 8. One-click application / marketplace pages
    if (/\/applications\/|\/app-marketplace|\/one-click-app/.test(p))
      return { pageType: "application", section: "Applications" };

    // 8. Agency directory
    if (/\/agency-director/.test(p))
      return { pageType: "agency", section: "Agency Directory" };

    // 9. Affiliate / referral
    if (/\/(affiliates?|affiliate-program|affiliate-academy|refer-a-friend|referral[-/]|partner-program)/.test(p))
      return { pageType: "affiliate", section: "Affiliate" };

    // 10. Features / add-ons
    if (/\/(features?|capabilities|tools?|platform|add-ons|addons)\//.test(p))
      return { pageType: "feature", section: "Features" };

    // 11. Solutions / use cases
    if (/\/(solutions?|use-cases?|industries?|verticals?)\//.test(p))
      return { pageType: "solution", section: "Solutions" };

    // 12. Case studies / customers
    if (/\/(case-stud|customers?|success-stor|testimonials?)\//.test(p))
      return { pageType: "case_study", section: "Case Studies" };

    // 13. Landing / campaign pages
    if (/\/(landing|lp|campaign|promo)\//.test(p))
      return { pageType: "landing", section: "Landing Pages" };

    // 14. Changelog / release notes
    if (/\/(changelog|releases?|updates?|whats-new)/.test(p))
      return { pageType: "changelog", section: "Changelog" };

    // 15. Documentation / help
    if (/\/(docs?|documentation|knowledge-?base|help|support|faq)\//.test(p))
      return { pageType: "docs", section: "Documentation" };

    // 16. Legal / policy pages
    if (/\/(privacy-policy|terms-of-service|terms-of-use|terms-and-conditions|cookie-policy|legal\/|gdpr|acceptable-use|disclaimer|tos\/)/.test(p))
      return { pageType: "legal", section: "Legal" };

    // 17. Partners / integrations
    if (/\/(partners?|integrations?|marketplace|ecosystem)\//.test(p))
      return { pageType: "partner", section: "Partners" };

    // 18. Company / about
    if (/\/(about|company|team|careers?|jobs?|press|media)/.test(p))
      return { pageType: "company", section: "Company" };

    // 19. Main / root pages (1 level deep)
    if (effectiveSegments.length <= 1)
      return { pageType: "main", section: "Main Pages" };

    // 20. Locale-specific catch-all (has locale prefix but didn't match any specific type)
    if (localePrefix)
      return { pageType: "localized", section: `Localized (${localePrefix.toUpperCase()})` };

    return { pageType: "page", section: "Other Pages" };
  } catch {
    return { pageType: "page", section: "Other Pages" };
  }
}

/** Returns true when a fetched body is a bot-protection challenge rather than real XML */
function isBotProtected(body: string, status: number): boolean {
  if (status === 403) return true;
  return (
    body.includes("sgcaptcha") ||
    body.includes("/.well-known/captcha") ||
    body.includes("cf-captcha") ||
    (body.length < 800 && /captcha|challenge|bot.?protection/i.test(body))
  );
}

class BotBlockedError extends Error {}

async function fetchText(url: string, timeout = 20000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MediaIntel/1.0 (+https://cloudwaysmediaintel.replit.app)",
        "Accept": "application/xml, text/xml, */*",
      },
    });
    clearTimeout(timer);
    if (!res.ok && res.status !== 202) {
      if (res.status === 403) throw new BotBlockedError(`HTTP 403 at ${url}`);
      logger.warn({ url, status: res.status }, "Pages: fetch non-OK");
      return null;
    }
    const text = await res.text();
    if (isBotProtected(text, res.status)) {
      throw new BotBlockedError(`Bot protection at ${url}`);
    }
    return text;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof BotBlockedError) throw err;
    logger.warn({ url, err }, "Pages: fetch failed");
    return null;
  }
}

/** Parse a sitemap index XML and return child sitemap URLs */
function parseSitemapIndex(xml: string): string[] {
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const loc = m[1].trim();
    if (loc && loc.endsWith(".xml")) urls.push(loc);
  }
  return urls;
}

interface SitemapEntry {
  url: string;
  lastmod?: string;
}

/** Parse a sitemap XML and return URL entries */
function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const block = m[1];
    const locMatch = block.match(/<loc>\s*([^<]+)\s*<\/loc>/i);
    const lastmodMatch = block.match(/<lastmod>\s*([^<]+)\s*<\/lastmod>/i);
    if (locMatch?.[1]) {
      entries.push({ url: locMatch[1].trim(), lastmod: lastmodMatch?.[1]?.trim() });
    }
  }
  return entries;
}

/** Extract a title hint from a URL path (slug → readable title) */
function titleFromUrl(url: string): string {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || segments[segments.length - 2] || "";
    return last.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 200);
  } catch {
    return "";
  }
}

export async function refreshCompetitorPages(): Promise<{ fetched: number }> {
  const [log] = await db
    .insert(competitorPagesRefreshLogsTable)
    .values({ status: "running" })
    .returning();

  let fetched = 0;
  const blockedCompetitors: string[] = [];

  try {
    for (const { competitor, sitemapIndex } of COMPETITOR_SITEMAPS) {
      try {
        const indexXml = await fetchText(sitemapIndex);
        if (!indexXml) continue;

        const childUrls = parseSitemapIndex(indexXml);
        logger.info({ competitor, childSitemaps: childUrls.length }, "Pages: fetching child sitemaps");

        // Fetch all child sitemaps in parallel (max 20 concurrently)
        const CONCURRENCY = 20;
        for (let i = 0; i < childUrls.length; i += CONCURRENCY) {
          const batch = childUrls.slice(i, i + CONCURRENCY);
          const results = await Promise.allSettled(batch.map((u) => fetchText(u)));

          for (const result of results) {
            if (result.status !== "fulfilled" || !result.value) continue;
            const entries = parseSitemap(result.value);

            for (const entry of entries) {
              const { pageType, section } = classifyPageType(entry.url);
              const title = titleFromUrl(entry.url);
              const lastmod = entry.lastmod ? new Date(entry.lastmod) : undefined;

              await db
                .insert(competitorPagesTable)
                .values({
                  competitor,
                  url: entry.url,
                  title,
                  pageType,
                  section,
                  lastmod: lastmod && !isNaN(lastmod.getTime()) ? lastmod : undefined,
                })
                .onConflictDoUpdate({
                  target: competitorPagesTable.url,
                  set: {
                    lastSeenAt: new Date(),
                    ...(lastmod && !isNaN(lastmod.getTime()) ? { lastmod } : {}),
                  },
                });

              fetched++;
            }
          }
        }
      } catch (err) {
        if (err instanceof BotBlockedError) {
          logger.warn({ competitor }, "Pages: sitemap bot-protected, skipping");
          blockedCompetitors.push(competitor);
        } else {
          logger.warn({ competitor, err }, "Pages: competitor sitemap error");
        }
      }
    }

    await db
      .update(competitorPagesRefreshLogsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        fetched: String(fetched),
        message: `Indexed ${fetched} pages${blockedCompetitors.length ? ` | blocked:${JSON.stringify(blockedCompetitors)}` : ""}`,
      })
      .where(eq(competitorPagesRefreshLogsTable.id, log.id));

    logger.info({ fetched, blocked: blockedCompetitors }, "CompetitorPages refresh complete");
    return { fetched };
  } catch (err) {
    await db
      .update(competitorPagesRefreshLogsTable)
      .set({ status: "failed", completedAt: new Date(), message: String(err) })
      .where(eq(competitorPagesRefreshLogsTable.id, log.id));
    logger.error({ err }, "CompetitorPages refresh failed");
    throw err;
  }
}

export async function getCompetitorPages(opts: {
  competitor?: string;
  pageType?: string;
  section?: string;
  locale?: string;
  days?: number;
  newOnly?: boolean;
  recentlyChanged?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const { competitor, pageType, section, locale, days, newOnly, recentlyChanged, q, limit = 50, offset = 0 } = opts;

  // Fetch the most recent completed sync's startedAt for isNew computation
  const [lastSyncLog] = await db
    .select({ startedAt: competitorPagesRefreshLogsTable.startedAt })
    .from(competitorPagesRefreshLogsTable)
    .where(eq(competitorPagesRefreshLogsTable.status, "completed"))
    .orderBy(desc(competitorPagesRefreshLogsTable.completedAt))
    .limit(1);

  const lastSyncStartedAt = lastSyncLog?.startedAt ?? null;

  const conditions = [];
  if (competitor) conditions.push(eq(competitorPagesTable.competitor, competitor));
  if (pageType) conditions.push(eq(competitorPagesTable.pageType, pageType));
  if (section) conditions.push(eq(competitorPagesTable.section, section));
  if (locale) {
    // Match URLs where the first path segment equals the locale code
    conditions.push(sql`${competitorPagesTable.url} ~* ${`://[^/]+/${locale}(/|$)`}`);
  }
  if (days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    conditions.push(gte(competitorPagesTable.lastSeenAt, since));
  }
  if (newOnly && lastSyncStartedAt) {
    conditions.push(gte(competitorPagesTable.firstSeenAt, lastSyncStartedAt));
  }
  if (recentlyChanged) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    conditions.push(gte(competitorPagesTable.lastmod, sevenDaysAgo));
  }
  if (q) {
    conditions.push(sql`(${competitorPagesTable.url} ILIKE ${"%" + q + "%"} OR ${competitorPagesTable.title} ILIKE ${"%" + q + "%"})`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [pages, [{ count }]] = await Promise.all([
    db
      .select()
      .from(competitorPagesTable)
      .where(where)
      .orderBy(desc(competitorPagesTable.lastmod), desc(competitorPagesTable.firstSeenAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(competitorPagesTable)
      .where(where),
  ]);

  const pagesWithIsNew = pages.map((p) => ({
    ...p,
    isNew: lastSyncStartedAt ? p.firstSeenAt >= lastSyncStartedAt : false,
  }));

  return { pages: pagesWithIsNew, total: count };
}

export async function getCompetitorPagesStats() {
  const [byCompetitor, byPageType, localeStats, [lastLog]] = await Promise.all([
    db
      .select({ competitor: competitorPagesTable.competitor, count: sql<number>`count(*)::int` })
      .from(competitorPagesTable)
      .groupBy(competitorPagesTable.competitor)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ pageType: competitorPagesTable.pageType, count: sql<number>`count(*)::int` })
      .from(competitorPagesTable)
      .groupBy(competitorPagesTable.pageType)
      .orderBy(desc(sql`count(*)`)),
    // Extract locale code (first path segment) from localized pages
    db.execute(sql`
      SELECT
        regexp_replace(url, '^https?://[^/]+/([a-z]{2,3}(-[a-z]{2,4})?)(/.*)?$', '\\1') AS locale,
        count(*)::int AS count
      FROM competitor_pages
      WHERE page_type = 'localized'
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 60
    `),
    db
      .select()
      .from(competitorPagesRefreshLogsTable)
      .where(eq(competitorPagesRefreshLogsTable.status, "completed"))
      .orderBy(desc(competitorPagesRefreshLogsTable.completedAt))
      .limit(1),
  ]);

  // Parse blocked competitors from the latest refresh log message
  let blockedCompetitors: string[] = [];
  if (lastLog?.message) {
    const match = lastLog.message.match(/blocked:(\[.*?\])/);
    if (match) {
      try { blockedCompetitors = JSON.parse(match[1]); } catch {}
    }
  }

  // Count pages first seen during the most recent sync run
  let newCount: number | null = null;
  if (lastLog?.startedAt) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(competitorPagesTable)
      .where(gte(competitorPagesTable.firstSeenAt, lastLog.startedAt));
    newCount = count;
  }

  return {
    byCompetitor,
    byPageType,
    localeStats: (localeStats.rows as { locale: string; count: number }[]),
    blockedCompetitors,
    lastRefreshedAt: lastLog?.completedAt ?? null,
    competitors: COMPETITOR_SITEMAPS.length,
    newCount,
  };
}

export async function getCompetitorPagesRefreshLogs(limit = 5) {
  const logs = await db
    .select()
    .from(competitorPagesRefreshLogsTable)
    .orderBy(desc(competitorPagesRefreshLogsTable.startedAt))
    .limit(Math.min(limit, 20));
  return { logs };
}
