/**
 * Migrate competitor_pages from the local dev DB to production.
 *
 * Usage:
 *   IMPORT_SECRET=<secret> DATABASE_URL=<dev-db-url> pnpm --filter @workspace/scripts run migrate-pages-to-prod
 *
 * The script reads all pages from the dev DB and POSTs them in batches to the
 * production import endpoint, preserving firstSeenAt timestamps.
 */

import pg from "pg";

const PROD_URL = "https://Cloudwaysmediaintel.replit.app";
const IMPORT_SECRET = process.env["IMPORT_SECRET"] ?? "";
const BATCH_SIZE = 500;

if (!IMPORT_SECRET) {
  console.error("❌  IMPORT_SECRET env var is required");
  process.exit(1);
}

// ── Read all pages from dev DB ────────────────────────────────────────────────
const client = new pg.Client({ connectionString: process.env["DATABASE_URL"] });
await client.connect();

const { rows } = await client.query<{
  competitor: string;
  url: string;
  title: string;
  page_type: string;
  section: string;
  lastmod: Date | null;
  first_seen_at: Date;
  last_seen_at: Date;
}>(`
  SELECT competitor, url, title, page_type, section, lastmod, first_seen_at, last_seen_at
  FROM competitor_pages
  ORDER BY first_seen_at ASC
`);

await client.end();
console.log(`✅  Read ${rows.length} pages from dev DB`);

// ── Stream to production in batches ──────────────────────────────────────────
const pages = rows.map((r) => ({
  competitor: r.competitor,
  url: r.url,
  title: r.title,
  pageType: r.page_type,
  section: r.section,
  lastmod: r.lastmod ? r.lastmod.toISOString() : null,
  firstSeenAt: r.first_seen_at.toISOString(),
  lastSeenAt: r.last_seen_at.toISOString(),
}));

let totalInserted = 0;
let totalUpdated = 0;
const totalBatches = Math.ceil(pages.length / BATCH_SIZE);

for (let i = 0; i < pages.length; i += BATCH_SIZE) {
  const batch = pages.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;

  const resp = await fetch(`${PROD_URL}/api/pages/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-import-secret": IMPORT_SECRET,
    },
    body: JSON.stringify({ pages: batch }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`❌  Batch ${batchNum}/${totalBatches} FAILED (${resp.status}): ${text}`);
    continue;
  }

  const result = (await resp.json()) as { inserted: number; updated: number };
  totalInserted += result.inserted;
  totalUpdated += result.updated;
  console.log(
    `  Batch ${batchNum}/${totalBatches}: +${result.inserted} new, ~${result.updated} updated`
  );
}

console.log(`\n✅  Done. Inserted: ${totalInserted}, updated: ${totalUpdated}`);
