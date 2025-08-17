import React from 'react'
import type { Series } from '@/lib/data'
import { scoreBullish } from '@/lib/signal'

export const Suggestions: React.FC<{ items: { ticker: string, series: Series }[] }> = ({ items }) => {
  const ranked = [...items]
    .map(x => ({ ...x, score: scoreBullish(x.series).score }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 3)

  return (
    <div className="card p-4 mb-4">
      <div className="text-sm uppercase tracking-widest opacity-70 mb-2">AI Suggestions</div>
      <div className="grid grid-cols-3 gap-3">
        {ranked.map(x => (
          <div key={x.ticker} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/60">
            <div className="text-sm opacity-70">Top Pick</div>
            <div className="text-xl font-bold">{x.ticker}</div>
            <div className="text-xs opacity-80">Bullish score: <b>{x.score}</b></div>
          </div>
        ))}
      </div>
    </div>
  )
}
