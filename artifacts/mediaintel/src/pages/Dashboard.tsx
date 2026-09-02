import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  useListMentions,
  useGetMentionStats,
  useListCompetitors,
  useGetRecentActivity,
  useUpdateMentionStatus,
  getListMentionsQueryKey,
  getGetMentionStatsQueryKey,
  getListCompetitorsQueryKey,
  getGetRecentActivityQueryKey,
  ListMentionsMentionType,
  ListMentionsSentiment,
  ListMentionsSortBy,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Search,
  Filter,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Zap,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function Dashboard() {

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [mentionType, setMentionType] = useState<ListMentionsMentionType | "all">("all");
  const [sentiment, setSentiment] = useState<ListMentionsSentiment | "all">("all");
  const [sortBy, setSortBy] = useState<ListMentionsSortBy>("date");
  const [hideActioned, setHideActioned] = useState(true);

  // Mobile-specific state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();
  const statusMutation = useUpdateMentionStatus();

  const { data: stats, isLoading: isStatsLoading } = useGetMentionStats(
    { timeRange },
    { query: { queryKey: getGetMentionStatsQueryKey({ timeRange }) } }
  );

  const { data: competitors, isLoading: isCompetitorsLoading } = useListCompetitors(
    { query: { queryKey: getListCompetitorsQueryKey() } }
  );

  const queryParams = {
    timeRange,
    competitor: selectedCompetitor,
    mentionType: mentionType !== "all" ? mentionType : undefined,
    sentiment: sentiment !== "all" ? sentiment : undefined,
    sortBy,
    limit: 50,
  };

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

  const { data: mentionsData, isLoading: isMentionsLoading } = useListMentions(queryParams, {
    query: { queryKey: getListMentionsQueryKey(queryParams) },
  });

  const { data: recentActivity, isLoading: isRecentActivityLoading } = useGetRecentActivity(
    { limit: 5 },
    { query: { queryKey: getGetRecentActivityQueryKey({ limit: 5 }) } }
  );

  const toggleInsight = (id: number) => {
    setExpandedInsights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFilterCount =
    (selectedCompetitor ? 1 : 0) +
    (mentionType !== "all" ? 1 : 0) +
    (sentiment !== "all" ? 1 : 0) +
    (timeRange !== "30d" ? 1 : 0);

  const filteredMentions = mentionsData?.mentions.filter(
    (m) =>
      (!hideActioned || m.status !== "actioned") &&
      (!search ||
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.publisher.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex h-full w-full">
        {/* ── Desktop Left Sidebar ── */}
        <div className="hidden md:flex w-64 border-r border-border bg-card/20 flex-col flex-shrink-0 z-10">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground mb-4">
              Time Range
            </h2>
            <div className="flex bg-secondary/30 p-1 rounded-md">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`flex-1 text-xs py-1.5 rounded-sm font-medium transition-colors ${
                    timeRange === r
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
                Competitors
              </h2>
              {selectedCompetitor && (
                <button
                  onClick={() => setSelectedCompetitor(undefined)}
                  className="text-[10px] text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-1 mb-8">
              {isCompetitorsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded" />
                  ))
                : competitors?.competitors.map((comp) => (
                    <button
                      key={comp.slug}
                      onClick={() =>
                        setSelectedCompetitor(comp.name === selectedCompetitor ? undefined : comp.name)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCompetitor === comp.name
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <span className="truncate pr-2">{comp.name}</span>
                      <span
                        className={`text-xs ${
                          selectedCompetitor === comp.name ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {comp.mentionCount}
                      </span>
                    </button>
                  ))}
            </div>

            <div className="mb-4">
              <h2 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-2 mb-3">
                <Clock size={12} />
                Live Feed
              </h2>
              <div className="space-y-3">
                {isRecentActivityLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded" />
                    ))
                  : recentActivity?.mentions.map((activity) => (
                      <div key={activity.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                        <div className="font-medium text-foreground/90 truncate">{activity.competitor}</div>
                        <div className="text-muted-foreground truncate">{activity.publisher}</div>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Feed Surface ── */}
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-foreground tracking-tight">Intelligence Feed</h1>
              {isMentionsLoading && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </div>
            <div className="flex items-center gap-2">
              {/* Search — desktop only */}
              <div className="relative w-56 hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  placeholder="Search mentions..."
                  className="h-8 text-sm pl-8 bg-background border-border/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

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
          </header>

          {/* ── Mobile Filter Drawer ── */}
          {mobileFiltersOpen && (
            <div className="md:hidden border-b border-border bg-card/30 flex-shrink-0 overflow-y-auto max-h-[60vh]">
              <div className="p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input
                    placeholder="Search mentions..."
                    className="h-9 text-sm pl-8 bg-background border-border/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Time Range */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Time Range
                  </p>
                  <div className="flex bg-secondary/30 p-1 rounded-md">
                    {(["7d", "30d", "90d"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`flex-1 text-xs py-2 rounded-sm font-medium transition-colors ${
                          timeRange === r
                            ? "bg-card text-foreground shadow-sm border border-border/50"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Competitors */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Competitor
                    </p>
                    {selectedCompetitor && (
                      <button
                        onClick={() => setSelectedCompetitor(undefined)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isCompetitorsLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-7 w-20 rounded-full" />
                        ))
                      : competitors?.competitors.map((comp) => (
                          <button
                            key={comp.slug}
                            onClick={() =>
                              setSelectedCompetitor(
                                comp.name === selectedCompetitor ? undefined : comp.name
                              )
                            }
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                              selectedCompetitor === comp.name
                                ? "bg-primary/15 text-primary border-primary/30"
                                : "bg-secondary/30 text-muted-foreground border-border/50 hover:text-foreground"
                            )}
                          >
                            {comp.name}{" "}
                            <span className="opacity-60">{comp.mentionCount}</span>
                          </button>
                        ))}
                  </div>
                </div>

                {/* Type & Sentiment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Type
                    </p>
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
                        <SelectItem value="customer_story">Customer Story</SelectItem>
                        <SelectItem value="sponsored">Sponsored</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Sentiment
                    </p>
                    <Select value={sentiment} onValueChange={(v: any) => setSentiment(v)}>
                      <SelectTrigger className="h-9 text-xs bg-background border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full py-2 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                >
                  <X size={12} /> Close Filters
                </button>
              </div>
            </div>
          )}

          {/* Stats Strip — 2×2 on mobile, 4-col on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/50 border-b border-border/50 flex-shrink-0">
            <StatBox
              label="Total Mentions"
              value={stats?.totalMentions}
              isLoading={isStatsLoading}
              icon={<MessageSquare size={14} className="text-muted-foreground" />}
            />
            <StatBox
              label="PR Opportunities"
              value={stats?.opportunityCount}
              isLoading={isStatsLoading}
              icon={<Lightbulb size={14} className="text-primary" />}
              valueClassName="text-primary"
            />
            <StatBox
              label="Top Competitor"
              value={stats?.byCompetitor?.[0]?.competitor || "None"}
              subValue={
                stats?.byCompetitor?.[0]?.count
                  ? `${stats.byCompetitor[0].count} mentions`
                  : undefined
              }
              isLoading={isStatsLoading}
              icon={<TrendingUp size={14} className="text-muted-foreground" />}
            />
            <StatBox
              label="Top Publisher"
              value={stats?.topPublishers?.[0]?.publisher || "None"}
              isLoading={isStatsLoading}
              icon={<Activity size={14} className="text-muted-foreground" />}
            />
          </div>

          {/* Inline Filters — desktop only */}
          <div className="hidden md:flex items-center gap-3 px-6 py-3 border-b border-border/50 bg-card/20 flex-shrink-0">
            <Filter size={14} className="text-muted-foreground" />
            <Select value={mentionType} onValueChange={(v: any) => setMentionType(v)}>
              <SelectTrigger className="h-8 w-[160px] text-xs bg-background border-border/50">
                <SelectValue placeholder="Mention Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="comparison">Comparison</SelectItem>
                <SelectItem value="ranking">Ranking</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="customer_story">Customer Story</SelectItem>
                <SelectItem value="sponsored">Sponsored</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sentiment} onValueChange={(v: any) => setSentiment(v)}>
              <SelectTrigger className="h-8 w-[140px] text-xs bg-background border-border/50">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
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
              <Star size={13} className="text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-background border-border/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Latest First</SelectItem>
                  <SelectItem value="score">Highest Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Feed Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30 relative">
            <div className="max-w-4xl mx-auto space-y-4 pb-24 md:pb-20">
              {isMentionsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl bg-card/50" />
                ))
              ) : filteredMentions?.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4 border border-border/50">
                    <MessageSquare className="text-muted-foreground" size={20} />
                  </div>
                  <h3 className="text-foreground font-medium mb-1">No mentions found</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Try adjusting your filters or syncing the feeds to pull in the latest data.
                  </p>
                </div>
              ) : (
                filteredMentions?.map((mention) => {
                  const hasInsight = !!(mention.opportunityInsight || mention.opportunityAngle);
                  const isExpanded = expandedInsights.has(mention.id);

                  return (
                    <div
                      key={mention.id}
                      className="group flex flex-col bg-card border border-border/40 hover:border-border/80 transition-colors rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Card Header */}
                      <div className="px-4 py-3 border-b border-border/30 flex items-start justify-between gap-2 bg-secondary/10">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] uppercase tracking-wider border-primary/20 text-primary bg-primary/5 flex-shrink-0"
                          >
                            {mention.competitor}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            <span className="text-foreground">{mention.publisher}</span>
                            <span className="text-border/50 mx-1">•</span>
                            {format(new Date(mention.publishedAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <SentimentIndicator sentiment={mention.sentiment} />
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-medium bg-secondary/30 text-foreground/80 border border-border/50 hidden sm:inline-flex"
                          >
                            {mention.mentionType.replace("_", " ")}
                          </Badge>
                        </div>
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
                          <ExternalLink
                            size={13}
                            className="text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          />
                        </a>
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                          {mention.snippet}
                        </p>
                      </div>

                      {/* AI Insight — collapsible on all screen sizes */}
                      {hasInsight && (
                        <>
                          <button
                            onClick={() => toggleInsight(mention.id)}
                            className="w-full px-4 py-2.5 bg-primary/5 border-t border-primary/10 flex items-center gap-2 text-left hover:bg-primary/8 transition-colors"
                          >
                            <Lightbulb size={15} className="text-primary flex-shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                              AI Insight
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={14} className="ml-auto text-muted-foreground" />
                            ) : (
                              <ChevronDown size={14} className="ml-auto text-muted-foreground" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 py-4 bg-primary/5 space-y-3">
                              {mention.opportunityInsight && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80 mb-1 block">
                                    Insight
                                  </span>
                                  <p className="text-sm text-foreground/90 leading-snug">
                                    {mention.opportunityInsight}
                                  </p>
                                </div>
                              )}
                              {mention.opportunityAngle && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80 mb-1 block">
                                    Suggested Angle
                                  </span>
                                  <p className="text-sm font-medium text-foreground">
                                    {mention.opportunityAngle}
                                  </p>
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
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatBox({
  label,
  value,
  subValue,
  isLoading,
  icon,
  valueClassName = "text-foreground",
}: {
  label: string;
  value?: string | number;
  subValue?: string;
  isLoading: boolean;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="bg-card/50 p-3 md:p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1.5 md:mb-2">
        <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
          {label}
        </span>
        {icon}
      </div>
      {isLoading ? (
        <Skeleton className="h-6 w-16 bg-border/50" />
      ) : (
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`text-lg md:text-xl font-bold tracking-tight leading-tight ${valueClassName}`}>
            {value ?? "-"}
          </span>
          {subValue && (
            <span className="text-[10px] text-muted-foreground font-medium">{subValue}</span>
          )}
        </div>
      )}
    </div>
  );
}

function SentimentIndicator({ sentiment }: { sentiment: string }) {
  const map: Record<string, { icon: React.ReactNode; class: string; label: string }> = {
    positive: { icon: <CheckCircle2 size={12} />, class: "text-emerald-500", label: "Positive" },
    negative: { icon: <AlertTriangle size={12} />, class: "text-destructive", label: "Negative" },
    neutral: {
      icon: <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />,
      class: "text-muted-foreground",
      label: "Neutral",
    },
  };
  const config = map[sentiment] || map.neutral;

  return (
    <div className={`flex items-center gap-1.5 ${config.class}`} title={config.label}>
      {config.icon}
    </div>
  );
}
