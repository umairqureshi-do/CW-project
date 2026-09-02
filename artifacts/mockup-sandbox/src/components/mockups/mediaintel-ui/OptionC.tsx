import React, { useState } from 'react';
import { ExternalLink, X, Plus, ChevronDown, Activity, Users, Rss } from 'lucide-react';

type TabType = 'feeds' | 'compintel' | 'community';

const FEEDS_DATA = [
  { id: 1, source: 'TechCrunch', sourceColor: 'bg-orange-100 text-orange-800 border-orange-200', title: 'WP Engine announces new enterprise features for 2024', competitors: ['WP Engine'], score: 91, sentiment: '✅ Positive', type: 'News', date: '2h ago' },
  { id: 2, source: 'The Verge', sourceColor: 'bg-purple-100 text-purple-800 border-purple-200', title: 'Cloudways vs Kinsta: Which managed host is faster?', competitors: ['Kinsta', 'Cloudways'], score: 75, sentiment: '➖ Neutral', type: 'Comparison', date: '5h ago' },
  { id: 3, source: 'Hacker News', sourceColor: 'bg-orange-50 text-orange-900 border-orange-300', title: 'Show HN: We moved from SiteGround to a bare metal setup', competitors: ['SiteGround'], score: 58, sentiment: '❌ Negative', type: 'Discussion', date: '1d ago' },
  { id: 4, source: 'Smashing Mag', sourceColor: 'bg-red-100 text-red-800 border-red-200', title: 'Optimizing WordPress Performance on WP Engine', competitors: ['WP Engine'], score: 88, sentiment: '✅ Positive', type: 'Tutorial', date: '1d ago' },
  { id: 5, source: 'Reddit /r/webdev', sourceColor: 'bg-blue-100 text-blue-800 border-blue-200', title: 'Is Kinsta worth the premium price tag?', competitors: ['Kinsta'], score: 62, sentiment: '➖ Neutral', type: 'Discussion', date: '2d ago' },
  { id: 6, source: 'HostingAdvice', sourceColor: 'bg-emerald-100 text-emerald-800 border-emerald-200', title: 'Top 10 WordPress Hosts of the Year Ranked', competitors: ['WP Engine', 'SiteGround'], score: 85, sentiment: '✅ Positive', type: 'Ranking', date: '2d ago' },
  { id: 7, source: 'G2', sourceColor: 'bg-red-50 text-red-700 border-red-200', title: 'Review: Cloudways Support response times dropped', competitors: ['Cloudways'], score: 45, sentiment: '❌ Negative', type: 'Review', date: '3d ago' },
  { id: 8, source: 'WPTavern', sourceColor: 'bg-sky-100 text-sky-800 border-sky-200', title: 'SiteGround increases pricing for entry-level plans', competitors: ['SiteGround'], score: 68, sentiment: '➖ Neutral', type: 'News', date: '4d ago' },
];

const COMPINTEL_DATA = [
  { id: 1, source: 'G2 Reviews', sourceColor: 'bg-red-50 text-red-700 border-red-200', title: 'Kinsta pricing compared to competitors in Q3', competitors: ['Kinsta'], score: 82, sentiment: '➖ Neutral', type: 'Market Data', date: '1h ago' },
  { id: 2, source: 'Press Release', sourceColor: 'bg-slate-100 text-slate-800 border-slate-200', title: 'WP Engine acquires new caching technology startup', competitors: ['WP Engine'], score: 95, sentiment: '✅ Positive', type: 'M&A', date: '4h ago' },
  { id: 3, source: 'TrustRadius', sourceColor: 'bg-blue-50 text-blue-800 border-blue-200', title: 'Enterprise users report issues with SiteGround scaling', competitors: ['SiteGround'], score: 35, sentiment: '❌ Negative', type: 'Review', date: '1d ago' },
  { id: 4, source: 'BuiltWith', sourceColor: 'bg-indigo-100 text-indigo-800 border-indigo-200', title: 'Cloudways sees 15% increase in top 100k sites', competitors: ['Cloudways'], score: 89, sentiment: '✅ Positive', type: 'Market Share', date: '2d ago' },
];

