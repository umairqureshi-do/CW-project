import { Router } from "express";
import { db } from "@workspace/db";
import { competitorPagesTable } from "@workspace/db";
import {
  getCompetitorPages,
  getCompetitorPagesStats,
  getCompetitorPagesRefreshLogs,
  refreshCompetitorPages,
  COMPETITOR_SITEMAPS,
} from "../../services/pages-service.js";
import { logger } from "../../lib/logger.js";

const router = Router();

router.get("/pages", async (req, res) => {
  const competitor = typeof req.query.competitor === "string" ? req.query.competitor : undefined;
  const pageType = typeof req.query.pageType === "string" ? req.query.pageType : undefined;
  const section = typeof req.query.section === "string" ? req.query.section : undefined;
  const locale = typeof req.query.locale === "string" ? req.query.locale : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() || undefined : undefined;
  const days = req.query.days ? Number(req.query.days) : undefined;
  const newOnly = req.query.newOnly === "true";
  const recentlyChanged = req.query.recentlyChanged === "true";
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const result = await getCompetitorPages({ competitor, pageType, section, locale, days, newOnly, recentlyChanged, q, limit, offset });
  res.json(result);
});

router.get("/pages/stats", async (_req, res) => {
  const stats = await getCompetitorPagesStats();
  res.json(stats);
});

router.get("/pages/refresh-logs", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const result = await getCompetitorPagesRefreshLogs(limit);
  res.json(result);
});

router.get("/pages/competitors", async (_req, res) => {
  res.json({ competitors: COMPETITOR_SITEMAPS.map((c) => c.competitor) });
});

router.post("/pages/refresh", async (req, res) => {
  res.status(202).json({ status: "refresh_started" });
  refreshCompetitorPages().catch((err) => {
    logger.error({ err }, "Pages background refresh failed");
  });
});

// ── Import endpoint (dev→prod migration) ─────────────────────────────────────
router.post("/pages/import", async (req, res) => {
  const secret = req.headers["x-import-secret"];
  if (!secret || secret !== process.env["IMPORT_SECRET"]) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { pages } = req.body as {
    pages: Array<{
      competitor: string;
      url: string;
      title: string;
      pageType: string;
      section: string;
      lastmod: string | null;
      firstSeenAt: string;
      lastSeenAt: string;
    }>;
  };

  if (!Array.isArray(pages) || pages.length === 0) {
    res.status(400).json({ error: "pages array required" });
    return;
  }

  let inserted = 0;
  let updated = 0;

  for (const p of pages) {
    const lastmod = p.lastmod ? new Date(p.lastmod) : undefined;
    const firstSeenAt = new Date(p.firstSeenAt);
    const lastSeenAt = new Date(p.lastSeenAt);

    const result = await db
      .insert(competitorPagesTable)
      .values({
        competitor: p.competitor,
        url: p.url,
        title: p.title,
        pageType: p.pageType,
        section: p.section,
        lastmod: lastmod && !isNaN(lastmod.getTime()) ? lastmod : undefined,
        firstSeenAt,
        lastSeenAt,
      })
      .onConflictDoUpdate({
        target: competitorPagesTable.url,
        set: {
          competitor: p.competitor,
          title: p.title,
          pageType: p.pageType,
          section: p.section,
          lastmod: lastmod && !isNaN(lastmod.getTime()) ? lastmod : undefined,
          lastSeenAt,
        },
      })
      .returning({ id: competitorPagesTable.id, firstSeenAt: competitorPagesTable.firstSeenAt });

    // If firstSeenAt matches what we passed, it's a new row; otherwise updated
    const row = result[0];
    if (row && Math.abs(row.firstSeenAt.getTime() - firstSeenAt.getTime()) < 1000) {
      inserted++;
    } else {
      updated++;
    }
  }

  res.json({ inserted, updated });
});

export default router;
