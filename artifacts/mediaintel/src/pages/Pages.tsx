import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  useListCompetitorPages,
  useGetCompetitorPagesStats,
  useGetCompetitorPagesRefreshLogs,
  useRefreshCompetitorPages,
  useListTrackedPageCompetitors,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw, ExternalLink, Globe, Clock, Search, FileText,
  ChevronDown, ChevronUp, Sparkles, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Locale utilities ─────────────────────────────────────────────────────────

/** Convert a locale code to a flag emoji (regional indicator symbols) */
function localeToFlag(locale: string): string {
  // Take the country part of composite codes (ch-fr → CH, in-hi → IN)
  const cc = locale.split("-")[0].toUpperCase();
  // Hostinger uses "uk" to mean Great Britain
  const OVERRIDES: Record<string, string> = { UK: "GB" };
  const code = OVERRIDES[cc] ?? cc;
  if (code.length !== 2) return "🌐";
  return [...code]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1f1e6))
    .join("");
}

/** Human-readable locale name */
const LOCALE_NAMES: Record<string, string> = {
  ae: "UAE", lt: "Lithuania", de: "Germany", fr: "France", es: "Spain",
  pt: "Portugal", id: "Indonesia", tr: "Turkey", ng: "Nigeria",
  uk: "United Kingdom", my: "Malaysia", ph: "Philippines", vn: "Vietnam",
  th: "Thailand", pl: "Poland", nl: "Netherlands", it: "Italy",
  br: "Brazil", mx: "Mexico", ar: "Argentina", co: "Colombia",
  ro: "Romania", hu: "Hungary", sk: "Slovakia", hr: "Croatia",
  bg: "Bulgaria", rs: "Serbia", ua: "Ukraine", pk: "Pakistan",
  bd: "Bangladesh", ca: "Canada", au: "Australia", at: "Austria",
  be: "Belgium", in: "India", ru: "Russia", jp: "Japan",
  kr: "South Korea", cn: "China", il: "Israel", sa: "Saudi Arabia",
  eg: "Egypt", za: "South Africa", ke: "Kenya", gh: "Ghana",
  "ch-de": "Switzerland (DE)", "ch-fr": "Switzerland (FR)",
  "in-hi": "India (Hindi)", "be-nl": "Belgium (NL)",
  "be-fr": "Belgium (FR)", "ch-it": "Switzerland (IT)",
};

function localeName(locale: string): string {
  return LOCALE_NAMES[locale] ?? locale.toUpperCase();
}

/** Extract locale code from a URL's first path segment */
function getLocaleFromUrl(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    if (segments.length > 0 && /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(segments[0])) {
      return segments[0];
    }
  } catch {}
  return null;
}

// Debounce helper for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const COMPETITOR_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Hostinger: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  Kinsta: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-600 dark:bg-slate-400" },
  "WP Engine": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  Bluehost: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500" },
  SiteGround: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
};