const COMMUNITY_DATA = [
  { id: 1, source: 'GitHub', sourceColor: 'bg-gray-100 text-gray-800 border-gray-200', title: 'Issue #145: Kinsta deployment action failing on node 20', competitors: ['Kinsta'], score: 55, sentiment: '❌ Negative', type: 'Issue', date: '30m ago' },
  { id: 2, source: 'Reddit', sourceColor: 'bg-orange-100 text-orange-800 border-orange-200', title: 'How I optimized my WP Engine site to load in 200ms', competitors: ['WP Engine'], score: 92, sentiment: '✅ Positive', type: 'Showcase', date: '2h ago' },
  { id: 3, source: 'StackOverflow', sourceColor: 'bg-orange-50 text-orange-600 border-orange-200', title: 'Configuring custom Nginx rules on Cloudways', competitors: ['Cloudways'], score: 70, sentiment: '➖ Neutral', type: 'Q&A', date: '5h ago' },
  { id: 4, source: 'Twitter', sourceColor: 'bg-sky-100 text-sky-600 border-sky-200', title: 'Just moved my last client off SiteGround. Never looking back.', competitors: ['SiteGround'], score: 40, sentiment: '❌ Negative', type: 'Social', date: '1d ago' },
];

export default function OptionC() {
  const [activeTab, setActiveTab] = useState<TabType>('feeds');
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getTableData = () => {
    switch(activeTab) {
      case 'compintel': return COMPINTEL_DATA;
      case 'community': return COMMUNITY_DATA;
      default: return FEEDS_DATA;
    }
  };

  const data = getTableData();

  return (
    <div className="min-h-screen bg-white font-sans text-sm text-slate-800 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2 font-semibold text-base tracking-tight text-slate-900">
            <Activity className="w-5 h-5 text-blue-600" />
            MediaIntel
          </div>
          
          <nav className="flex space-x-1">
            <button 
              onClick={() => setActiveTab('feeds')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'feeds' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <Rss className="w-4 h-4" />
              Feeds
            </button>
            <button 
              onClick={() => setActiveTab('compintel')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'compintel' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <Activity className="w-4 h-4" />
              CompIntel
            </button>
            <button 
              onClick={() => setActiveTab('community')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'community' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <Users className="w-4 h-4" />
              Community
            </button>
          </nav>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-medium text-slate-600">
              JD
            </div>
          </div>
        </div>
      </header>

      {/* Filter Strip */}
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {/* Time range */}
          <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm p-0.5">
            <button className="px-3 py-1 text-xs font-medium rounded bg-slate-100 text-slate-900 shadow-sm">7d</button>
            <button className="px-3 py-1 text-xs font-medium rounded text-slate-600 hover:text-slate-900">30d</button>
            <button className="px-3 py-1 text-xs font-medium rounded text-slate-600 hover:text-slate-900">90d</button>
          </div>
          
          <div className="h-4 w-px bg-slate-300"></div>
          
          {/* Competitors */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Competitors:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                WP Engine
                <button className="hover:bg-blue-200 rounded-full p-0.5 -mr-1"><X className="w-3 h-3" /></button>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                Kinsta
                <button className="hover:bg-purple-200 rounded-full p-0.5 -mr-1"><X className="w-3 h-3" /></button>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                SiteGround
                <button className="hover:bg-orange-200 rounded-full p-0.5 -mr-1"><X className="w-3 h-3" /></button>
              </span>
              <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 border-dashed">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          </div>
          
          <div className="h-4 w-px bg-slate-300"></div>
          
          {/* Source select */}
          <button className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm">
            14 sources active
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm">
            Sort: Newest
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          <span className="text-xs font-medium text-slate-500">{data.length} items</span>
        </div>
      </div>

      {/* Main Content - Table */}
      <main className="flex-1 overflow-auto bg-slate-50/50 p-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-4 py-3 font-medium w-32">Source</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium w-48">Competitors</th>
                <th className="px-4 py-3 font-medium w-24">AI Score</th>
                <th className="px-4 py-3 font-medium w-32">Sentiment</th>
                <th className="px-4 py-3 font-medium w-32">Type</th>
                <th className="px-4 py-3 font-medium w-24 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, idx) => (
                <tr key={row.id} className={`group hover:bg-blue-50/50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${row.sourceColor}`}>
                      {row.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[400px]">{row.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {row.competitors.map(comp => (
                        <span key={comp} className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold border ${getScoreColor(row.score)}`}>
                      {row.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {row.sentiment}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                    {row.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
