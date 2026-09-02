import pg from "pg";

const PROD_URL = "https://Cloudwaysmediaintel.replit.app";
const IMPORT_SECRET = process.env["IMPORT_SECRET"] ?? "";
const BATCH_SIZE = 50;

if (!IMPORT_SECRET) {
  console.error("IMPORT_SECRET env var is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env["DATABASE_URL"] });
await client.connect();

const { rows } = await client.query(`
  SELECT 
    source, subreddit, title, url, snippet, author, keyword,
    matched_keywords, score, posted_at,
    detected_competitors, opportunity_type, opportunity_score, opportunity_summary
  FROM community_posts
  ORDER BY posted_at DESC
`);

await client.end();
console.log(`Fetched ${rows.length} posts from dev DB`);

// Shape posts for the import endpoint
const posts = rows.map((r: any) => ({
  source: r.source,
  subreddit: r.subreddit ?? null,
  title: r.title,
  url: r.url,
  snippet: r.snippet ?? null,
  author: r.author ?? null,
  keyword: r.keyword,
  matchedKeywords: r.matched_keywords ?? [],
  score: r.score ?? 0,
  postedAt: r.posted_at instanceof Date ? r.posted_at.toISOString() : String(r.posted_at),
  detectedCompetitors: r.detected_competitors ?? [],
  opportunityType: r.opportunity_type ?? null,
  opportunityScore: r.opportunity_score ?? null,
  opportunitySummary: r.opportunity_summary ?? null,
}));

let totalInserted = 0;
let totalUpdated = 0;

for (let i = 0; i < posts.length; i += BATCH_SIZE) {
  const batch = posts.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(posts.length / BATCH_SIZE);

  const resp = await fetch(`${PROD_URL}/api/community/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-import-secret": IMPORT_SECRET,
    },
    body: JSON.stringify({ posts: batch }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Batch ${batchNum}/${totalBatches} FAILED (${resp.status}): ${text}`);
    continue;
  }

  const result = await resp.json() as { inserted: number; updated: number };
  totalInserted += result.inserted;
  totalUpdated += result.updated;
  console.log(`Batch ${batchNum}/${totalBatches}: +${result.inserted} new, ~${result.updated} updated`);
}

console.log(`\nDone. Total inserted: ${totalInserted}, updated: ${totalUpdated}`);
