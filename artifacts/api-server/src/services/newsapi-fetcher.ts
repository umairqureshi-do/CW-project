import { logger } from "../lib/logger.js";
import { ALL_TRACKED, COMPETITOR_SEARCH_TERMS, isHostingRelated } from "./competitors.js";
import type { RawArticle } from "./rss-fetcher.js";

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
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function stripHtml(html: string): string {
  const decoded = decodeHtmlEntities(html);
  return decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NEWS_API_BASE = "https://newsapi.org/v2/everything";

interface NewsApiArticle {
  title: string;
  url: string;
  source: { name: string };
  publishedAt: string;
  description: string | null;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
  message?: string;
}

function classifyPublisher(sourceName: string): string {
  const lower = sourceName.toLowerCase();
  if (
    lower.includes("techcrunch") ||
    lower.includes("wired") ||
    lower.includes("verge") ||
    lower.includes("ars technica") ||
    lower.includes("zdnet") ||
    lower.includes("mashable") ||
    lower.includes("next web") ||
    lower.includes("venturebeat") ||
    lower.includes("computerworld") ||
    lower.includes("infoworld") ||
    lower.includes("cnet")
  ) {
    return "tech_media";
  }
  if (
    lower.includes("wp") ||
    lower.includes("wordpress") ||
    lower.includes("plugin") ||
    lower.includes("saas") ||
    lower.includes("hosting")
  ) {
    return "saas_blog";
  }
  if (
    lower.includes("review") ||
    lower.includes("pcmag") ||
    lower.includes("g2") ||
    lower.includes("capterra")
  ) {
    return "review_site";
  }
  if (
    lower.includes("journal") ||
    lower.includes("magazine") ||
    lower.includes("news") ||
    lower.includes("post") ||
    lower.includes("times")
  ) {
    return "industry_news";
  }
  return "general";
}

async function fetchNewsApiForCompetitor(
  competitor: string,
  searchTerms: string[],
  fromDate: string,
  apiKey: string
): Promise<RawArticle[]> {
  const query = searchTerms.map((t) => `"${t}"`).join(" OR ");

  const url = new URL(NEWS_API_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("from", fromDate);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("language", "en");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("apiKey", apiKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "MediaIntel/1.0" },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(
        { competitor, status: response.status },
        "NewsAPI returned non-OK"
      );
      return [];
    }

    const data = (await response.json()) as NewsApiResponse;

    if (data.status !== "ok") {
      logger.warn(
        { competitor, message: data.message },
        "NewsAPI error response"
      );
      return [];
    }

    const articles: RawArticle[] = [];

    for (const article of data.articles) {
      if (!article.title || !article.url) continue;
      if (article.title === "[Removed]") continue;

      const rawSnippet =
        article.description ||
        (article.content ? article.content.slice(0, 400) : article.title);

      const snippet = stripHtml(rawSnippet).slice(0, 400) +
        (rawSnippet.length > 400 ? "..." : "");

      // Layer 1: fast keyword pre-filter.
      // If the competitor name appears in the title, always collect the article —
      // it is directly about that brand. Only apply the hosting keyword filter
      // when the brand appears only in the body/snippet.
      const fullText = `${article.title} ${rawSnippet}`;
      const titleLower = article.title.toLowerCase();
      const terms = COMPETITOR_SEARCH_TERMS[competitor] ?? [competitor.toLowerCase()];
      const competitorInTitle = terms.some((t) => titleLower.includes(t.toLowerCase()));
      if (!competitorInTitle && !isHostingRelated(fullText)) continue;

      articles.push({
        title: article.title.slice(0, 500),
        url: article.url,
        publisher: article.source.name || "Unknown",
        publisherType: classifyPublisher(article.source.name || ""),
        publishedAt: new Date(article.publishedAt),
        snippet,
        competitors: [competitor],
      });
    }

    return articles;
  } catch (err) {
    logger.warn({ competitor, err }, "NewsAPI fetch failed");
    return [];
  }
}

export async function fetchNewsApiMentions(): Promise<RawArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    logger.warn("NEWS_API_KEY not set — skipping NewsAPI fetch");
    return [];
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromStr = fromDate.toISOString().split("T")[0];

  const allArticles: RawArticle[] = [];

  for (const competitor of ALL_TRACKED) {
    const terms = COMPETITOR_SEARCH_TERMS[competitor] ?? [competitor.toLowerCase()];
    const articles = await fetchNewsApiForCompetitor(competitor, terms, fromStr, apiKey);
    allArticles.push(...articles);

    await new Promise((r) => setTimeout(r, 300));
  }

  const seen = new Set<string>();
  return allArticles.filter((a) => {
    const key = `${a.url}:${a.competitors[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
