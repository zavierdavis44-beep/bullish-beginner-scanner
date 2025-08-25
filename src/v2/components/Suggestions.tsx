import React from 'react'

export type Suggestion = { ticker: string, score: number, prob: number, at: number, source: 'scan'|'alert'|'breakout' }

export const Suggestions: React.FC<{
  suggestions: Suggestion[]
  onPick: (ticker: string)=>void
  onDismiss?: (s: Suggestion)=>void
  table?: boolean
}> = ({ suggestions, onPick, onDismiss, table }) => {
  const ranked = [...suggestions].sort((a,b)=> (b.prob - a.prob) || (b.score - a.score)).slice(0, 30)
  if (table) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-9 gap-2 px-1 text-[11px] uppercase tracking-wider opacity-70">
          <div>Ticker</div>
          <div>Source</div>
          <div>Time</div>
          <div>Score</div>
          <div>Prob</div>
          <div>Action</div>
          <div className="col-span-3">Notes</div>
        </div>
        {ranked.length===0 ? (
          <div className="text-xs opacity-60">No suggestions yet. The scanner will populate this as it runs.</div>
        ) : (
          ranked.map(s => (
            <div key={`${s.ticker}-${s.at}`} className="grid grid-cols-9 gap-2 items-center p-2 rounded-md hover:bg-slate-900/40">
              <div className="text-sm font-bold">{s.ticker}</div>
              <div className="text-xs opacity-80 capitalize">{s.source}</div>
              <div className="text-xs opacity-60">{new Date(s.at).toLocaleTimeString()}</div>
              <div className="text-sm">{s.score}</div>
              <div className="text-sm">{Math.round(s.prob*100)}%</div>
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 rounded-lg bg-brand-500 text-slate-900" onClick={()=>onPick(s.ticker)}>Add</button>
                <button className="text-xs px-2 py-1 rounded-lg border border-slate-700/60 hover:bg-slate-800/60" onClick={()=>onDismiss?.(s)}>Ignore</button>
              </div>
              <div className="col-span-3 text-xs opacity-70">EMA confluence + breakout/volume checks feed these suggestions.</div>
            </div>
          ))
        )}
      </div>
    )
  }
  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm uppercase tracking-widest opacity-70">Suggestions</div>
        <div className="text-xs opacity-60">Double‑click a card to add</div>
      </div>
      {ranked.length===0 ? (
        <div className="text-xs opacity-60">No suggestions yet. The scanner will populate this as it runs.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {ranked.map(s => (
            <div key={`${s.ticker}-${s.at}`} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/60 hover:border-brand-500/60 transition-colors" onDoubleClick={()=>onPick(s.ticker)}>
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-70 capitalize">{s.source}</div>
                <div className="text-[10px] opacity-50">{new Date(s.at).toLocaleTimeString()}</div>
              </div>
              <div className="text-xl font-bold leading-tight">{s.ticker}</div>
              <div className="text-xs opacity-80 mb-2">Score: <b>{s.score}</b> • Prob: <b>{Math.round(s.prob*100)}%</b></div>
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 rounded-lg bg-brand-500 text-slate-900" onClick={()=>onPick(s.ticker)}>Add</button>
                <button className="text-xs px-2 py-1 rounded-lg border border-slate-700/60 hover:bg-slate-800/60" onClick={()=>onDismiss?.(s)}>Ignore</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
