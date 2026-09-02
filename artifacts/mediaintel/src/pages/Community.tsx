import React, { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  useListCommunityPosts,
  useGetCommunityStats,
  useRefreshCommunity,
  useSearchCommunity,
  useSaveCommunitySearch,
  useGetCommunityCompetitorStats,
  ListCommunityPostsSource,
  ListCommunityPostsDays,
  ListCommunityPostsSortBy,
  GetCommunityCompetitorStatsDays,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  ExternalLink,
  Users,
  Clock,
  Search,
  X,
  Tag,
  TrendingUp,
  Calendar,
  Zap,
  BarChart2,
  BookmarkPlus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  reddit:       { bg: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-700 dark:text-orange-400",  dot: "bg-orange-500",  label: "Reddit" },
  hackernews:   { bg: "bg-amber-100 dark:bg-amber-900/30",    text: "text-amber-700 dark:text-amber-400",    dot: "bg-amber-500",   label: "Hacker News" },
  stackoverflow: { bg: "bg-blue-100 dark:bg-blue-900/30",     text: "text-blue-700 dark:text-blue-400",      dot: "bg-blue-500",    label: "Stack Overflow" },
  github:       { bg: "bg-slate-100 dark:bg-slate-800",       text: "text-slate-700 dark:text-slate-300",    dot: "bg-slate-500",   label: "GitHub" },
};

const OPPORTUNITY_LABELS: Record<string, { label: string; bg: string; text: string; priority?: boolean }> = {
  advice_seeking: { label: "Advice Seeking", bg: "bg-green-100 dark:bg-green-900/30",  text: "text-green-700 dark:text-green-400",  priority: true },
  comparison:     { label: "Comparison",     bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-400",   priority: true },
  complaint:      { label: "Competitor Pain",bg: "bg-red-100 dark:bg-red-900/30",      text: "text-red-700 dark:text-red-400",     priority: true },
  recommendation: { label: "Recommendation", bg: "bg-purple-100 dark:bg-purple-900/30",text: "text-purple-700 dark:text-purple-400" },
  news:           { label: "News",           bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-600 dark:text-slate-400" },
  general:        { label: "General",        bg: "bg-muted",                           text: "text-muted-foreground" },
};

function SourceBadge({ source }: { source: string }) {
  const c = SOURCE_COLORS[source] ?? { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground", label: source };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
      {c.label}
    </span>
  );
}

function OpportunityBadge({ type, score }: { type: string | null | undefined; score: number | null | undefined }) {
  if (!type || type === "general") return null;
  const c = OPPORTUNITY_LABELS[type] ?? OPPORTUNITY_LABELS.general;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", c.bg, c.text)}>
      {c.priority && <Zap size={9} className="flex-shrink-0" />}
      {c.label}
      {score != null && <span className="opacity-70 ml-0.5">·{score}</span>}
    </span>
  );
}

function CompetitorChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-700/40">
      {name}
    </span>
  );
}

function ScorePip({ score }: { score: number }) {
  if (score === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium tabular-nums">
      <TrendingUp size={9} />
      {score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score}
    </span>
  );
}

function PostSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

