import { logger } from "../lib/logger.js";
import { ALL_TRACKED, COMPETITOR_SEARCH_TERMS } from "./competitors.js";
import type { RawArticle } from "./rss-fetcher.js";

// GlobeNewsWire offers free keyword-based RSS feeds — no API key required.
// Each brand gets its own feed: globenewswire.com/RssFeed/keyword/<slug>
// These cover press releases that other sources (RSS, NewsAPI) miss, including
// content that Business Wire and PR Newswire syndicate to GlobeNewsWire.

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function brandToSlug(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchGnwForBrand(brand: string): Promise<RawArticle[]> {
  const slug = brandToSlug(brand);
  const url = `https://www.globenewswire.com/RssFeed/keyword/${slug}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MediaIntel/1.0 RSS Reader",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const xml = await response.text();
    const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    const articles: RawArticle[] = [];
    const terms = COMPETITOR_SEARCH_TERMS[brand] ?? [brand.toLowerCase()];

    for (const match of itemMatches) {
      const item = match[1];
      const title = extractText(item, "title");
      const description = extractText(item, "description") || extractText(item, "summary");
      const pubDate = extractText(item, "pubDate") || extractText(item, "published");

      const linkMatch = item.match(/<link>([^<]+)<\/link>/i);
      const linkHref = item.match(/<link[^>]+href="([^"]+)"/i);
      const link = linkMatch?.[1]?.trim() || linkHref?.[1] || "";

      if (!title || !link) continue;

      // Confirm the brand is actually mentioned in the article
      const fullText = `${title} ${description}`.toLowerCase();
      const mentioned = terms.some((t) => fullText.includes(t.toLowerCase()));
      if (!mentioned) continue;

      const snippet = description.slice(0, 400) + (description.length > 400 ? "..." : "");

      articles.push({
        title: title.slice(0, 500),
        url: link,
        publisher: "GlobeNewsWire",
        publisherType: "press_release",
        publishedAt: parseDate(pubDate),
        snippet: snippet || title,
        competitors: [brand],
      });
    }

    return articles;
  } catch {
    return [];
  }
}

export async function fetchGlobeNewsWireMentions(): Promise<RawArticle[]> {
  logger.info("Fetching GlobeNewsWire press releases for all tracked brands");

  const results = await Promise.allSettled(
    ALL_TRACKED.map((brand) => fetchGnwForBrand(brand))
  );

  const articles: RawArticle[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }

  // Deduplicate by url + competitor
  const seen = new Set<string>();
  const deduped = articles.filter((a) => {
    const key = `${a.url}:${a.competitors[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  logger.info({ count: deduped.length }, "GlobeNewsWire articles fetched");
  return deduped;
}
