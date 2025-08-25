import React from 'react'
import { Settings } from '@/components/Settings'
import { Rocket } from 'lucide-react'

export const Header: React.FC<{
  intervalSel: '1m'|'5m'|'1h'|'1d'
  setIntervalSel: (v: '1m'|'5m'|'1h'|'1d')=>void
  lookback: number
  setLookback: (n: number)=>void
  tab: 'watch'|'suggestions'
  setTab: (t: 'watch'|'suggestions')=>void
}> = ({ intervalSel, setIntervalSel, lookback, setLookback, tab, setTab }) => {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-500 glow grid place-items-center">
          <Rocket className="text-slate-900" size={20} />
        </div>
        <div>
          <div className="text-2xl font-black">THE ZAi</div>
          <div className="text-xs opacity-70 -mt-1">Smooth, beginner‑friendly bullish scanner</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-slate-900/60 border border-slate-700/60 rounded-xl p-1">
          <button onClick={()=>setTab('watch')} className={`text-xs px-3 py-1.5 rounded-lg ${tab==='watch' ? 'bg-brand-500 text-slate-900' : 'hover:bg-slate-800/60'}`}>Watchlist</button>
          <button onClick={()=>setTab('suggestions')} className={`text-xs px-3 py-1.5 rounded-lg ${tab==='suggestions' ? 'bg-brand-500 text-slate-900' : 'hover:bg-slate-800/60'}`}>Suggestions</button>
        </div>
        <div className="opacity-70 text-xs mr-2">Interval/Depth</div>
        <select value={intervalSel} onChange={e=>setIntervalSel(e.target.value as any)} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-2 py-1 text-xs">
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="1h">1h</option>
          <option value="1d">1d</option>
        </select>
        <select value={lookback} onChange={e=>setLookback(Number(e.target.value))} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-2 py-1 text-xs">
          <option value={120}>120</option>
          <option value={180}>180</option>
          <option value={300}>300</option>
          <option value={500}>500</option>
        </select>
        <Settings />
      </div>
    </header>
  )
}
