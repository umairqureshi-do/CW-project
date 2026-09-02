import { useState } from "react";

const COMPETITORS = [
  { name: "WP Engine", count: 15 },
  { name: "Kinsta", count: 5 },
  { name: "Hostinger", count: 22 },
  { name: "GoDaddy", count: 22 },
  { name: "Bluehost", count: 9 },
  { name: "Pagely", count: 1 },
  { name: "Flywheel", count: 3 },
];

const MENTIONS = [
  { id: 1, competitor: "HOSTINGER", publisher: "TechCrunch", date: "Apr 28", type: "REVIEW", title: "Hostinger Review 2024: Is It Worth the Low Price?", snippet: "Hostinger's ultra-low price has made it the go-to for budget-conscious bloggers.", insight: "Hostinger praised for low price but dinged on performance — pitch Cloudways managed performance at a still-competitive price." },
  { id: 2, competitor: "WP ENGINE", publisher: "Search Engine Journal", date: "Apr 28", type: "COMPARISON", title: "Best WordPress Hosting for SEO in 2024", snippet: "WP Engine sits at the premium end, but its staging and dev tools justify the cost for agencies.", insight: "WP Engine positioned as a premium agency tool — Cloudways can win on price-performance for growing agencies." },
  { id: 3, competitor: "GODADDY", publisher: "Ars Technica", date: "Apr 27", type: "NEWS", title: "GoDaddy data breach exposes customer info again", snippet: "For the third time in recent years, GoDaddy confirmed a security incident affecting hosting customers.", insight: "GoDaddy security narrative is negative — opportunity for Cloudways to push security and reliability angle." },
];

export default function MobileRedesign() {
  const [tab, setTab] = useState<"feed" | "analytics" | "settings">("feed");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const filtered = selectedComp
    ? MENTIONS.filter(m => m.competitor.toLowerCase().includes(selectedComp.toLowerCase()))
    : MENTIONS;

  return (
    <div
      className="flex flex-col h-screen bg-[#0a0c10] text-white overflow-hidden"
      style={{ width: 390, margin: "0 auto", fontFamily: "'Inter', sans-serif", fontSize: 14 }}
    >
      {/* TOP HEADER — full width, no sidebar eating space */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-white/10 bg-[#111318] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white text-xs">⚡</div>
          <span className="font-bold text-base tracking-tight">MediaIntel</span>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse ml-1" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-8 px-3 rounded-lg border text-xs font-medium transition-colors ${showFilters ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "border-white/20 text-white/70 bg-white/5"}`}
          >
            ▼ Filter
            {selectedComp && <span className="ml-1 w-4 h-4 bg-blue-500 rounded-full inline-flex items-center justify-center text-[9px] text-white">1</span>}
          </button>
          <button className="h-8 px-3 rounded-lg border border-white/20 text-xs text-white/70 bg-white/5 whitespace-nowrap">↻ Sync</button>
        </div>
      </header>

      {/* FILTER DRAWER — slides down from header */}
      {showFilters && (
        <div className="bg-[#111318] border-b border-white/10 px-4 py-3 flex-shrink-0">
          {/* Time range */}
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Time Range</div>
            <div className="flex bg-white/5 p-0.5 rounded-lg gap-0.5">
              {["7d", "30d", "90d"].map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${timeRange === r ? "bg-white/15 text-white" : "text-white/40"}`}
                >{r}</button>
              ))}
            </div>
          </div>
          {/* Competitors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Competitor</div>
              {selectedComp && <button onClick={() => setSelectedComp(null)} className="text-[10px] text-blue-400">Clear</button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMPETITORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => setSelectedComp(selectedComp === c.name ? null : c.name)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${selectedComp === c.name ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" : "bg-white/8 text-white/60 border border-white/10"}`}
                >
                  {c.name} <span className="opacity-60">{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATS STRIP — 2×2 grid, readable on mobile */}
      <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/10 flex-shrink-0">
        {[
          { label: "Total Mentions", value: "93", icon: "💬" },
          { label: "PR Opportunities", value: "93", icon: "💡", accent: true },
          { label: "Top Competitor", value: "Flywheel", sub: "23 mentions", icon: "📈" },
          { label: "Top Publisher", value: "Bringatrailer", icon: "📰" },
        ].map((s, i) => (
          <div key={i} className="bg-[#0f1117] px-3 py-3">
            <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">{s.icon} {s.label}</div>
            <div className={`text-lg font-bold leading-tight ${s.accent ? "text-blue-400" : "text-white"}`}>{s.value}</div>
            {s.sub && <div className="text-[10px] text-white/40">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* FEED — scrollable, full width */}
      <div className="flex-1 overflow-y-auto bg-[#0a0c10]">
        <div className="p-3 space-y-3 pb-20">
          {filtered.map(m => (
            <div key={m.id} className="bg-[#111318] rounded-xl border border-white/10 overflow-hidden">
              {/* Card header */}
              <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between bg-white/3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-bold tracking-widest text-blue-400 border border-blue-400/25 px-1.5 py-0.5 rounded bg-blue-500/5 flex-shrink-0">{m.competitor}</span>
                  <span className="text-xs text-white/50 truncate">{m.publisher}</span>
                  <span className="text-[10px] text-white/25 flex-shrink-0">{m.date}</span>
                </div>
                <span className="text-[9px] uppercase font-semibold text-white/40 border border-white/10 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">{m.type}</span>
              </div>

              {/* Title & snippet */}
              <div className="px-4 py-3">
                <h3 className="text-sm font-semibold leading-snug text-white/90 mb-1.5">{m.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{m.snippet}</p>
              </div>

              {/* AI insight — collapsible */}
              <button
                className="w-full px-4 py-2.5 bg-blue-500/6 border-t border-blue-500/15 flex items-center gap-2 text-left"
                onClick={() => setExpandedInsight(expandedInsight === m.id ? null : m.id)}
              >
                <span className="text-blue-400 text-sm">💡</span>
                <span className="text-[11px] font-semibold text-blue-300/80 uppercase tracking-wider">AI Insight</span>
                <span className="ml-auto text-white/30 text-xs">{expandedInsight === m.id ? "▲" : "▼"}</span>
              </button>
              {expandedInsight === m.id && (
                <div className="px-4 pb-3 pt-2 bg-blue-500/5">
                  <p className="text-xs text-white/80 leading-relaxed">{m.insight}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM TAB BAR — replaces the left icon sidebar */}
      <nav className="flex items-center border-t border-white/10 bg-[#111318] flex-shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { id: "feed", icon: "≈", label: "Feed" },
          { id: "analytics", icon: "📊", label: "Analytics" },
          { id: "settings", icon: "⚙", label: "Settings" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === t.id ? "text-blue-400" : "text-white/35"}`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[9px] font-medium uppercase tracking-wider">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
