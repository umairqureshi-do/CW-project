import { Router } from "express";
import {
  getCommunityPosts,
  getCommunityStats,
  getCommunityTrackedKeywords,
  addTrackedKeyword,
  removeTrackedKeyword,
  refreshCommunity,
  searchCommunityLive,
  saveSearchResults,
  getCommunityRefreshLogs,
  getCommunityCompetitorStats,
} from "../../services/community-service.js";
import { logger } from "../../lib/logger.js";

const router = Router();

const VALID_SOURCES = new Set(["reddit", "hackernews", "stackoverflow", "github"]);
const VALID_SORT = new Set(["date", "score"]);

router.get("/community/posts", async (req, res) => {
  const source = typeof req.query["source"] === "string" && VALID_SOURCES.has(req.query["source"])
    ? req.query["source"]
    : undefined;
  const keyword = typeof req.query["keyword"] === "string" ? req.query["keyword"] : undefined;
  const q = typeof req.query["q"] === "string" ? req.query["q"] : undefined;
  const competitor = typeof req.query["competitor"] === "string" ? req.query["competitor"] : undefined;
  const limit = Math.min(Math.max(Number(req.query["limit"]) || 50, 1), 100);
  const offset = Math.max(Number(req.query["offset"]) || 0, 0);

  const rawDays = Number(req.query["days"]);
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30;

  const sortBy = typeof req.query["sortBy"] === "string" && VALID_SORT.has(req.query["sortBy"])
    ? (req.query["sortBy"] as "date" | "score")
    : "date";

  const result = await getCommunityPosts({ source, keyword, q, days, sortBy, limit, offset, competitor });
  res.json(result);
});

router.get("/community/stats", async (_req, res) => {
  const result = await getCommunityStats();
  res.json(result);
});

router.get("/community/competitor-stats", async (req, res) => {
  const rawDays = Number(req.query["days"]);
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30;
  const competitors = await getCommunityCompetitorStats(days);
  res.json({ competitors });
});

router.get("/community/keywords", async (_req, res) => {
  const keywords = await getCommunityTrackedKeywords();
  res.json({ keywords });
});

router.post("/community/keywords", async (req, res) => {
  const keyword = typeof req.body?.keyword === "string" ? req.body.keyword.trim() : "";
  if (!keyword || keyword.length < 2 || keyword.length > 100) {
    res.status(400).json({ error: "keyword must be 2–100 characters" });
    return;
  }
  const row = await addTrackedKeyword(keyword);
  res.status(201).json(row);
});

router.delete("/community/keywords/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await removeTrackedKeyword(id);
  res.status(204).end();
});

router.get("/community/search", async (req, res) => {
  const q = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";
  if (!q || q.length < 2) {
    res.status(400).json({ error: "q must be at least 2 characters" });
    return;
  }
  const posts = await searchCommunityLive(q);
  const sorted = posts.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  res.json({ posts: sorted, total: sorted.length });
});

router.post("/community/search/save", async (req, res) => {
  const q = typeof req.body?.q === "string" ? req.body.q.trim() : "";
  if (!q || q.length < 2) {
    res.status(400).json({ error: "q must be at least 2 characters" });
    return;
  }
  const result = await saveSearchResults(q);
  res.json(result);
});

router.get("/community/refresh-logs", async (req, res) => {
  const limit = Math.min(Number(req.query["limit"]) || 5, 20);
  const result = await getCommunityRefreshLogs(limit);
  res.json(result);
});

router.post("/community/refresh", async (req, res) => {
  res.status(202).json({ status: "refresh_started" });
  refreshCommunity().catch((err) => {
    logger.error({ err }, "Community background refresh failed");
  });
});

export default router;