const PAGE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  // High-value competitive intelligence types
  comparison:  { bg: "bg-red-100 dark:bg-red-900/30",     text: "text-red-700 dark:text-red-400" },
  migration:   { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
  product:     { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-400" },
  coupon:      { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-500" },
  affiliate:   { bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-700 dark:text-amber-400" },
  // Structural types
  blog:        { bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-400" },
  pricing:     { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  feature:     { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
  solution:    { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400" },
  case_study:  { bg: "bg-pink-100 dark:bg-pink-900/30",    text: "text-pink-700 dark:text-pink-400" },
  landing:     { bg: "bg-rose-100 dark:bg-rose-900/30",    text: "text-rose-700 dark:text-rose-400" },
  changelog:   { bg: "bg-teal-100 dark:bg-teal-900/30",   text: "text-teal-700 dark:text-teal-400" },
  docs:        { bg: "bg-gray-100 dark:bg-gray-800",       text: "text-gray-700 dark:text-gray-300" },
  partner:     { bg: "bg-cyan-100 dark:bg-cyan-900/30",    text: "text-cyan-700 dark:text-cyan-400" },
  agency:      { bg: "bg-sky-100 dark:bg-sky-900/30",      text: "text-sky-700 dark:text-sky-400" },
  application: { bg: "bg-lime-100 dark:bg-lime-900/30",    text: "text-lime-700 dark:text-lime-600" },
  legal:       { bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-600 dark:text-slate-400" },
  company:     { bg: "bg-neutral-100 dark:bg-neutral-800", text: "text-neutral-700 dark:text-neutral-300" },
  main:        { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30", text: "text-fuchsia-700 dark:text-fuchsia-400" },
  template:    { bg: "bg-green-100 dark:bg-green-900/30",   text: "text-green-700 dark:text-green-500" },
  localized:   { bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-500 dark:text-slate-500" },
  page:        { bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-500 dark:text-slate-500" },
};

type QuickFilter = "all" | "new" | "recently_changed";

function PageSkeleton() {
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

function PageTypeBadge({ type, url }: { type: string; url?: string }) {
  const colors = PAGE_TYPE_COLORS[type.toLowerCase()] ?? { bg: "bg-muted", text: "text-muted-foreground" };
  const locale = type === "localized" && url ? getLocaleFromUrl(url) : null;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-semibold flex-shrink-0", colors.bg, colors.text)}>
      {locale && (
        <span className="text-[13px] leading-none not-italic normal-case" title={localeName(locale)}>
          {localeToFlag(locale)}
        </span>
      )}
      {locale ? locale.toUpperCase() : type.replace(/_/g, " ")}
    </span>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
      <Sparkles size={9} />
      New
    </span>
  );
}

/** Top locale markets panel shown in the stats area */
function LocaleMarketsPanel({
  localeStats,
  selectedLocale,
  onSelectLocale,
}: {
  localeStats: { locale: string; count: number }[];
  selectedLocale: string | null;
  onSelectLocale: (locale: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? localeStats : localeStats.slice(0, 12);

  if (localeStats.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">Localized markets</span>
        {selectedLocale && (
          <button
            onClick={() => onSelectLocale(null)}
            className="text-[10px] text-primary underline underline-offset-2 hover:no-underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(({ locale, count }) => {
          const isActive = selectedLocale === locale;
          return (
            <button
              key={locale}
              onClick={() => onSelectLocale(isActive ? null : locale)}
              title={localeName(locale)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all",
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span className="text-[14px] leading-none">{localeToFlag(locale)}</span>
              <span className="text-[11px] font-semibold tracking-wide uppercase">{locale}</span>
              <span className={cn("text-[10px] tabular-nums", isActive ? "opacity-70" : "opacity-50")}>
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
        {localeStats.length > 12 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {expanded ? (
              <><ChevronUp size={12} /> less</>
            ) : (
              <><ChevronDown size={12} /> +{localeStats.length - 12} more</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function getDisplayTitle(title: string, url: string) {
  if (title && title.trim() !== "") return title;
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/" ? parsed.hostname : parsed.pathname;
  } catch (e) {
    return url;
  }
}

export default function Pages() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("new");
  const debouncedSearch = useDebounce(inputValue, 400);

  const limit = 50;

  // Reset page when filters change; clear locale when leaving localized type
  useEffect(() => {
    setPage(0);
  }, [selectedCompetitor, selectedType, selectedLocale, debouncedSearch, quickFilter]);

  useEffect(() => {
    if (selectedType !== "localized" && selectedType !== "All") {
      setSelectedLocale(null);
    }
  }, [selectedType]);

  const params = {
    limit,
    offset: page * limit,
    ...(selectedCompetitor !== "All" && { competitor: selectedCompetitor }),
    ...(selectedType !== "All" && { pageType: selectedType as any }),
    ...(selectedLocale && { locale: selectedLocale }),
    ...(debouncedSearch && { q: debouncedSearch }),
    ...(quickFilter === "new" && { newOnly: true }),
    ...(quickFilter === "recently_changed" && { recentlyChanged: true }),
  };

  // Auto-switch to localized type when a locale is selected
  const handleSelectLocale = (locale: string | null) => {
    setSelectedLocale(locale);
    if (locale && selectedType !== "localized") setSelectedType("localized");
  };

  const { data, isLoading } = useListCompetitorPages(params);
  const { data: stats } = useGetCompetitorPagesStats();
  const { data: logsData } = useGetCompetitorPagesRefreshLogs({ limit: 1 });
  const { data: competitorsData } = useListTrackedPageCompetitors();

  const { mutate: triggerRefresh, isPending: isRefreshing } = useRefreshCompetitorPages({
    mutation: {
      onSuccess: () => {
        setTimeout(() => {
          queryClient.invalidateQueries();
        }, 3000);
      },
    },
  });

  const pages = data?.pages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const lastLog = logsData?.logs?.[0];
  const lastSynced = lastLog?.completedAt ? new Date(lastLog.completedAt) : null;
  const trackedCompetitors = competitorsData?.competitors ?? ["Hostinger", "SiteGround", "Kinsta", "WP Engine", "Bluehost"];
  const newCount = (stats as any)?.newCount ?? null;

  // Page types ordered by competitive intelligence value
  const pageTypes = [
    // High-value intel
    "comparison", "migration", "product", "coupon", "affiliate",
    // Content
    "blog", "pricing", "feature", "solution", "case_study", "landing",
    // Structural
    "changelog", "docs", "application", "template", "agency", "partner",
    "company", "main", "legal", "localized", "page",
  ];

  const quickFilters: { id: QuickFilter; label: string; icon: React.ReactNode; count?: number | null }[] = [
    { id: "new", label: "New pages", icon: <Sparkles size={12} />, count: newCount },
    { id: "recently_changed", label: "Recently changed", icon: <TrendingUp size={12} /> },
    { id: "all", label: "All pages", icon: null },
  ];

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Globe size={18} className="text-primary" />
                <h1 className="text-lg font-semibold tracking-tight">Competitor Pages</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Sitemap tracker across {stats?.competitors ?? trackedCompetitors.length} tracked competitors
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
                {isRefreshing ? "Syncing..." : "Sync now"}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Total pages:</span>
                  <span className="font-medium tabular-nums">
                    {stats.byCompetitor.reduce((s, c) => s + c.count, 0)}
                  </span>
                </div>

                {newCount !== null && newCount > 0 && (
                  <>
                    <div className="w-px h-4 bg-border/50 self-center hidden sm:block" />
                    <button
                      onClick={() => setQuickFilter("new")}
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        quickFilter === "new" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Sparkles size={13} className="text-emerald-500" />
                      <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">{newCount}</span>
                      <span>new since last sync</span>
                    </button>
                  </>
                )}

                <div className="w-px h-4 bg-border/50 self-center hidden sm:block" />
                {stats.byCompetitor.map((c) => {
                  const colors = COMPETITOR_COLORS[c.competitor] ?? { dot: "bg-muted-foreground" };
                  const isBlocked = (stats as any).blockedCompetitors?.includes(c.competitor);
                  return (
                    <div key={c.competitor} className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", colors.dot)} />
                      <span className="text-muted-foreground">{c.competitor}</span>
                      <span className="font-medium tabular-nums">{c.count}</span>
                      {isBlocked && (
                        <span title="Sitemap blocked by bot protection — pages may be incomplete" className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full leading-none">
                          ⚠ blocked
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* Show blocked competitors that have 0 pages (not in byCompetitor) */}
                {(stats as any).blockedCompetitors?.filter((bc: string) => !stats.byCompetitor.find(c => c.competitor === bc)).map((bc: string) => (
                  <div key={bc} className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", COMPETITOR_COLORS[bc]?.dot ?? "bg-muted-foreground")} />
                    <span className="text-muted-foreground">{bc}</span>
                    <span className="font-medium tabular-nums">0</span>
                    <span title="Sitemap blocked by bot protection" className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full leading-none">
                      ⚠ blocked
                    </span>
                  </div>
                ))}
              </div>

              {/* Locale markets panel */}
              {(stats as any).localeStats && (stats as any).localeStats.length > 0 && (
                <LocaleMarketsPanel
                  localeStats={(stats as any).localeStats}
                  selectedLocale={selectedLocale}
                  onSelectLocale={handleSelectLocale}
                />
              )}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex-shrink-0 border-b border-border bg-card px-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="search"
                placeholder="Search URLs and titles..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
              />
            </div>

            <div className="w-px h-5 bg-border/50 hidden sm:block" />

            {/* Quick filters (New / Recently changed / All) */}
            <div className="flex gap-1">
              {quickFilters.map((qf) => (
                <button
                  key={qf.id}
                  onClick={() => setQuickFilter(qf.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    quickFilter === qf.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {qf.icon}
                  {qf.label}
                  {qf.count !== undefined && qf.count !== null && qf.count > 0 && (
                    <span className={cn("ml-0.5 tabular-nums", quickFilter === qf.id ? "opacity-80" : "opacity-60")}>
                      {qf.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border/50 hidden sm:block" />

            {/* Competitor filter */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1 sm:py-0">
              {(["All", ...trackedCompetitors]).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCompetitor(c)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    selectedCompetitor === c
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Page Type filter */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
            <span className="text-xs text-muted-foreground font-medium pr-2 border-r border-border/50">Types</span>
            {(["All", ...pageTypes]).map((pt) => {
              const count = stats?.byPageType?.find((s) => s.pageType === pt)?.count;
              return (
                <button
                  key={pt}
                  onClick={() => setSelectedType(pt)}
                  className={cn(
                    "flex-shrink-0 px-2 py-1 rounded-sm text-[11px] uppercase tracking-wider font-semibold transition-colors",
                    selectedType === pt
                      ? "bg-foreground text-background"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {pt.replace("_", " ")}
                  {pt !== "All" && count !== undefined && (
                    <span className="ml-1.5 opacity-60 normal-case tracking-normal tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data list (Table) */}
        <div className="flex-1 overflow-auto bg-muted/20 relative">
          {isLoading ? (
            <div className="p-6 space-y-4 max-w-5xl mx-auto">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-6">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-2 text-muted-foreground">
                {quickFilter === "new" ? <Sparkles size={28} /> : quickFilter === "recently_changed" ? <TrendingUp size={28} /> : <FileText size={28} />}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {quickFilter === "new"
                    ? "No new pages since last sync"
                    : quickFilter === "recently_changed"
                    ? "No recently changed pages"
                    : "No pages found"}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {quickFilter === "new"
                    ? "New pages discovered during the most recent sync will appear here."
                    : quickFilter === "recently_changed"
                    ? "Pages with a lastmod date updated in the last 7 days will appear here."
                    : debouncedSearch || selectedCompetitor !== "All" || selectedType !== "All"
                    ? "Try adjusting your filters or search query."
                    : "The page database is empty. Run a sync to discover competitor pages from their sitemaps."}
                </p>
              </div>
              {quickFilter === "new" || quickFilter === "recently_changed" ? (
                <Button size="sm" variant="outline" onClick={() => setQuickFilter("all")} className="mt-2">
                  View all pages
                </Button>
              ) : (
                (!debouncedSearch && selectedCompetitor === "All" && selectedType === "All") && (
                  <Button
                    onClick={() => triggerRefresh()}
                    disabled={isRefreshing}
                    className="gap-2 mt-4"
                  >
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                    Run first sync
                  </Button>
                )
              )}
            </div>
          ) : (
            <div className="min-w-[800px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur shadow-[0_1px_0_var(--color-border)]">
                  <tr className="text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-medium">Page Title & URL</th>
                    <th className="py-3 px-4 font-medium w-40">Competitor</th>
                    <th className="py-3 px-4 font-medium w-32">Type</th>
                    <th className="py-3 px-4 font-medium w-36">Last Modified</th>
                    <th className="py-3 px-4 font-medium w-36">First Seen</th>
                    <th className="py-3 px-6 font-medium w-16 text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm bg-card">
                  {pages.map((p) => (
                    <tr
                      key={p.id}
                      className={cn(
                        "hover:bg-muted/40 transition-colors group",
                        (p as any).isNew && "bg-emerald-50/50 dark:bg-emerald-950/10"
                      )}
                    >
                      <td className="py-3 px-6 max-w-md">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-foreground/90 truncate" title={p.title || p.url}>
                              {getDisplayTitle(p.title, p.url)}
                            </span>
                            {(p as any).isNew && <NewBadge />}
                          </div>
                          <span className="text-xs text-muted-foreground truncate" title={p.url}>
                            {p.url}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <CompetitorBadge competitor={p.competitor} />
                      </td>
                      <td className="py-3 px-4">
                        <PageTypeBadge type={p.pageType} url={p.url} />
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {p.lastmod ? format(new Date(p.lastmod), "MMM d, yyyy") : "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(p.firstSeenAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Open page"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Foot */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/50 bg-background sticky bottom-0 z-10">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} pages
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
