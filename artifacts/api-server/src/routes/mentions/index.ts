import { Router } from "express";
import {
  getMentions,
  getMentionStats,
  getRecentActivity,
  getMentionsByCompetitor,
  getCompetitors,
  getPublishers,
  getRefreshLogs,
  refreshMentions,
  updateMentionStatus,
} from "../../services/mention-service.js";
import {
  ListMentionsQueryParams,
  GetMentionStatsQueryParams,
  GetRecentActivityQueryParams,
  GetMentionsByCompetitorQueryParams,
  RefreshMentionsBody,
  UpdateMentionStatusBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/mentions", async (req, res) => {
  const parsed = ListMentionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { competitor, timeRange, mentionType, publisher, sentiment, sortBy, status, limit, offset } =
    parsed.data;

  const result = await getMentions({
    competitor,
    timeRange,
    mentionType,
    publisher,
    sentiment,
    sortBy,
    status,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  res.json(result);
});

router.get("/mentions/stats", async (req, res) => {
  const parsed = GetMentionStatsQueryParams.safeParse(req.query);
  const timeRange = parsed.success ? parsed.data.timeRange : "30d";
  const competitor = parsed.success ? parsed.data.competitor : undefined;
  const result = await getMentionStats(timeRange, competitor);
  res.json(result);
});

router.post("/mentions/refresh", (req, res) => {
  const parsed = RefreshMentionsBody.safeParse(req.body);
  const competitors = parsed.success ? parsed.data.competitors : undefined;
  res.status(202).json({ status: "refresh_started" });
  refreshMentions(competitors).catch((err) => {
    req.log.error({ err }, "Background refresh failed");
  });
});

router.get("/mentions/recent-activity", async (req, res) => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit : 10;
  const result = await getRecentActivity(limit ?? 10);
  res.json(result);
});

router.get("/mentions/by-competitor", async (req, res) => {
  const parsed = GetMentionsByCompetitorQueryParams.safeParse(req.query);
  const timeRange = parsed.success ? parsed.data.timeRange : "30d";
  const result = await getMentionsByCompetitor(timeRange);
  res.json(result);
});

router.patch("/mentions/:id/status", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid mention id" });
    return;
  }

  const parsed = UpdateMentionStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const updated = await updateMentionStatus(id, parsed.data.status);
  if (!updated) {
    res.status(404).json({ error: "Mention not found" });
    return;
  }

  res.json(updated);
});

router.get("/mentions/refresh-logs", async (req, res) => {
  const limit = Math.min(20, parseInt(String(req.query["limit"] ?? "5"), 10) || 5);
  const result = await getRefreshLogs(limit);
  res.json(result);
});

router.get("/competitors", async (_req, res) => {
  const result = await getCompetitors();
  res.json(result);
});

router.get("/publishers", async (_req, res) => {
  const result = await getPublishers();
  res.json(result);
});

export default router;
