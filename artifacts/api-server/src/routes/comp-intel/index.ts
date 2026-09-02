import { Router } from "express";
import {
  getCompIntelArticles,
  getCompIntelRefreshLogs,
  getCompIntelStats,
  refreshCompIntel,
} from "../../services/comp-intel-service.js";
import { logger } from "../../lib/logger.js";

const router = Router();

const VALID_TIME_RANGES = new Set(["7d", "30d", "90d"]);

router.get("/comp-intel", async (req, res) => {
  const competitor = typeof req.query["competitor"] === "string" ? req.query["competitor"] : undefined;
  const timeRaw = req.query["timeRange"];
  const timeRange = typeof timeRaw === "string" && VALID_TIME_RANGES.has(timeRaw)
    ? (timeRaw as "7d" | "30d" | "90d")
    : undefined;
  const limit = Math.min(Math.max(Number(req.query["limit"]) || 50, 1), 100);
  const offset = Math.max(Number(req.query["offset"]) || 0, 0);

  const result = await getCompIntelArticles({ competitor, timeRange, limit, offset });
  res.json(result);
});

router.get("/comp-intel/stats", async (_req, res) => {
  const result = await getCompIntelStats();
  res.json(result);
});

router.get("/comp-intel/refresh-logs", async (req, res) => {
  const limit = Math.min(Number(req.query["limit"]) || 5, 20);
  const result = await getCompIntelRefreshLogs(limit);
  res.json(result);
});

router.post("/comp-intel/refresh", async (req, res) => {
  res.status(202).json({ status: "refresh_started" });
  refreshCompIntel().catch((err) => {
    logger.error({ err }, "CompIntel background refresh failed");
  });
});

export default router;
