/**
 * One-time startup migration: seeds community_posts from dev snapshot into production.
 * Runs on every startup but is a no-op if the DB already has >= DEV_SNAPSHOT_COUNT posts.
 * Remove this file (and its import in app.ts) once the migration is confirmed complete.
 */

import { db } from "@workspace/db";
import { communityPostsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { importCommunityPosts, type ImportPost } from "../services/community-service.js";
import seedData from "./community-seed-data.json" with { type: "json" };

// How many posts we expect after a full seed (from dev snapshot)
const DEV_SNAPSHOT_COUNT = 363;

export async function runCommunitySeedIfNeeded(): Promise<void> {
  try {
    const [{ count }] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(communityPostsTable);

    if (count >= DEV_SNAPSHOT_COUNT) {
      logger.info({ count }, "Community seed: already seeded, skipping");
      return;
    }

    logger.info({ existingCount: count, targetCount: DEV_SNAPSHOT_COUNT }, "Community seed: importing dev snapshot");

    const BATCH = 50;
    let totalInserted = 0;
    let totalUpdated = 0;
    const posts = seedData as unknown as ImportPost[];

    for (let i = 0; i < posts.length; i += BATCH) {
      const batch = posts.slice(i, i + BATCH);
      const result = await importCommunityPosts(batch);
      totalInserted += result.inserted;
      totalUpdated += result.updated;
    }

    logger.info({ inserted: totalInserted, updated: totalUpdated }, "Community seed: complete");
  } catch (err) {
    logger.error({ err }, "Community seed: failed (non-fatal, server continues)");
  }
}
