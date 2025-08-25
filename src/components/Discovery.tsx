import React, { useEffect, useState } from 'react'
import { getProvider } from '@/lib/data'
import { scanTopPicks, type Pick } from '@/lib/scan'
import { SECTOR_TICKERS, type Sector } from '@/lib/universe'

export default function Discovery(){
  const [picks, setPicks] = useState<Pick[]|null>(null)
  const [loading, setLoading] = useState(false)
  const [sectors, setSectors] = useState<Sector[]>(()=>{
    try { const raw = localStorage.getItem('bbs.sectors'); if (!raw) return Object.keys(SECTOR_TICKERS) as Sector[]; const arr = JSON.parse(raw); return Array.isArray(arr)? arr : (Object.keys(SECTOR_TICKERS) as Sector[]) } catch { return Object.keys(SECTOR_TICKERS) as Sector[] }
  })

  useEffect(()=>{
    let stop = false
    async function run(){
      try{
        setLoading(true)
        const results = await scanTopPicks(getProvider(), 3, 0.9, { sectors })
        if (!stop) setPicks(results)
        // Alerts for high-prob picks
        if (results.length>0){
          try { new Notification('THE ZAi Alert', { body: `High-prob picks: ${results.map(r=>r.ticker).join(', ')}` }) } catch {}
        }
      } finally { setLoading(false) }
    }
    run()
    const id = setInterval(run, 120000)
    return ()=>{ stop = true; clearInterval(id) }
  },[])

  if (loading && !picks) return <div className="card p-4 mb-4 text-sm opacity-70">Scanning market for top picks…</div>
  if (!picks || picks.length===0) return null
  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm uppercase tracking-widest opacity-70">Suggestions</div>
        <div className="flex gap-2 items-center">
          <div className="text-xs opacity-70">Sectors:</div>
          {(Object.keys(SECTOR_TICKERS) as Sector[]).map(s=>{
            const active = sectors.includes(s)
            return (
              <button
                key={s}
                className={`text-[10px] px-2 py-1 rounded-lg border ${active? 'border-brand-500/60 bg-slate-800/60':'border-slate-700/60 hover:bg-slate-800/40'}`}
                onClick={()=>{
                  setSectors(prev=>{
                    const next = prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]
                    try { localStorage.setItem('bbs.sectors', JSON.stringify(next)) } catch {}
                    return next
                  })
                }}
              >{s}</button>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {picks.map(p=> (
          <div key={p.ticker} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/60">
            <div className="text-sm opacity-70">Top Pick</div>
            <div className="text-xl font-bold">{p.ticker}</div>
            <div className="text-xs opacity-80">Bullish score: <b>{p.score}</b> • Prob: <b>{Math.round(p.prob*100)}%</b></div>
          </div>
        ))}
      </div>
    </div>
  )
}
