import React, { useState } from "react";
import { 
  Newspaper, 
  BarChart2, 
  Users,
  Search,
  ChevronDown,
  Bell,
  MoreVertical,
  Activity,
  ThumbsUp,
  MessageSquare
} from "lucide-react";

export default function OptionB() {
  const [activeTab, setActiveTab] = useState("feeds");
  const [timeRange, setTimeRange] = useState("7d");
  const [sourceFilter, setSourceFilter] = useState("All");

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-slate-50 text-slate-900">
      {/* LEFT SIDEBAR NAV */}
      <aside className="w-[220px] bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold text-lg tracking-tight">
            <Activity className="w-5 h-5 text-indigo-500" />
            MediaIntel
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          <button 
            onClick={() => setActiveTab("feeds")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "feeds" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Feeds
          </button>
          <button 
            onClick={() => setActiveTab("compintel")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "compintel" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            CompIntel
          </button>
          <button 
            onClick={() => setActiveTab("community")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "community" 
                ? "bg-indigo-600 text-white shadow-sm" 
                : "hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            Community
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Jane Doe</p>
              <p className="text-xs text-slate-400 truncate">Acme Corp</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* TOP CONTROLS BAR */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900 capitalize">
              {activeTab === 'compintel' ? 'Competitive Intel' : activeTab}
            </h1>
            
            {activeTab === "feeds" && (
              <div className="hidden md:flex items-center gap-1 ml-4 bg-slate-100 p-1 rounded-lg">
                {["All", "TechCrunch", "The Verge", "VentureBeat"].map(source => (
                  <button 
                    key={source}
                    onClick={() => setSourceFilter(source)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      sourceFilter === source 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              {["7d", "30d", "90d"].map(range => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    timeRange === range 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* CONTENT ROW - SPLIT PANEL */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: MAIN FEED */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === "feeds" && (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Article 1 */}
                <article className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-semibold text-slate-900">TechCrunch</span>
                      <span>•</span>
                      <span>2 hours ago</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-100">
                        Negative Sentiment
                      </span>
                      <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2 leading-snug cursor-pointer hover:text-indigo-600">
                    WP Engine faces significant downtime during crucial holiday shopping weekend
                  </h2>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    Several high-profile e-commerce sites hosted on WP Engine experienced extended outages today, leading to frustration among retailers who rely on the managed WordPress host during the year's busiest shopping period.
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Mentions:</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">WP Engine</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">Kinsta</span>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">AI Score 82/100</span>
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '82%' }}></div>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Article 2 */}
                <article className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-semibold text-slate-900">The Verge</span>
                      <span>•</span>
                      <span>5 hours ago</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                        Positive Sentiment
                      </span>
                      <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2 leading-snug cursor-pointer hover:text-indigo-600">
                    SiteGround launches new AI-powered caching mechanism
                  </h2>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    In a move to stay competitive in the crowded managed hosting space, SiteGround has unveiled a proprietary caching system that uses machine learning to predict traffic spikes and pre-load assets.
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Mentions:</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">SiteGround</span>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">AI Score 65/100</span>
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Article 3 */}
                <article className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-semibold text-slate-900">VentureBeat</span>
                      <span>•</span>
                      <span>Yesterday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                        Neutral Sentiment
                      </span>
                      <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2 leading-snug cursor-pointer hover:text-indigo-600">
                    xCloud announces $12M Series A to expand simplified cloud hosting
                  </h2>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    The hosting startup xCloud has secured new funding to build out its control panel alternative, aiming to make deploying to DigitalOcean and AWS more accessible to smaller agencies.
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Mentions:</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">xCloud</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">DigitalOcean</span>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">AI Score 45/100</span>
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Article 4 */}
                <article className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-semibold text-slate-900">Smashing Magazine</span>
                      <span>•</span>
                      <span>Yesterday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-100">
                        Negative Sentiment
                      </span>
                      <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2 leading-snug cursor-pointer hover:text-indigo-600">
                    Why developers are moving away from traditional cPanel hosts
                  </h2>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    A deep dive into the shifting landscape of web hosting, examining why modern development workflows are conflicting with legacy control panels like cPanel, and what alternatives like Cloudways offer.
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Mentions:</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">cPanel</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">Cloudways</span>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">AI Score 88/100</span>
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            )}

            {activeTab === "compintel" && (
              <div className="max-w-4xl mx-auto space-y-6">
                 <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 mb-1">Total Mentions</div>
                    <div className="text-3xl font-bold text-slate-900">1,248</div>
                    <div className="text-sm text-emerald-600 mt-2 flex items-center gap-1">
                      ↑ 12% vs last period
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 mb-1">Avg Sentiment</div>
                    <div className="text-3xl font-bold text-slate-900">Neutral</div>
                    <div className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                      Slightly positive trend
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 mb-1">Top Competitor</div>
                    <div className="text-3xl font-bold text-slate-900">WP Engine</div>
                    <div className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                      42% share of voice
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Competitor Share of Voice</h3>
                  <div className="space-y-4">
                    {[
                      { name: "WP Engine", val: 42, color: "bg-indigo-500" },
                      { name: "SiteGround", val: 28, color: "bg-indigo-400" },
                      { name: "Kinsta", val: 15, color: "bg-indigo-300" },
                      { name: "xCloud", val: 10, color: "bg-slate-300" },
                      { name: "Others", val: 5, color: "bg-slate-200" }
                    ].map(comp => (
                      <div key={comp.name} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium text-slate-700">{comp.name}</div>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${comp.color} rounded-full`} style={{ width: `${comp.val}%` }}></div>
                        </div>
                        <div className="w-12 text-right text-sm text-slate-500">{comp.val}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "community" && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Community Chatter</h2>
                    <p className="text-sm text-slate-500 mt-1">Discussions across Reddit, Twitter, and specialized forums.</p>
                  </div>
                  <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                    Add Source
                  </button>
                </div>

                <article className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#ff4500] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-semibold text-slate-900">r/webhosting</div>
                        <div className="text-xs text-slate-500">4 hours ago</div>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">Looking for WP Engine alternatives that don't break the bank</h3>
                      <p className="text-sm text-slate-600 mb-3">
                        My renewal is coming up and they want to double my rate. I'm running 5 woocommerce sites. What are you all using these days?
                      </p>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> 124</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> 42 comments</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">Opportunity: High</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            )}
          </div>

          {/* RIGHT: ANALYTICS PANEL (Sidebar) */}
          <aside className="w-[35%] min-w-[320px] max-w-[400px] border-l border-slate-200 bg-[#f8fafc] overflow-y-auto hidden lg:block p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Dashboard Summary</h2>
            
            <div className="space-y-6">
              {/* Top Competitors Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Top Competitors</h3>
                  <button className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">xCloud</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-indigo-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-6 text-right">27</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">SiteGround</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[60%] h-full bg-indigo-400 rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-6 text-right">17</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Kinsta</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[45%] h-full bg-indigo-300 rounded-full"></div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-6 text-right">13</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sentiment Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Sentiment Overview</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">Positive</span>
                      <span className="font-semibold text-slate-900">62%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">Neutral</span>
                      <span className="font-semibold text-slate-900">28%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: '28%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">Negative</span>
                      <span className="font-semibold text-slate-900">10%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Score Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Avg AI Opportunity Score</h3>
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative w-32 h-32 mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle 
                        cx="50" cy="50" r="40" 
                        fill="transparent" 
                        stroke="#f1f5f9" 
                        strokeWidth="12" 
                      />
                      <circle 
                        cx="50" cy="50" r="40" 
                        fill="transparent" 
                        stroke="#6366f1" 
                        strokeWidth="12" 
                        strokeDasharray="251.2" 
                        strokeDashoffset="55.26" 
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">78</span>
                      <span className="text-xs font-medium text-slate-500 uppercase">/ 100</span>
                    </div>
                  </div>
                  <p className="text-sm text-center text-slate-600">
                    High opportunity detected in recent WP Engine outages.
                  </p>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}