const TIME_RANGES: Array<{ label: string; value: ListCommunityPostsDays }> = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export default function Community() {
  const queryClient = useQueryClient();
  const [selectedSource, setSelectedSource] = useState("All");
  const [selectedCompetitor, setSelectedCompetitor] = useState("All");
  const [selectedDays, setSelectedDays] = useState<ListCommunityPostsDays>(30);
  const [sortBy, setSortBy] = useState<ListCommunityPostsSortBy>("date");
  const [page, setPage] = useState(0);
  const [liveQuery, setLiveQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; skipped: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const limit = 20;

  const params = {
    limit,
    offset: page * limit,
    days: selectedDays,
    sortBy,
    ...(selectedSource !== "All" && { source: selectedSource as ListCommunityPostsSource }),
    ...(selectedCompetitor !== "All" && { competitor: selectedCompetitor }),
  };

  const { data, isLoading } = useListCommunityPosts(params, { query: { enabled: !isLiveMode } as any });
  const { data: liveData, isLoading: liveLoading } = useSearchCommunity(
    { q: liveQuery },
    { query: { enabled: isLiveMode && liveQuery.length >= 2, staleTime: 0, gcTime: 0 } as any }
  );
  const { data: stats } = useGetCommunityStats();
  const { data: competitorStats, isLoading: competitorStatsLoading } = useGetCommunityCompetitorStats(
    { days: selectedDays as GetCommunityCompetitorStatsDays },
    { query: { enabled: !isLiveMode } as any }
  );
  const { mutate: triggerRefresh, isPending: isRefreshing } = useRefreshCommunity({
    mutation: {
      onSuccess: () => {
        setTimeout(() => queryClient.invalidateQueries(), 4000);
      },
    },
  });
  const { mutate: saveSearch, isPending: isSaving } = useSaveCommunitySearch({
    mutation: {
      onSuccess: (result) => {
        setSaveResult(result);
        setTimeout(() => setSaveResult(null), 4000);
        queryClient.invalidateQueries();
      },
    },
  });

  const handleSourceChange = (source: string) => { setSelectedSource(source); setPage(0); };
  const handleCompetitorChange = (c: string) => { setSelectedCompetitor(c); setPage(0); };
  const handleDaysChange = (d: ListCommunityPostsDays) => { setSelectedDays(d); setPage(0); };
  const handleSortChange = (s: ListCommunityPostsSortBy) => { setSortBy(s); setPage(0); };

  const handleSearch = () => {
    const q = searchInput.trim();
    if (q.length < 2) return;
    setLiveQuery(q);
    setIsLiveMode(true);
    setPage(0);
  };

  const clearSearch = () => {
    setSearchInput("");
    setLiveQuery("");
    setIsLiveMode(false);
    setPage(0);
  };

  const displayPosts = isLiveMode ? (liveData?.posts ?? []) : (data?.posts ?? []);
  const displayTotal = isLiveMode ? (liveData?.total ?? 0) : (data?.total ?? 0);
  const displayLoading = isLiveMode ? liveLoading : isLoading;
  const totalPages = Math.ceil(displayTotal / limit);
  const lastSynced = stats?.lastRefreshedAt ? new Date(stats.lastRefreshedAt) : null;
  const topCompetitors = competitorStats?.competitors?.slice(0, 15) ?? [];

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Users size={18} className="text-primary" />
                <h1 className="text-lg font-semibold tracking-tight">Community</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {!isLiveMode
                  ? `${displayTotal} post${displayTotal !== 1 ? "s" : ""} · ${topCompetitors.length} of 40 competitors mentioned · ${stats?.trackedKeywords ?? 0} keyword${(stats?.trackedKeywords ?? 0) !== 1 ? "s" : ""} tracked`
                  : `Live search across Reddit, HN, Stack Overflow & GitHub`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {lastSynced && !isLiveMode && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}</span>
                </div>
              )}
              {!isLiveMode && (
                <Button size="sm" variant="outline" onClick={() => triggerRefresh()} disabled={isRefreshing} className="gap-1.5">
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                  {isRefreshing ? "Syncing…" : "Sync now"}
                </Button>
              )}
            </div>
          </div>

          {/* Stats row */}
          {stats && stats.bySource.length > 0 && !isLiveMode && (
            <div className="flex flex-wrap gap-4 mt-3">
              {stats.bySource.map((s) => {
                const colors = SOURCE_COLORS[s.source] ?? { dot: "bg-muted-foreground" };
                return (
                  <div key={s.source} className="flex items-center gap-1.5 text-sm">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", colors.dot)} />
                    <span className="text-muted-foreground">{SOURCE_COLORS[s.source]?.label ?? s.source}</span>
                    <span className="font-medium tabular-nums">{s.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-2.5">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Live search…"
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchInput && (
                <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            <Button size="sm" variant={isLiveMode ? "default" : "outline"} onClick={handleSearch} disabled={searchInput.trim().length < 2} className="gap-1.5">
              <Search size={13} />
              {isLiveMode ? "Live" : "Search"}
            </Button>
            {isLiveMode && (
              <Button size="sm" variant="ghost" onClick={clearSearch} className="gap-1.5 text-muted-foreground">
                <X size={13} />Clear
              </Button>
            )}
            {isLiveMode && !liveLoading && (liveData?.posts?.length ?? 0) > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveSearch({ data: { q: liveQuery } })}
                disabled={isSaving}
                className={cn(
                  "gap-1.5",
                  saveResult ? "border-green-500 text-green-600 dark:text-green-400" : ""
                )}
              >
                {saveResult ? (
                  <><Check size={13} />{saveResult.saved} saved</>
                ) : (
                  <><BookmarkPlus size={13} className={isSaving ? "animate-pulse" : ""} />{isSaving ? "Saving…" : "Save list"}</>
                )}
              </Button>
            )}

            {!isLiveMode && <div className="w-px h-5 bg-border mx-1 hidden sm:block" />}

            {!isLiveMode && (
              <div className="flex bg-secondary/30 p-0.5 rounded-md gap-0.5">
                {TIME_RANGES.map((tr) => (
                  <button
                    key={tr.value}
                    onClick={() => handleDaysChange(tr.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                      selectedDays === tr.value
                        ? "bg-card text-foreground shadow-sm border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
            )}

            {!isLiveMode && (
              <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                <button
                  onClick={() => handleSortChange("date")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors",
                    sortBy === "date" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Calendar size={11} />Newest
                </button>
                <button
                  onClick={() => handleSortChange("score")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors",
                    sortBy === "score" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp size={11} />Top
                </button>
              </div>
            )}
          </div>
          {isLiveMode && (
            <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
              <Search size={11} />
              Live results for <strong>"{liveQuery}"</strong> — not saved to DB
            </p>
          )}
        </div>

        {/* Source + Competitor filter tabs */}
        {!isLiveMode && (
          <div className="flex-shrink-0 border-b border-border bg-background px-6">
            {/* Source tabs */}
            <div className="flex gap-1 overflow-x-auto pt-2 pb-1 scrollbar-hide">
              {["All", "reddit", "hackernews", "stackoverflow", "github"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSourceChange(s)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    selectedSource === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {s === "All" ? "All" : SOURCE_COLORS[s]?.label ?? s}
                  {s !== "All" && stats && (
                    <span className="ml-1.5 text-xs opacity-70">
                      {stats.bySource.find((x) => x.source === s)?.count ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Competitor tabs */}
            {topCompetitors.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => handleCompetitorChange("All")}
                  className={cn(
                    "flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    selectedCompetitor === "All"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  All competitors
                </button>
                {topCompetitors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleCompetitorChange(c.name)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                      selectedCompetitor === c.name
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {c.name}
                    <span className="ml-1.5 opacity-60">{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {/* Post list */}
            <div className="flex-1 min-w-0 px-6 py-4 space-y-3">
              {!displayLoading && displayTotal > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  {displayTotal} post{displayTotal !== 1 ? "s" : ""}
                  {!isLiveMode && ` in the last ${selectedDays} days`}
                  {sortBy === "score" && !isLiveMode && " · sorted by opportunity score"}
                </p>
              )}

              {displayLoading ? (
                Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
              ) : displayPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users size={40} className="text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {isLiveMode ? `No live results for "${liveQuery}"` : `No posts in the last ${selectedDays} days`}
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    {isLiveMode ? "Try a different keyword" : 'Hit "Sync now" or try a wider time range'}
                  </p>
                </div>
              ) : (
                <>
                  {displayPosts.map((post) => (
                    <article
                      key={post.url}
                      className={cn(
                        "group border rounded-lg p-4 hover:border-primary/30 transition-colors",
                        post.opportunityScore != null && post.opportunityScore >= 8
                          ? "border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-950/10"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <SourceBadge source={post.source} />
                            {post.subreddit && (
                              <span className="text-xs text-muted-foreground">
                                {post.source === "reddit" ? `r/${post.subreddit}` : post.subreddit}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })}
                            </span>
                            {post.author && (
                              <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">u/{post.author}</span>
                              </>
                            )}
                            {post.score > 0 && <ScorePip score={post.score} />}
                          </div>

                          {/* Title */}
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-medium text-sm leading-snug hover:text-primary transition-colors line-clamp-2 mb-1.5"
                          >
                            {post.title}
                          </a>

                          {/* Snippet */}
                          {post.snippet && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                              {post.snippet}
                            </p>
                          )}

                          {/* AI opportunity summary */}
                          {post.opportunitySummary && (
                            <div className="flex items-start gap-1.5 bg-primary/5 border border-primary/10 rounded-md px-2.5 py-1.5 mb-2">
                              <Zap size={11} className="text-primary flex-shrink-0 mt-0.5" />
                              <p className="text-[11px] text-primary/80 leading-relaxed">{post.opportunitySummary}</p>
                            </div>
                          )}

                          {/* Tags row — keyword + competitors + opportunity */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              <Tag size={9} />
                              {post.keyword}
                            </span>
                            {post.matchedKeywords && post.matchedKeywords.length > 1 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{post.matchedKeywords.length - 1} kw
                              </span>
                            )}
                            {post.detectedCompetitors?.map((c) => (
                              <CompetitorChip key={c} name={c} />
                            ))}
                            <OpportunityBadge type={post.opportunityType} score={post.opportunityScore} />
                          </div>
                        </div>

                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors mt-0.5"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </article>
                  ))}

                  {!isLiveMode && totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-2 pb-4">
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                        Previous
                      </Button>
                      <span className="flex items-center text-sm text-muted-foreground px-2">
                        {page + 1} / {totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar — Competitors in Feed */}
            <div className="hidden lg:flex flex-col w-72 flex-shrink-0 border-l border-border px-5 py-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={14} className="text-primary" />
                <h2 className="text-sm font-semibold">Competitors in Feed</h2>
              </div>

              {competitorStatsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full rounded" />
                  ))}
                </div>
              ) : topCompetitors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">No competitor mentions detected yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Sync to fetch fresh posts.</p>
                </div>
              ) : (
                <div className="space-y-1.5 flex-1 overflow-y-auto">
                  {topCompetitors.map((c, i) => {
                    const maxCount = topCompetitors[0]?.count ?? 1;
                    const pct = Math.round((c.count / maxCount) * 100);
                    return (
                      <div key={c.name} className="group relative flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors">
                        {/* Bar fill */}
                        <div
                          className="absolute inset-0 rounded-md bg-sky-100/60 dark:bg-sky-900/20 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="relative z-10 text-[10px] text-muted-foreground w-4 text-right flex-shrink-0 tabular-nums">
                          {i + 1}
                        </span>
                        <span className="relative z-10 text-xs font-medium flex-1 truncate">{c.name}</span>
                        <span className="relative z-10 text-[11px] font-semibold tabular-nums text-sky-700 dark:text-sky-400 flex-shrink-0">
                          {c.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
