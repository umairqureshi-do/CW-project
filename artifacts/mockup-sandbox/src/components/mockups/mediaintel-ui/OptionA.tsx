import React, { useState } from 'react';
import { 
  Activity, 
  ExternalLink, 
  ChevronDown, 
  RefreshCw, 
  Search, 
  TrendingUp, 
  MessageSquare,
  BarChart2,
  Globe
} from 'lucide-react';

const mockFeeds = [
  {
    id: 1,
    publication: "TechCrunch",
    time: "2h ago",
    title: "WP Engine Announces New Enterprise Caching Layer for WooCommerce",
    competitors: ["WP Engine"],
    aiScore: 87,
    sentiment: "positive",
    type: "product_update",
    link: "#"
  },
  {
    id: 2,
    publication: "The Verge",
    time: "5h ago",
    title: "Kinsta vs Cloudways: Which managed WordPress host wins in 2024?",
    competitors: ["Kinsta", "Cloudways"],
    aiScore: 92,
    sentiment: "neutral",
    type: "comparison",
    link: "#"
  },
  {
    id: 3,
    publication: "Hacker News",
    time: "12h ago",
    title: "Why we migrated from SiteGround to AWS: A cost analysis",
    competitors: ["SiteGround"],
    aiScore: 45,
    sentiment: "negative",
    type: "case_study",
    link: "#"
  },
  {
    id: 4,
    publication: "Smashing Magazine",
    time: "1d ago",
    title: "Optimizing Core Web Vitals on Pantheon's Edge Network",
    competitors: ["Pantheon"],
    aiScore: 78,
    sentiment: "positive",
    type: "tutorial",
    link: "#"
  },
  {
    id: 5,
    publication: "HostingAdvice",
    time: "1d ago",
    title: "Flywheel launches new agency partner program with increased margins",
    competitors: ["Flywheel"],
    aiScore: 82,
    sentiment: "positive",
    type: "news",
    link: "#"
  },
  {
    id: 6,
    publication: "Reddit /r/WordPress",
    time: "2d ago",
    title: "DigitalOcean app platform pricing just increased again. Alternatives?",
    competitors: ["DigitalOcean"],
    aiScore: 34,
    sentiment: "negative",
    type: "discussion",
    link: "#"
  }
];

export default function OptionA() {
  const [activeTab, setActiveTab] = useState('feeds');
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans text-slate-900">
      {/* Top Banner */}
      <div className="bg-indigo-600 text-white text-xs font-medium py-1 px-4 text-center tracking-wide">
        Option A Preview: Unified Command Bar Design
      </div>

      {/* Unified Command Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between shadow-sm">
        {/* Left: Logo & Tabs */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-md">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">MediaIntel</span>
          </div>
          
          <nav className="flex items-center space-x-1">
            <button 
              onClick={() => setActiveTab('feeds')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'feeds' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Feeds
            </button>
            <button 
              onClick={() => setActiveTab('compintel')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'compintel' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              CompIntel
            </button>
            <button 
              onClick={() => setActiveTab('community')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'community' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Community
            </button>
          </nav>
        </div>

        {/* Center: Time Range */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Right: Filters & Actions */}
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <span>All Competitors</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          <button className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <span>All Sources</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          <button className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" />
            <span>Sync now</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'feeds' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Latest Intelligence</h1>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search feeds..." 
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockFeeds.map((feed) => (
                <div key={feed.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{feed.publication}</span>
                        <span>•</span>
                        <span>{feed.time}</span>
                      </div>
                      <a href={feed.link} className="text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 line-clamp-2 leading-snug">
                      {feed.title}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {feed.competitors.map(comp => (
                        <span key={comp} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                          {comp}
                        </span>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="inline-flex items-center px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/50">
                          AI {feed.aiScore}
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-600">
                          <span className={`w-2 h-2 rounded-full ${
                            feed.sentiment === 'positive' ? 'bg-emerald-500' : 
                            feed.sentiment === 'negative' ? 'bg-rose-500' : 'bg-slate-400'
                          }`}></span>
                          <span className="capitalize">{feed.sentiment}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {feed.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtle preview of other sections */}
            <div className="mt-12 opacity-60 pointer-events-none filter blur-[1px]">
              <h2 className="text-lg font-semibold mb-4 text-slate-900">Competitor Analysis Overview</h2>
              <div className="bg-white rounded-xl border border-slate-200 p-6 h-48 flex items-center justify-center">
                <BarChart2 className="w-8 h-8 text-slate-300" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compintel' && (
          <div className="max-w-4xl mx-auto pt-8">
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Competitive Intelligence</h2>
              <p className="text-slate-500 mb-8 max-w-lg mx-auto">Track market share, pricing changes, and feature matrices across your competitors.</p>
              
              <div className="grid grid-cols-3 gap-4 text-left">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <div className="h-4 w-24 bg-slate-200 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-slate-200 rounded mb-2"></div>
                    <div className="h-2 w-full bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="max-w-4xl mx-auto pt-8">
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
              <div className="mx-auto w-16 h-16 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Community Sentiment</h2>
              <p className="text-slate-500 mb-8 max-w-lg mx-auto">Monitor discussions across Reddit, Twitter, and niche forums.</p>
              
              <div className="space-y-4 text-left">
                {[1, 2].map(i => (
                  <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex gap-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-slate-200 rounded"></div>
                      <div className="h-3 w-full bg-slate-200 rounded"></div>
                      <div className="h-3 w-4/5 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
