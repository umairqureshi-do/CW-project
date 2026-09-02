import { db } from "@workspace/db";
import { mentionsTable } from "@workspace/db";
import { like, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function seedMentions() {
  // 1. Purge placeholder seed entries (example-*.com URLs from early dev)
  try {
    const deleted = await db
      .delete(mentionsTable)
      .where(like(mentionsTable.url, "https://example-%"))
      .returning({ id: mentionsTable.id });

    if (deleted.length > 0) {
      logger.info({ count: deleted.length }, "Purged placeholder seed mentions on startup");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to purge placeholder seed mentions");
  }

  // 2. One-time cleanup: strip HTML tags and fix Google redirect URLs in stored titles/snippets/urls
  try {
    const cleaned = await db.execute(sql`
      UPDATE mentions SET
        title = trim(regexp_replace(
          regexp_replace(
            replace(replace(replace(replace(replace(replace(replace(replace(
              title,
              '&lt;', '<'), '&gt;', '>'), '&amp;', '&'), '&quot;', '"'),
              '&nbsp;', ' '), '&middot;', '·'), '&ndash;', '–'), '&mdash;', '—'),
          '<[^>]+>', ' ', 'g'),
        '\s+', ' ', 'g')),
        snippet = trim(regexp_replace(
          regexp_replace(
            replace(replace(replace(replace(replace(replace(replace(replace(
              snippet,
              '&lt;', '<'), '&gt;', '>'), '&amp;', '&'), '&quot;', '"'),
              '&nbsp;', ' '), '&middot;', '·'), '&ndash;', '–'), '&mdash;', '—'),
          '<[^>]+>', ' ', 'g'),
        '\s+', ' ', 'g')),
        url = CASE
          WHEN url LIKE 'https://www.google.com/url%' AND url LIKE '%&amp;url=%'
          THEN split_part(split_part(url, '&amp;url=', 2), '&amp;ct=', 1)
          WHEN url LIKE 'https://www.google.com/url%' AND url LIKE '%&url=%'
          THEN split_part(split_part(url, '&url=', 2), '&ct=', 1)
          ELSE url
        END
      WHERE title ~ '<[^>]+>' OR title LIKE '%&lt;%' OR title LIKE '%&amp;%'
         OR snippet ~ '<[^>]+>' OR snippet LIKE '%&lt;%' OR snippet LIKE '%&middot;%' OR snippet LIKE '%&amp;%'
         OR url LIKE '%google.com/url%'
    `);
    const count = (cleaned as unknown as { rowCount: number }).rowCount ?? 0;
    if (count > 0) {
      logger.info({ count }, "Cleaned HTML/entity issues in existing mention records");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to clean HTML in existing mention records");
  }

  // 3. Purge articles that fail the hosting-relevance keyword filter.
  //    These are articles that mention a competitor name but are not about
  //    web hosting services (e.g. package releases, financial news, gaming).
  try {
    const result = await db.execute(sql`
      DELETE FROM mentions
      WHERE NOT (
        title ILIKE '%hosting%' OR title ILIKE '%web host%' OR title ILIKE '%hosted%'
        OR title ILIKE '%vps%' OR title ILIKE '%dedicated server%' OR title ILIKE '%bare metal%'
        OR title ILIKE '%cloud platform%' OR title ILIKE '%cloud server%' OR title ILIKE '%cloud hosting%' OR title ILIKE '%cloud infrastructure%'
        OR title ILIKE '%managed wordpress%' OR title ILIKE '%wordpress host%' OR title ILIKE '%managed host%'
        OR title ILIKE '%cpanel%' OR title ILIKE '%plesk%' OR title ILIKE '%whm%'
        OR title ILIKE '%domain%' OR title ILIKE '%ssl%' OR title ILIKE '%bandwidth%' OR title ILIKE '%uptime%'
        OR title ILIKE '%datacenter%' OR title ILIKE '%data center%'
        OR title ILIKE '%cdn%' OR title ILIKE '%content delivery%'
        OR title ILIKE '%deployment%' OR title ILIKE '%infrastructure%' OR title ILIKE '%migration%'
        OR title ILIKE '%nginx%' OR title ILIKE '%apache%' OR title ILIKE '%php%' OR title ILIKE '%mysql%'
        OR title ILIKE '%devops%' OR title ILIKE '%kubernetes%' OR title ILIKE '%docker%'
        OR title ILIKE '%droplet%' OR title ILIKE '%scalab%'
        OR title ILIKE '%caching%' OR title ILIKE '%site speed%' OR title ILIKE '%page speed%'
        OR title ILIKE '%web application%' OR title ILIKE '%web app%' OR title ILIKE '%reseller%'
        OR title ILIKE '%wordpress site%' OR title ILIKE '%wp site%' OR title ILIKE '%server%'
        OR snippet ILIKE '%hosting%' OR snippet ILIKE '%web host%' OR snippet ILIKE '%hosted%'
        OR snippet ILIKE '%vps%' OR snippet ILIKE '%dedicated server%' OR snippet ILIKE '%bare metal%'
        OR snippet ILIKE '%cloud platform%' OR snippet ILIKE '%cloud server%' OR snippet ILIKE '%cloud hosting%' OR snippet ILIKE '%cloud infrastructure%'
        OR snippet ILIKE '%managed wordpress%' OR snippet ILIKE '%wordpress host%' OR snippet ILIKE '%managed host%'
        OR snippet ILIKE '%cpanel%' OR snippet ILIKE '%plesk%' OR snippet ILIKE '%whm%'
        OR snippet ILIKE '%domain%' OR snippet ILIKE '%ssl%' OR snippet ILIKE '%bandwidth%' OR snippet ILIKE '%uptime%'
        OR snippet ILIKE '%datacenter%' OR snippet ILIKE '%data center%'
        OR snippet ILIKE '%cdn%' OR snippet ILIKE '%content delivery%'
        OR snippet ILIKE '%deployment%' OR snippet ILIKE '%infrastructure%' OR snippet ILIKE '%migration%'
        OR snippet ILIKE '%nginx%' OR snippet ILIKE '%apache%' OR snippet ILIKE '%php%' OR snippet ILIKE '%mysql%'
        OR snippet ILIKE '%devops%' OR snippet ILIKE '%kubernetes%' OR snippet ILIKE '%docker%'
        OR snippet ILIKE '%droplet%' OR snippet ILIKE '%scalab%'
        OR snippet ILIKE '%caching%' OR snippet ILIKE '%site speed%' OR snippet ILIKE '%page speed%'
        OR snippet ILIKE '%web application%' OR snippet ILIKE '%web app%' OR snippet ILIKE '%reseller%'
        OR snippet ILIKE '%wordpress site%' OR snippet ILIKE '%wp site%' OR snippet ILIKE '%server%'
      )
    `);

    const count = (result as unknown as { rowCount: number }).rowCount ?? 0;
    if (count > 0) {
      logger.info({ count }, "Purged non-hosting-related articles on startup");
    } else {
      logger.info("All articles passed hosting-relevance check — feed is clean");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to purge non-hosting-related articles");
  }
}
