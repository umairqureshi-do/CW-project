import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "../lib/logger.js";
import type { RawArticle } from "./rss-fetcher.js";

export interface AnalyzedMention {
  mentionType: string;
  sentiment: string;
  opportunityInsight: string;
  opportunityAngle: string;
  outreachTarget: string;
  isHostingRelated: boolean;
}

const MENTION_TYPES = [
  "review",
  "comparison",
  "ranking",
  "news",
  "customer_story",
  "sponsored",
  "other",
];
const SENTIMENTS = ["positive", "neutral", "negative"];
const OUTREACH_TARGETS = ["blog", "journalist", "affiliate_site", "review_site", "other"];

function parseJsonSafe<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export async function analyzeMention(article: RawArticle): Promise<AnalyzedMention> {
  const competitor = article.competitors[0];
  const isOwnBrand = competitor === "Cloudways";

  const prompt = isOwnBrand
    ? `You are a PR and brand analyst for Cloudways, a managed WordPress hosting platform.

Analyze this media mention OF Cloudways itself (our own brand) and assess brand health.

Article title: "${article.title}"
Publisher: "${article.publisher}"
Content snippet: "${article.snippet}"

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "isHostingRelated": <true if this article is genuinely about web hosting, cloud hosting, WordPress hosting, or web infrastructure — false if it is about something unrelated like finance, gaming, sports, general tech news with only a passing brand mention>,
  "mentionType": <one of: ${MENTION_TYPES.join(", ")}>,
  "sentiment": <one of: ${SENTIMENTS.join(", ")}>,
  "opportunityInsight": "<1-2 sentences: what does this coverage mean for Cloudways brand health? Is there a positive narrative to amplify or a negative one to address?>",
  "opportunityAngle": "<specific action Cloudways should take: amplify, respond, pitch follow-up, etc.>",
  "outreachTarget": <one of: ${OUTREACH_TARGETS.join(", ")}>
}

For opportunityInsight: focus on brand reputation impact. Example: "This positive review from a tech publication gives Cloudways third-party credibility for its performance claims — ideal for amplification in social media."
For opportunityAngle: suggest a concrete next step, e.g. "Share this review with the affiliate network" or "Respond with updated benchmark data"`
    : `You are a PR and competitive intelligence analyst for Cloudways, a managed WordPress hosting platform focused on premium performance.

Analyze this media mention of ${competitor} and generate competitive intelligence.

Article title: "${article.title}"
Publisher: "${article.publisher}"
Content snippet: "${article.snippet}"

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "isHostingRelated": <true if this article is genuinely about web hosting, cloud hosting, WordPress hosting, managed servers, VPS, or web infrastructure — false if the competitor is mentioned only in a non-hosting context such as finance, venture capital, gaming, sports sponsorship, or general tech news>,
  "mentionType": <one of: ${MENTION_TYPES.join(", ")}>,
  "sentiment": <one of: ${SENTIMENTS.join(", ")}>,
  "opportunityInsight": "<1-2 sentence PR opportunity for Cloudways based on this mention>",
  "opportunityAngle": "<specific positioning angle Cloudways should use>",
  "outreachTarget": <one of: ${OUTREACH_TARGETS.join(", ")}>
}

For opportunityInsight: be specific and actionable. Example: "Since ${competitor} is featured in a budget hosting comparison, Cloudways can position as the premium performance choice for agencies willing to pay for reliability."
For opportunityAngle: one concise angle, e.g. "performance-per-dollar for growing agencies"`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    const text = block.type === "text" ? block.text : "";

    const parsed = parseJsonSafe<AnalyzedMention>(text);

    if (parsed && MENTION_TYPES.includes(parsed.mentionType)) {
      return {
        isHostingRelated: parsed.isHostingRelated !== false, // default true if missing
        mentionType: parsed.mentionType,
        sentiment: SENTIMENTS.includes(parsed.sentiment) ? parsed.sentiment : "neutral",
        opportunityInsight: parsed.opportunityInsight || generateFallbackInsight(competitor, article),
        opportunityAngle: parsed.opportunityAngle || "performance-focused counter-positioning",
        outreachTarget: OUTREACH_TARGETS.includes(parsed.outreachTarget) ? parsed.outreachTarget : "other",
      };
    }
  } catch (err) {
    logger.warn({ err, url: article.url }, "AI analysis failed, using fallback");
  }

  return {
    isHostingRelated: true, // fallback: don't discard, let it through
    mentionType: "news",
    sentiment: "neutral",
    opportunityInsight: generateFallbackInsight(competitor, article),
    opportunityAngle: "performance-focused counter-positioning",
    outreachTarget: "journalist",
  };
}

function generateFallbackInsight(competitor: string, article: RawArticle): string {
  return `${competitor} is being covered by ${article.publisher}. Cloudways can leverage this visibility window to position its managed hosting as the premium performance alternative for agencies and growing businesses.`;
}
