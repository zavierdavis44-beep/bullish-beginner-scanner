import React, { useMemo, useState } from 'react'
import type { Series } from '@/lib/data'
import { scoreBullish } from '@/lib/signal'
import { probHitTP1FromScore, riskReward } from '@/lib/edge'
import { ChartMini } from './charts/ChartMini'

export const Watchlist: React.FC<{
  watch: { ticker: string, kind: 'stock'|'crypto', series: Series }[]
  setWatch: (fn: (prev: any)=>any)=>void
  ticker: string
  setTicker: (s: string)=>void
  kind: 'stock'|'crypto'
  setKind: (k: 'stock'|'crypto')=>void
  canAdd: boolean
  addTicker: () => void
}> = ({ watch, setWatch, ticker, setTicker, kind, setKind, canAdd, addTicker }) => {
  function remove(i: number){ setWatch((w: any[]) => w.filter((_,idx)=>idx!==i)) }
  const [capitalMap, setCapitalMap] = useState<Record<string, number>>({})
  function capFor(t: string){ return capitalMap[t] ?? 500 }
  function setCap(t: string, v: number){ setCapitalMap(m => ({ ...m, [t]: Math.max(0, v||0) })) }
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input placeholder="Ticker (e.g., AAPL or BTCUSD)" value={ticker} onChange={e=>setTicker(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addTicker() }} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2 w-60" />
        <select value={kind} onChange={e=>setKind(e.target.value as any)} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2">
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
        </select>
        <button onClick={addTicker} disabled={!canAdd} className="text-xs px-3 py-2 rounded-xl bg-brand-500 text-slate-900 disabled:opacity-50">Add</button>
        <div className="text-xs opacity-70 ml-auto">Max 10. Hover charts for detail. Examples: AAPL, TSLA, BTC, ETH, XRP.</div>
      </div>

      {watch.length>0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-15 gap-2 px-1 text-[11px] uppercase tracking-wider opacity-70">
            <div className="col-span-3">Mini Chart</div>
            <div>Ticker</div>
            <div>Price</div>
            <div>Buy-in</div>
            <div>TP1</div>
            <div>Stop</div>
            <div>TP2</div>
            <div>Prob</div>
            <div>Capital ($)</div>
            <div>Shares</div>
            <div>R:R</div>
            <div></div>
          </div>
          {watch.map((w, i)=>{
            const s = scoreBullish(w.series)
            const price = w.series[w.series.length-1]?.c ?? 0
            const p = Math.round(probHitTP1FromScore(s.score)*100)
            const cap = capFor(w.ticker)
            const shares = price>0 ? Math.floor((cap / price) * 100) / 100 : 0
            const rr = riskReward(s.targets.entry, s.targets.stop, s.targets.t1)
            return (
              <div key={w.ticker} className="grid grid-cols-15 gap-2 items-center p-2 rounded-md hover:bg-slate-900/40">
                <div className="col-span-3"><ChartMini ticker={w.ticker} series={w.series} targets={s.targets} /></div>
                <div className="text-sm font-bold">{w.ticker}</div>
                <div className="text-sm opacity-90">$ {price.toFixed(2)}</div>
                <div className="text-sm">$ {s.targets.entry.toFixed(2)}</div>
                <div className="text-sm">$ {s.targets.t1.toFixed(2)}</div>
                <div className="text-sm text-rose-300">$ {s.targets.stop.toFixed(2)}</div>
                <div className="text-sm text-emerald-300">$ {s.targets.t2.toFixed(2)}</div>
                <div className="text-sm">{p}%</div>
                <div><input type="number" min={50} step={50} value={cap} onChange={e=>setCap(w.ticker, +e.target.value)} className="w-24 rounded-xl bg-slate-900/80 border border-slate-700/60 px-2 py-1 text-sm" /></div>
                <div className="text-sm">{shares}</div>
                <div className="text-sm">{rr.toFixed(2)}R</div>
                <div className="text-right"><button onClick={()=>remove(i)} className="text-xs px-2 py-1 rounded-lg border border-slate-700/60 hover:bg-slate-800/60">Remove</button></div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
