import React from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListCompetitors,
  useGetRefreshLogs,
  getListCompetitorsQueryKey,
  getGetRefreshLogsQueryKey,
} from "@workspace/api-client-react";
import { Clock, Calendar, Shield, History, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { data: competitors, isLoading } = useListCompetitors(
    { query: { queryKey: getListCompetitorsQueryKey() } }
  );

  const { data: refreshLogs, isLoading: isLogsLoading } = useGetRefreshLogs(
    { limit: 5 },
    { query: { queryKey: getGetRefreshLogsQueryKey({ limit: 5 }) } }
  );

  const now = new Date();
  const nextSync = new Date();
  nextSync.setUTCHours(2, 0, 0, 0);
  if (nextSync <= now) nextSync.setDate(nextSync.getDate() + 1);
  const hoursUntil = Math.ceil((nextSync.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <Layout>
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur flex items-center px-4 md:px-6 flex-shrink-0">
        <h1 className="font-semibold text-foreground tracking-tight">Settings</h1>
      </header>
      
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-muted/30">
        <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-20">

          {/* Sync Schedule */}
          <Card className="border-border/50 bg-card/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                Sync Schedule
              </CardTitle>
              <CardDescription>Automated daily data collection settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/30">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Daily Sync</p>
                    <p className="text-xs text-muted-foreground">Every day at 07:00 AM PKT (02:00 UTC)</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/30">
                <div>
                  <p className="text-sm font-medium text-foreground">Next Sync</p>
                  <p className="text-xs text-muted-foreground">
                    {nextSync.toLocaleString("en-US", { timeZone: "Asia/Karachi", hour12: true, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PKT
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">in ~{hoursUntil}h</span>
              </div>
            </CardContent>
          </Card>

          {/* Sync History */}
          <Card className="border-border/50 bg-card/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History size={18} className="text-primary" />
                Sync History
              </CardTitle>
              <CardDescription>Last 5 feed refresh operations.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLogsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg bg-border/30" />
                  ))}
                </div>
              ) : refreshLogs?.logs && refreshLogs.logs.length > 0 ? (
                <div className="space-y-2">
                  {refreshLogs.logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-3 bg-secondary/20 rounded-lg border border-border/30 gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {log.status === "completed" ? (
                            <CheckCircle2 size={15} className="text-emerald-400" />
                          ) : log.status === "failed" ? (
                            <AlertTriangle size={15} className="text-destructive" />
                          ) : (
                            <Loader2 size={15} className="text-primary animate-spin" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {log.status === "completed"
                              ? `${log.analyzed ?? 0} new mentions saved`
                              : log.status === "failed"
                              ? "Sync failed"
                              : "Syncing…"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {log.message || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          log.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : log.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        )}>
                          {log.status}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(log.startedAt), "MMM d, HH:mm")}
                        </p>
                        {log.fetched != null && log.fetched > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {log.fetched} fetched
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No sync history yet. Trigger a sync from the Dashboard or wait for the daily cron.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-border/50 bg-card/30">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your alert preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Daily Digest</Label>
                  <p className="text-muted-foreground text-sm">Receive a morning summary of top mentions.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">High-Impact Alerts</Label>
                  <p className="text-muted-foreground text-sm">Immediate notification for tier-1 publisher mentions.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Tracked Competitors — live data */}
          <Card className="border-border/50 bg-card/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                Tracked Brands
              </CardTitle>
              <CardDescription>Live mention counts for the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg bg-border/30" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {competitors?.competitors.map((c) => (
                    <div key={c.slug} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/30">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 rounded-full bg-primary/30"
                          style={{
                            width: `${Math.max(4, Math.min(80, (c.mentionCount / Math.max(1, Math.max(...(competitors?.competitors.map(x => x.mentionCount) ?? [1])))) * 80))}px`,
                          }}
                        />
                        <span className="text-xs font-medium text-foreground w-8 text-right">{c.mentionCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
