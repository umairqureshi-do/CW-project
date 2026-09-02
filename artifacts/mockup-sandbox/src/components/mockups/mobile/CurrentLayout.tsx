export default function CurrentLayout() {
  return (
    <div className="flex h-screen w-full bg-[#0a0c10] overflow-hidden text-sm text-white font-mono" style={{ width: 390, margin: '0 auto' }}>
      {/* Mini sidebar - wastes 64px on mobile */}
      <nav className="w-16 border-r border-white/10 bg-[#111318] flex flex-col items-center py-4 flex-shrink-0">
        <div className="mb-8">
          <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white">⚡</div>
        </div>
        <div className="flex flex-col gap-4 w-full px-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-md bg-blue-500/10 text-blue-400">≈</div>
          <div className="w-12 h-12 flex items-center justify-center rounded-md text-white/50">📊</div>
        </div>
      </nav>

      {/* Main area — only 326px left after sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Left competitor sidebar — forces horizontal scroll */}
        <div className="flex flex-1 overflow-hidden">
          {/* This sidebar would be 256px — wider than the remaining space! */}
          <div className="w-64 bg-[#0f1117] border-r border-white/10 flex-shrink-0 overflow-hidden p-4">
            <div className="text-[9px] uppercase tracking-wider text-white/40 mb-3">Time Range</div>
            <div className="flex gap-1 mb-4">
              {['7d','30d','90d'].map(r => (
                <div key={r} className={`flex-1 text-center py-1 rounded text-xs ${r === '30d' ? 'bg-white/10 text-white' : 'text-white/40'}`}>{r}</div>
              ))}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-white/40 mb-2">Competitors</div>
            {['WP Engine 15','Kinsta 5','Hostinger 22','GoDaddy 22'].map(c => (
              <div key={c} className="flex justify-between py-1.5 text-xs text-white/70">
                <span>{c.split(' ')[0]}</span><span className="text-white/40">{c.split(' ')[1]}</span>
              </div>
            ))}
          </div>

          {/* Feed area — gets squeezed to negative width */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-12 border-b border-white/10 bg-white/5 flex items-center justify-between px-3 flex-shrink-0">
              <span className="font-semibold text-xs truncate">Intelligence Feed</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="h-7 px-2 rounded border border-white/20 text-[10px] flex items-center gap-1 bg-white/5 whitespace-nowrap">↻ Sync</div>
              </div>
            </header>

            {/* Stats — 4 columns don't fit at all */}
            <div className="grid grid-cols-4 border-b border-white/10">
              {['93','93','Flywheel','Bringatrailer.com'].map((v, i) => (
                <div key={i} className="p-2 border-r border-white/10 last:border-0">
                  <div className="text-[7px] text-white/40 uppercase mb-1">{['Mentions','Opps','Top Comp','Top Pub'][i]}</div>
                  <div className="text-[10px] font-bold text-white truncate">{v}</div>
                </div>
              ))}
            </div>

            {/* Cuts off here — article card barely visible */}
            <div className="flex-1 overflow-hidden p-2">
              <div className="bg-white/5 rounded border border-white/10 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[8px] border border-blue-400/30 text-blue-400 px-1 rounded">HOSTINGER</span>
                  <span className="text-[8px] text-white/40">TechCrunch</span>
                </div>
                <div className="text-[10px] font-semibold leading-tight truncate">Hostinger Review 2024: Is It Worth the Low Price?</div>
                <div className="text-[8px] text-white/50 mt-1 line-clamp-2">Hostinger's ultra-low price has made it the go-to for budget-conscious...</div>
              </div>
              <div className="mt-2 text-center text-[9px] text-white/30">⚠ Layout broken — content cut off</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
