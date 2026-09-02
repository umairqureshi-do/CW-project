import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  useListMentions,
  useGetMentionStats,
  useUpdateMentionStatus,
  getListMentionsQueryKey,
  getGetMentionStatsQueryKey,
  ListMentionsMentionType,
  ListMentionsSentiment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Shield,
  Filter,
  X,
  Eye,
  Zap,
} from "lucide-react";

function CloudwaysLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C8.5 2 5.5 4.1 4.2 7.1C2.3 7.6 1 9.3 1 11.3C1 13.6 2.9 15.5 5.2 15.5H18.8C21.1 15.5 23 13.6 23 11.3C23 9.3 21.7 7.6 19.8 7.1C18.5 4.1 15.5 2 12 2Z"
        fill="currentColor"
      />
      <path d="M8 15.5V21M12 15.5V19M16 15.5V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BRAND = "Cloudways";

export default function CloudwaysPage() {

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [mentionType, setMentionType] = useState<ListMentionsMentionType | "all">("all");
  const [sentiment, setSentiment] = useState<ListMentionsSentiment | "all">("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set());
  const [hideActioned, setHideActioned] = useState(true);

  const queryClient = useQueryClient();
  const statusMutation = useUpdateMentionStatus();

  const statsParams = { timeRange, competitor: BRAND };
  const { data: stats, isLoading: isStatsLoading } = useGetMentionStats(statsParams, {
    query: { queryKey: getGetMentionStatsQueryKey(statsParams) },
  });

  const queryParams = {
    competitor: BRAND,
    timeRange,
    mentionType: mentionType !== "all" ? mentionType : undefined,
    sentiment: sentiment !== "all" ? sentiment : undefined,
    limit: 50,
  };
  const { data: mentionsData, isLoading: isMentionsLoading } = useListMentions(queryParams, {
    query: { queryKey: getListMentionsQueryKey(queryParams) },
  });

  const handleStatusChange = (id: number, status: "read" | "actioned") => {
    statusMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMentionsQueryKey(queryParams) });
        },
      }
    );
  };

  const toggleInsight = (id: number) => {
    setExpandedInsights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute health score from sentiment
  const sentimentMap = Object.fromEntries(
    (stats?.bySentiment ?? []).map((s) => [s.sentiment, s.count])
  );
  const pos = sentimentMap["positive"] ?? 0;
  const neg = sentimentMap["negative"] ?? 0;
  const neu = sentimentMap["neutral"] ?? 0;
  const total = pos + neg + neu;
  const healthScore = total > 0 ? Math.round(((pos + neu * 0.5) / total) * 100) : null;

  const activeFilterCount =
    (mentionType !== "all" ? 1 : 0) + (sentiment !== "all" ? 1 : 0) + (timeRange !== "30d" ? 1 : 0);

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <header className="border-b border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1a6fff]/15 border border-[#1a6fff]/30 flex items-center justify-center text-[#1a6fff] shadow-sm">
                <CloudwaysLogo size={22} />
              </div>
              <div>
                <h1 className="font-bold text-foreground tracking-tight leading-none text-base">Cloudways</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                  Brand Health Monitor
                </p>
              </div>
              {isMentionsLoading && <div className="w-2 h-2 rounded-full bg-primary animate-pulse ml-1" />}
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile filter toggle */}
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "md:hidden h-8 text-xs font-medium border-border/50",
                  mobileFiltersOpen || activeFilterCount > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/20 hover:bg-secondary/50"
                )}
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              >
                <Filter size={13} className="mr-1.5" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold inline-flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

            </div>
          </div>
        </header>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <div className="md:hidden border-b border-border bg-card/30 flex-shrink-0 p-4 space-y-4">
            <div className="flex bg-secondary/30 p-1 rounded-md">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`flex-1 text-xs py-2 rounded-sm font-medium transition-colors ${
                    timeRange === r ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground"
                  }`}
                >{r}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={mentionType} onValueChange={(v: any) => setMentionType(v)}>
                <SelectTrigger className="h-9 text-xs bg-background border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="ranking">Ranking</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sentiment} onValueChange={(v: any) => setSentiment(v)}>
                <SelectTrigger className="h-9 text-xs bg-background border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-2 rounded-lg border border-border/50 text-xs text-muted-foreground flex items-center justify-center gap-1.5"
            >
              <X size={12} /> Close
            </button>
          </div>
        )}

        {/* Brand Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/50 border-b border-border/50 flex-shrink-0">
          {/* Health Score */}
          <div className="bg-card/50 p-3 md:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Health Score</span>
              <Shield size={14} className="text-primary" />
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-6 w-16 bg-border/50" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className={cn("text-lg md:text-xl font-bold tracking-tight", healthScore !== null && healthScore >= 60 ? "text-emerald-400" : healthScore !== null && healthScore >= 40 ? "text-yellow-400" : "text-destructive")}>
                  {healthScore !== null ? `${healthScore}%` : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground">pos+neutral</span>
              </div>
            )}
          </div>

          {/* Total Mentions */}
          <div className="bg-card/50 p-3 md:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Brand Mentions</span>
              <MessageSquare size={14} className="text-muted-foreground" />
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-6 w-16 bg-border/50" />
            ) : (
              <span className="text-lg md:text-xl font-bold tracking-tight text-foreground">{stats?.totalMentions ?? "—"}</span>
            )}
          </div>

          {/* Positive */}
          <div className="bg-card/50 p-3 md:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Positive</span>
              <CheckCircle2 size={14} className="text-emerald-500" />
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-6 w-16 bg-border/50" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg md:text-xl font-bold tracking-tight text-emerald-400">{pos}</span>
                {total > 0 && <span className="text-[10px] text-muted-foreground">{Math.round((pos / total) * 100)}%</span>}
              </div>
            )}
          </div>

          {/* Negative */}
          <div className="bg-card/50 p-3 md:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Negative</span>
              <AlertTriangle size={14} className="text-destructive" />
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-6 w-16 bg-border/50" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-lg md:text-xl font-bold tracking-tight", neg > 0 ? "text-destructive" : "text-foreground")}>{neg}</span>
                {total > 0 && neg > 0 && <span className="text-[10px] text-muted-foreground">{Math.round((neg / total) * 100)}%</span>}
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Bar */}
        {!isStatsLoading && total > 0 && (
          <div className="flex-shrink-0 px-4 md:px-6 py-2 border-b border-border/50 bg-card/10">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider w-20 flex-shrink-0">Sentiment</span>
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-secondary/30 gap-px">
                {pos > 0 && <div className="bg-emerald-500/70 transition-all" style={{ width: `${(pos / total) * 100}%` }} />}
                {neu > 0 && <div className="bg-muted-foreground/40 transition-all" style={{ width: `${(neu / total) * 100}%` }} />}
                {neg > 0 && <div className="bg-destructive/60 transition-all" style={{ width: `${(neg / total) * 100}%` }} />}
              </div>
              <div className="flex items-center gap-3 text-[9px] text-muted-foreground flex-shrink-0">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/70 inline-block"/>Positive</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block"/>Neutral</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/60 inline-block"/>Negative</span>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-3 px-6 py-3 border-b border-border/50 bg-card/20 flex-shrink-0">
          <div className="flex bg-secondary/30 p-0.5 rounded-md gap-0.5">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 text-xs py-1.5 rounded-sm font-medium transition-colors ${
                  timeRange === r ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                }`}
              >{r}</button>
            ))}
          </div>

          <div className="w-px h-5 bg-border/50" />

          <Select value={mentionType} onValueChange={(v: any) => setMentionType(v)}>
            <SelectTrigger className="h-8 w-[150px] text-xs bg-background border-border/50">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
              <SelectItem value="ranking">Ranking</SelectItem>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sentiment} onValueChange={(v: any) => setSentiment(v)}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-background border-border/50">
              <SelectValue placeholder="All Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiment</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            {stats?.topPublishers?.[0] && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp size={13} />
                Top: <span className="text-foreground font-medium">{stats.topPublishers[0].publisher}</span>
              </span>
            )}
            <button
              onClick={() => setHideActioned(!hideActioned)}
              className={cn(
                "h-8 px-3 text-xs rounded-md border font-medium transition-colors",
                hideActioned
                  ? "bg-secondary/30 text-muted-foreground border-border/50 hover:text-foreground"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              )}
              title={hideActioned ? "Actioned items hidden — click to show" : "Showing all including actioned"}
            >
              {hideActioned ? "Hide Actioned" : "Show All"}
            </button>
          </div>
        </div>

        {/* Mentions Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
          {total === 0 && !isMentionsLoading && !isStatsLoading ? (
            <EmptyState />
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 pb-24 md:pb-20">
              {isMentionsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 w-full rounded-xl bg-card/50" />
                  ))
                : mentionsData?.mentions.filter(m => !hideActioned || m.status !== "actioned").map((mention) => {
                    const hasInsight = !!(mention.opportunityInsight || mention.opportunityAngle);
                    const isExpanded = expandedInsights.has(mention.id);
                    const isPositive = mention.sentiment === "positive";
                    const isNegative = mention.sentiment === "negative";

                    return (
                      <div
                        key={mention.id}
                        className={cn(
                          "group flex flex-col bg-card border transition-colors rounded-xl overflow-hidden shadow-sm",
                          isNegative ? "border-destructive/30 hover:border-destructive/60" : "border-border/40 hover:border-border/80"
                        )}
                      >
                        {/* Card header */}
                        <div className="px-4 py-3 border-b border-border/30 flex items-start justify-between gap-2 bg-secondary/10">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <SentimentBadge sentiment={mention.sentiment} />
                            <span className="text-xs text-muted-foreground">
                              <span className="text-foreground font-medium">{mention.publisher}</span>
                              <span className="mx-1 text-border/50">•</span>
                              {format(new Date(mention.publishedAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-medium bg-secondary/30 text-foreground/70 border border-border/50 flex-shrink-0 hidden sm:inline-flex"
                          >
                            {mention.mentionType.replace("_", " ")}
                          </Badge>
                        </div>

                        {/* Content */}
                        <div className="px-4 py-4">
                          <a
                            href={mention.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-start gap-2 mb-2 group-hover:text-primary transition-colors"
                          >
                            <h3 className="text-sm md:text-base font-semibold leading-tight text-foreground/90">
                              {mention.title}
                            </h3>
                            <ExternalLink size={13} className="text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </a>
                          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{mention.snippet}</p>
                        </div>

                        {/* Brand Action Panel — collapsible */}
                        {hasInsight && (
                          <>
                            <button
                              onClick={() => toggleInsight(mention.id)}
                              className={cn(
                                "w-full px-4 py-2.5 border-t flex items-center gap-2 text-left transition-colors",
                                isNegative
                                  ? "bg-destructive/5 border-destructive/15 hover:bg-destructive/10"
                                  : isPositive
                                  ? "bg-emerald-500/5 border-emerald-500/15 hover:bg-emerald-500/8"
                                  : "bg-primary/5 border-primary/10 hover:bg-primary/8"
                              )}
                            >
                              <Megaphone
                                size={14}
                                className={cn(
                                  "flex-shrink-0",
                                  isNegative ? "text-destructive" : isPositive ? "text-emerald-500" : "text-primary"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest",
                                  isNegative ? "text-destructive/80" : isPositive ? "text-emerald-500/80" : "text-primary/80"
                                )}
                              >
                                {isNegative ? "Brand Alert" : isPositive ? "Amplify This" : "Brand Note"}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={14} className="ml-auto text-muted-foreground" />
                              ) : (
                                <ChevronDown size={14} className="ml-auto text-muted-foreground" />
                              )}
                            </button>
                            {isExpanded && (
                              <div
                                className={cn(
                                  "px-4 py-4 space-y-3",
                                  isNegative ? "bg-destructive/5" : isPositive ? "bg-emerald-500/5" : "bg-primary/5"
                                )}
                              >
                                {mention.opportunityInsight && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
                                      Brand Impact
                                    </span>
                                    <p className="text-sm text-foreground/90 leading-snug">{mention.opportunityInsight}</p>
                                  </div>
                                )}
                                {mention.opportunityAngle && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
                                      Recommended Action
                                    </span>
                                    <p className="text-sm font-medium text-foreground">{mention.opportunityAngle}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Status Actions */}
                        <div className="px-4 py-2 border-t border-border/20 flex items-center justify-between gap-2 bg-secondary/5">
                          <div className="flex items-center gap-1.5">
                            {mention.score > 0 && (
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                mention.score >= 70 ? "bg-primary/10 text-primary" :
                                mention.score >= 40 ? "bg-amber-500/10 text-amber-400" :
                                "bg-secondary/40 text-muted-foreground"
                              )}>
                                Score {mention.score}
                              </span>
                            )}
                            {mention.status !== "unread" && (
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                mention.status === "actioned" ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary/40 text-muted-foreground"
                              )}>
                                {mention.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {mention.status !== "read" && mention.status !== "actioned" && (
                              <button
                                onClick={() => handleStatusChange(mention.id, "read")}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary/50 transition-colors"
                                title="Mark as read"
                              >
                                <Eye size={12} />
                                <span className="hidden sm:inline">Read</span>
                              </button>
                            )}
                            {mention.status !== "actioned" && (
                              <button
                                onClick={() => handleStatusChange(mention.id, "actioned")}
                                className="flex items-center gap-1 text-[10px] text-emerald-500/70 hover:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors"
                                title="Mark as actioned"
                              >
                                <Zap size={12} />
                                <span className="hidden sm:inline">Actioned</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === "positive")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={10} /> Positive
      </span>
    );
  if (sentiment === "negative")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full">
        <AlertTriangle size={10} /> Negative
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-secondary/40 border border-border/40 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 inline-block" /> Neutral
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-full bg-[#1a6fff]/10 border border-[#1a6fff]/20 flex items-center justify-center mb-5 text-[#1a6fff]/60">
        <CloudwaysLogo size={28} />
      </div>
      <h3 className="font-semibold text-foreground text-base mb-2">No Cloudways mentions yet</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Brand mentions are fetched automatically every morning at 7:00 AM PKT. Check back after the next scheduled sync, or adjust your time range filter above.
      </p>
    </div>
  );
}
