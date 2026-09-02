import { logger } from "../lib/logger.js";
import { detectCompetitors, RSS_FEEDS, COMPETITOR_SEARCH_TERMS, isHostingRelated } from "./competitors.js";

export interface RawArticle {
  title: string;
  url: string;
  publisher: string;
  publisherType: string;
  publishedAt: Date;
  snippet: string;
  competitors: string[];
}

function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&hellip;/g, "…")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&copy;/g, "©")
    .replace(/&reg;/g, "®")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function stripHtml(html: string): string {
  // Decode entities first (turns &lt;b&gt; → <b>), then strip all tags
  const decoded = decodeHtmlEntities(html);
  return decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Google Alerts wraps real URLs inside https://www.google.com/url?...&url=<actual>
// The href attribute in Atom XML also uses &amp; for & — decode before parsing.
function unwrapGoogleUrl(rawUrl: string): string {
  const url = rawUrl.replace(/&amp;/g, "&");
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("google.com") && parsed.searchParams.has("url")) {
      return parsed.searchParams.get("url") ?? url;
    }
  } catch { /* ignore non-URL strings */ }
  return url;
}

function extractText(xml: string, tag: string): string {
  const cdataMatch = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i")
  );
  if (cdataMatch) return stripHtml(cdataMatch[1]).trim();

  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  if (match) return stripHtml(match[1]).trim();

  return "";
}

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  pubDate: string;
  description: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    pubDate: string;
    description: string;
  }> = [];

  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const item = match[1];
    const title = extractText(item, "title");
    const description =
      extractText(item, "description") || extractText(item, "summary");
    const pubDate =
      extractText(item, "pubDate") || extractText(item, "published");

    const linkMatch = item.match(/<link>([^<]+)<\/link>/i);
    const linkHref = item.match(/<link[^>]+href="([^"]+)"/i);
    const link = unwrapGoogleUrl(linkMatch?.[1]?.trim() || linkHref?.[1] || "");

    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }

  const entryMatches = xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);
  for (const match of entryMatches) {
    const entry = match[1];
    const title = extractText(entry, "title");
    const description =
      extractText(entry, "content") ||
      extractText(entry, "summary") ||
      extractText(entry, "description");
    const pubDate =
      extractText(entry, "published") || extractText(entry, "updated");
    const linkHref = entry.match(/<link[^>]+href="([^"]+)"/i);
    const linkMatch = entry.match(/<link>([^<]+)<\/link>/i);
    const link = unwrapGoogleUrl(linkHref?.[1] || linkMatch?.[1]?.trim() || "");

    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

// Domains that produce noise via Google Alerts (package registries, code forges,
// release bots) — not editorial content about the hosting industry.
const BLOCKED_DOMAINS = new Set([
  "pypi.org",
  "github.com",
  "github.io",
  "npmjs.com",
  "rubygems.org",
  "packagist.org",
  "hub.docker.com",
  "crates.io",
  "pkg.go.dev",
]);

function isBlockedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const base = hostname.replace(/^www\./, "");
    return BLOCKED_DOMAINS.has(base);
  } catch {
    return false;
  }
}

async function fetchFeed(
  feed: (typeof RSS_FEEDS)[number]
): Promise<RawArticle[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MediaIntel/1.0 RSS Reader",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn({ feed: feed.url, status: response.status }, "Feed returned non-OK");
      return [];
    }

    const xml = await response.text();
    const items = parseRssItems(xml);
    const articles: RawArticle[] = [];

    // Only ingest articles published within the last 45 days to keep the feed fresh
    const maxAgeMs = 45 * 24 * 60 * 60 * 1000;
    const oldestAllowed = new Date(Date.now() - maxAgeMs);

    for (const item of items) {
      const pubDate = parseDate(item.pubDate);
      if (pubDate < oldestAllowed) continue;

      const fullText = `${item.title} ${item.description}`;
      const titleText = item.title.toLowerCase();
      const competitors = detectCompetitors(fullText);

      if (competitors.length === 0) continue;

      // Skip package registries, code forges, and other non-editorial sources
      if (isBlockedDomain(item.link)) continue;

      // Tighten relevance: competitor must appear in title OR appear ≥2 times in full text
      const relevantCompetitors = competitors.filter((c) => {
        const terms = COMPETITOR_SEARCH_TERMS[c] ?? [];
        const inTitle = terms.some((t) => titleText.includes(t.toLowerCase()));
        if (inTitle) return true;
        const lowerFull = fullText.toLowerCase();
        const occurrences = terms.reduce(
          (acc, t) => acc + (lowerFull.split(t.toLowerCase()).length - 1),
          0
        );
        return occurrences >= 2;
      });

      if (relevantCompetitors.length === 0) continue;

      // Layer 1: fast keyword pre-filter.
      // If ANY relevant competitor name appears in the title, always collect it —
      // the article is directly about that brand. Only apply the hosting keyword
      // filter when the brand is mentioned solely in the body text.
      const anyCompetitorInTitle = relevantCompetitors.some((c) => {
        const terms = COMPETITOR_SEARCH_TERMS[c] ?? [];
        return terms.some((t) => titleText.includes(t.toLowerCase()));
      });
      if (!anyCompetitorInTitle && !isHostingRelated(fullText)) continue;

      const snippet =
        item.description.slice(0, 300) + (item.description.length > 300 ? "..." : "");

      for (const competitor of relevantCompetitors) {
        articles.push({
          title: item.title.slice(0, 500),
          url: item.link,
          publisher: feed.publisher,
          publisherType: feed.publisherType,
          publishedAt: parseDate(item.pubDate),
          snippet: snippet || item.title,
          competitors: [competitor],
        });
      }
    }

    return articles;
  } catch (err) {
    logger.warn({ feed: feed.url, err }, "Failed to fetch feed");
    return [];
  }
}

export async function fetchAllFeeds(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
  const articles: RawArticle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }

  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = `${a.url}:${a.competitors[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
