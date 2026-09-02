import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  useListCompIntelArticles,
  useGetCompIntelStats,
  useGetCompIntelRefreshLogs,
  useRefreshCompIntel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ExternalLink, Newspaper, Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPETITOR_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Hostinger:     { bg: "bg-red-100 dark:bg-red-900/30",      text: "text-red-700 dark:text-red-400",      dot: "bg-red-500" },
  Kinsta:        { bg: "bg-slate-100 dark:bg-slate-800",      text: "text-slate-700 dark:text-slate-300",  dot: "bg-slate-600 dark:bg-slate-400" },
  "WP Engine":   { bg: "bg-blue-100 dark:bg-blue-900/30",     text: "text-blue-700 dark:text-blue-400",    dot: "bg-blue-500" },
  Bluehost:      { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500" },
  GreenGeeks:    { bg: "bg-green-100 dark:bg-green-900/30",   text: "text-green-700 dark:text-green-400",  dot: "bg-green-500" },
  HostArmada:    { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  Ultahost:      { bg: "bg-lime-100 dark:bg-lime-900/30",     text: "text-lime-700 dark:text-lime-400",    dot: "bg-lime-500" },
  "WPX Hosting": { bg: "bg-cyan-100 dark:bg-cyan-900/30",     text: "text-cyan-700 dark:text-cyan-400",    dot: "bg-cyan-500" },
  Pressable:     { bg: "bg-pink-100 dark:bg-pink-900/30",     text: "text-pink-700 dark:text-pink-400",    dot: "bg-pink-500" },
  "WPMU DEV":    { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  "Rocket.net":  { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  RunCloud:      { bg: "bg-teal-100 dark:bg-teal-900/30",     text: "text-teal-700 dark:text-teal-400",    dot: "bg-teal-500" },
  DreamHost:     { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
  GridPane:      { bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-700 dark:text-amber-400",  dot: "bg-amber-500" },
  ServerAvatar:  { bg: "bg-sky-100 dark:bg-sky-900/30",       text: "text-sky-700 dark:text-sky-400",      dot: "bg-sky-500" },
};

function ArticleSkeleton() {
  return (
    <div className="flex flex-col bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/10 flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="px-4 py-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function CompetitorBadge({ competitor }: { competitor: string }) {
  const colors = COMPETITOR_COLORS[competitor] ?? { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0", colors.bg, colors.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", colors.dot)} />
      {competitor}
    </span>
  );
}

export default function CompIntel() {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [selectedCompetitor, setSelectedCompetitor] = useState("All");
  const [page, setPage] = useState(0);
  const limit = 20;

  const params = {
    limit,
    offset: page * limit,
    timeRange,
    ...(selectedCompetitor !== "All" && { competitor: selectedCompetitor }),
  };

  const { data, isLoading } = useListCompIntelArticles(params);
  const { data: stats } = useGetCompIntelStats();
  const { data: logsData } = useGetCompIntelRefreshLogs({ limit: 1 });
  const { mutate: triggerRefresh, isPending: isRefreshing } = useRefreshCompIntel({
    mutation: {
      onSuccess: () => {
        setTimeout(() => {
          queryClient.invalidateQueries();
        }, 3000);
      },
    },
  });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const lastLog = logsData?.logs?.[0];
  const lastSynced = lastLog?.completedAt ? new Date(lastLog.completedAt) : null;

  function handleCompetitorChange(c: string) {
    setSelectedCompetitor(c);
    setPage(0);
  }

  function handleTimeRangeChange(r: "7d" | "30d" | "90d") {
    setTimeRange(r);
    setPage(0);
  }

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Newspaper size={18} className="text-primary" />
                <h1 className="text-lg font-semibold tracking-tight">CompIntel</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Latest articles from competitor blogs — {stats?.feeds ?? 15} feeds tracked
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {lastSynced && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}</span>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerRefresh()}
                disabled={isRefreshing}
                className="gap-1.5"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Syncing…" : "Sync now"}
              </Button>
            </div>
          </div>

          {/* Stats dots row */}
          {stats && (
            <div className="flex flex-wrap gap-4 mt-4">
              {stats.byCompetitor.map((c) => {
                const colors = COMPETITOR_COLORS[c.competitor] ?? { dot: "bg-muted-foreground" };
                return (
                  <div key={c.competitor} className="flex items-center gap-1.5 text-sm">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", colors.dot)} />
                    <span className="text-muted-foreground">{c.competitor}</span>
                    <span className="font-medium tabular-nums">{c.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter bar — time range + competitor tabs on same row */}
        <div className="flex-shrink-0 border-b border-border bg-background px-6">
          <div className="flex items-center gap-3 py-2">
            {/* Time range */}
            <div className="flex bg-secondary/30 p-0.5 rounded-md gap-0.5 flex-shrink-0">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleTimeRangeChange(r)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                    timeRange === r
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border/50 flex-shrink-0" />

            {/* Competitor tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {(["All", ...(stats?.byCompetitor.map((c) => c.competitor) ?? [])]).map((c) => (
                <button
                  key={c}
                  onClick={() => handleCompetitorChange(c)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    selectedCompetitor === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {c}
                  {c !== "All" && stats && (
                    <span className="ml-1.5 text-xs opacity-70">
                      {stats.byCompetitor.find((s) => s.competitor === c)?.count ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
          {isLoading ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {Array.from({ length: 6 }).map((_, i) => <ArticleSkeleton key={i} />)}
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <BookOpen size={36} className="text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">No articles yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Hit "Sync now" to fetch the latest posts from competitor blogs
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => triggerRefresh()}
                disabled={isRefreshing}
                className="gap-1.5 mt-2"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Sync now
              </Button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 pb-20">
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="group flex flex-col bg-card border border-border/40 hover:border-border/80 transition-colors rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Card header */}
                  <div className="px-4 py-3 border-b border-border/30 flex items-start justify-between gap-2 bg-secondary/10">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <CompetitorBadge competitor={article.competitor} />
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{article.blogName}</span>
                        <span className="text-border/50 mx-1">•</span>
                        {format(new Date(article.publishedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors mt-0.5"
                      title="Open article"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* Content */}
                  <div className="px-4 py-4">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-2 mb-2 group-hover:text-primary transition-colors"
                    >
                      <h3 className="text-sm md:text-base font-semibold leading-tight text-foreground/90">
                        {article.title}
                      </h3>
                      <ExternalLink
                        size={13}
                        className="text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      />
                    </a>
                    {article.snippet && (
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {article.snippet}
                      </p>
                    )}
                  </div>
                </article>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 pb-2">
                  <p className="text-xs text-muted-foreground">
                    {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total} articles
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
