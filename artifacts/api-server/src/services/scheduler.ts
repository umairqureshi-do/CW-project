import cron from "node-cron";
import { logger } from "../lib/logger";
import { refreshMentions, getRefreshLogs } from "./mention-service";
import { refreshCompIntel, getCompIntelRefreshLogs } from "./comp-intel-service";
import { refreshCommunity, getCommunityRefreshLogs, backfillCompetitorDetection } from "./community-service";
import { refreshCompetitorPages, getCompetitorPagesRefreshLogs } from "./pages-service";

async function runCatchupIfOverdue(): Promise<void> {
  // --- Mentions catchup ---
  try {
    const result = await getRefreshLogs(1);
    const lastRun = result.logs[0]?.completedAt ? new Date(result.logs[0].completedAt) : null;
    const hoursSinceLast = lastRun ? (Date.now() - lastRun.getTime()) / (1000 * 60 * 60) : Infinity;
    if (hoursSinceLast >= 20) {
      logger.info({ hoursSinceLast: Math.round(hoursSinceLast) }, "Mentions: last sync overdue — running catchup on startup");
      const r = await refreshMentions();
      logger.info({ fetched: r.fetched, analyzed: r.analyzed }, "Mentions catchup complete");
    } else {
      logger.info({ hoursSinceLast: Math.round(hoursSinceLast) }, "Mentions: last sync recent — skipping startup catchup");
    }
  } catch (err) {
    logger.error({ err }, "Mentions startup catchup check failed");
  }

  // --- CompIntel catchup ---
  try {
    const { logs: ciLogs } = await getCompIntelRefreshLogs(1);
    const ciLastRun = ciLogs[0]?.completedAt ? new Date(ciLogs[0].completedAt) : null;
    const ciHours = ciLastRun ? (Date.now() - ciLastRun.getTime()) / (1000 * 60 * 60) : Infinity;
    if (ciHours >= 20) {
      logger.info({ hoursSinceLast: Math.round(ciHours) }, "CompIntel: last sync overdue — running catchup on startup");
      const r = await refreshCompIntel();
      logger.info({ fetched: r.fetched }, "CompIntel catchup complete");
    } else {
      logger.info({ hoursSinceLast: Math.round(ciHours) }, "CompIntel: last sync recent — skipping startup catchup");
    }
  } catch (err) {
    logger.error({ err }, "CompIntel startup catchup check failed");
  }

  // --- Community catchup ---
  try {
    const { logs: comLogs } = await getCommunityRefreshLogs(1);
    const comLastRun = comLogs[0]?.completedAt ? new Date(comLogs[0].completedAt) : null;
    const comHours = comLastRun ? (Date.now() - comLastRun.getTime()) / (1000 * 60 * 60) : Infinity;
    if (comHours >= 20) {
      logger.info({ hoursSinceLast: Math.round(comHours) }, "Community: last sync overdue — running catchup on startup");
      const r = await refreshCommunity();
      logger.info({ fetched: r.fetched }, "Community catchup complete");
    } else {
      logger.info({ hoursSinceLast: Math.round(comHours) }, "Community: last sync recent — skipping startup catchup");
    }
  } catch (err) {
    logger.error({ err }, "Community startup catchup check failed");
  }

  // --- Pages catchup ---
  try {
    const { logs: pgLogs } = await getCompetitorPagesRefreshLogs(1);
    const pgLastRun = pgLogs[0]?.completedAt ? new Date(pgLogs[0].completedAt) : null;
    const pgHours = pgLastRun ? (Date.now() - pgLastRun.getTime()) / (1000 * 60 * 60) : Infinity;
    if (pgHours >= 20) {
      logger.info({ hoursSinceLast: Math.round(pgHours) }, "Pages: last sync overdue — running catchup on startup");
      const r = await refreshCompetitorPages();
      logger.info({ fetched: r.fetched }, "Pages catchup complete");
    } else {
      logger.info({ hoursSinceLast: Math.round(pgHours) }, "Pages: last sync recent — skipping startup catchup");
    }
  } catch (err) {
    logger.error({ err }, "Pages startup catchup check failed");
  }
}

export function startScheduler() {
  // 7:00 AM PKT = 2:00 AM UTC  →  cron: "0 2 * * *"
  cron.schedule("0 2 * * *", async () => {
    logger.info("Scheduled daily sync starting (07:00 PKT) — mentions + comp-intel + community");

    try {
      const r = await refreshMentions();
      logger.info({ fetched: r.fetched, analyzed: r.analyzed }, "Mentions daily sync complete");
    } catch (err) {
      logger.error({ err }, "Mentions daily sync failed");
    }

    try {
      const r = await refreshCompIntel();
      logger.info({ fetched: r.fetched }, "CompIntel daily sync complete");
    } catch (err) {
      logger.error({ err }, "CompIntel daily sync failed");
    }

    try {
      const r = await refreshCommunity();
      logger.info({ fetched: r.fetched }, "Community daily sync complete");
    } catch (err) {
      logger.error({ err }, "Community daily sync failed");
    }

    try {
      const r = await refreshCompetitorPages();
      logger.info({ fetched: r.fetched }, "Pages daily sync complete");
    } catch (err) {
      logger.error({ err }, "Pages daily sync failed");
    }
  });

  logger.info("Daily sync scheduler registered (07:00 PKT / 02:00 UTC) — mentions + comp-intel + community + pages");

  // On autoscale deployments the cron may never fire. Run a catchup check on
  // every cold start so the first visitor sees fresh data.
  runCatchupIfOverdue();

  // Backfill competitor detection for any existing posts that predate this feature
  backfillCompetitorDetection();
}
