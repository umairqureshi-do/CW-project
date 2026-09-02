import React, { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { 
  useGetMentionStats, 
  useGetMentionsByCompetitor,
  useListPublishers,
  useListMentions,
  getGetMentionStatsQueryKey,
  getGetMentionsByCompetitorQueryKey,
  getListPublishersQueryKey,
  getListMentionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { PieChart, Pie, Cell as PieCell } from "recharts";
import { TrendingUp, Zap, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const { data: stats, isLoading: isStatsLoading } = useGetMentionStats(
    { timeRange }, 
    { query: { queryKey: getGetMentionStatsQueryKey({ timeRange }) } }
  );

  const { data: competitorStats, isLoading: isCompetitorStatsLoading } = useGetMentionsByCompetitor(
    { timeRange },
    { query: { queryKey: getGetMentionsByCompetitorQueryKey({ timeRange }) } }
  );

  const { data: publishers, isLoading: isPublishersLoading } = useListPublishers(
    { query: { queryKey: getListPublishersQueryKey() } }
  );

  const mentionParams = { timeRange, limit: 200 };
  const { data: allMentions } = useListMentions(mentionParams, {
    query: { queryKey: getListMentionsQueryKey(mentionParams) },
  });

  const sentimentByCompetitor = useMemo(() => {
    if (!allMentions?.mentions) return [];
    const map = new Map<string, { positive: number; neutral: number; negative: number }>();
    for (const m of allMentions.mentions) {
      if (m.competitor === "Cloudways") continue;
      const entry = map.get(m.competitor) ?? { positive: 0, neutral: 0, negative: 0 };
      if (m.sentiment === "positive") entry.positive++;
      else if (m.sentiment === "negative") entry.negative++;
      else entry.neutral++;
      map.set(m.competitor, entry);
    }
    return Array.from(map.entries())
      .map(([competitor, counts]) => ({ competitor, ...counts }))
      .sort((a, b) => (b.positive + b.neutral + b.negative) - (a.positive + a.neutral + a.negative));
  }, [allMentions]);

  const positiveCount = stats?.bySentiment?.find(s => s.sentiment === "positive")?.count ?? 0;
  const negativeCount = stats?.bySentiment?.find(s => s.sentiment === "negative")?.count ?? 0;
  const neutralCount = stats?.bySentiment?.find(s => s.sentiment === "neutral")?.count ?? 0;

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#06b6d4'];

  return (
    <Layout>
      <header className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
        <h1 className="font-semibold text-foreground tracking-tight">Analytics</h1>
        <div className="flex bg-secondary/30 p-1 rounded-md">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 md:px-4 text-xs py-1.5 rounded-sm font-medium transition-colors ${
                timeRange === r 
                  ? "bg-card text-foreground shadow-sm border border-border/50" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
        <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-20">

          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Mentions", value: stats?.totalMentions ?? 0, icon: <TrendingUp size={16} className="text-muted-foreground" />, color: "text-foreground" },
              { label: "Positive", value: positiveCount, icon: <CheckCircle2 size={16} className="text-emerald-400" />, color: "text-emerald-400" },
              { label: "Negative", value: negativeCount, icon: <AlertTriangle size={16} className="text-red-400" />, color: "text-red-400" },
              { label: "PR Opportunities", value: stats?.opportunityCount ?? 0, icon: <Zap size={16} className="text-primary" />, color: "text-primary" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card/50 border border-border/40 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</span>
                  {kpi.icon}
                </div>
                {isStatsLoading ? (
                  <Skeleton className="h-7 w-16 bg-border/50" />
                ) : (
                  <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Share of Voice */}
            <Card className="border-border/40 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Share of Voice</CardTitle>
                <CardDescription>Mention volume by competitor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {isCompetitorStatsLoading ? (
                    <Skeleton className="w-full h-full rounded-md" />
                  ) : competitorStats?.counts && competitorStats.counts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={competitorStats.counts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="competitor" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{fill: 'hsl(var(--secondary))', opacity: 0.2}}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={40}>
                          {competitorStats.counts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Distribution */}
            <Card className="border-border/40 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Sentiment Distribution</CardTitle>
                <CardDescription>Overall sentiment across all tracked brands</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {isStatsLoading ? (
                    <Skeleton className="w-full h-full rounded-md" />
                  ) : stats?.bySentiment && stats.bySentiment.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.bySentiment}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="sentiment"
                          label={({ sentiment, count }) => `${count}`}
                          labelLine={false}
                        >
                          {stats.bySentiment.map((entry, index) => {
                            let color = '#64748b';
                            if (entry.sentiment === 'positive') color = '#10b981';
                            if (entry.sentiment === 'negative') color = '#ef4444';
                            return <PieCell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs text-muted-foreground">Positive ({positiveCount})</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-500" /><span className="text-xs text-muted-foreground">Neutral ({neutralCount})</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-muted-foreground">Negative ({negativeCount})</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sentiment by Competitor — Stacked Bar */}
          <Card className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Sentiment Breakdown by Competitor</CardTitle>
              <CardDescription>Positive, neutral, and negative mention counts per brand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {sentimentByCompetitor.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sentimentByCompetitor} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="competitor" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
                      <Bar dataKey="positive" stackId="a" fill="#10b981" name="Positive" maxBarSize={28} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="neutral" stackId="a" fill="#64748b" name="Neutral" maxBarSize={28} />
                      <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" maxBarSize={28} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Publishers */}
          <Card className="border-border/40 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Top Publishers</CardTitle>
              <CardDescription>Most active domains tracking competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isPublishersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded" />
                  ))
                ) : publishers?.publishers && publishers.publishers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {publishers.publishers.slice(0, 12).map((pub, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-card border border-border/30 rounded-lg">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">{pub.name}</span>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">{pub.type.replace('_', ' ')}</span>
                        </div>
                        <div className="px-2 py-1 bg-secondary/50 rounded text-xs font-medium text-foreground">
                          {pub.mentionCount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No publishers found</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
