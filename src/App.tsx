import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getProvider, type DataProvider, type Series } from '@/lib/data'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TickerRow } from '@/components/TickerRow'
import { Suggestions } from '@/components/Suggestions'
import { Rocket, Plus } from 'lucide-react'

type WatchItem = { ticker: string, kind: 'stock'|'crypto', series: Series }
type SavedItem = { ticker: string, kind: 'stock'|'crypto' }

const STORAGE_WATCH = 'bbs.watchlist'
const STORAGE_INPUT = 'bbs.input'
const REFRESH_MS = (()=>{ const v = Number((import.meta as any).env?.VITE_REFRESH_MS); return Number.isFinite(v) && v>0 ? v : 60000 })()

const provider: DataProvider = getProvider()

export default function App(){
  const [updateMsg, setUpdateMsg] = useState<string|null>(null)
  const prevScoresRef = useRef<Record<string, number>>({})
  const [alerts, setAlerts] = useState<string[]>([])
  async function checkUpdates(){
    try{
      const res = await window?.desktop?.checkUpdates?.()
      if(!res) return setUpdateMsg('Updater not available in web build')
      if(res.ok && res.updateInfo && res.updateInfo.version && res.updateInfo.version!==undefined){
        setUpdateMsg(`Update check complete. Latest: v${res.updateInfo.version}`)
      } else if(res.ok){
        setUpdateMsg('No updates found')
      } else {
        setUpdateMsg('Update check failed')
      }
    }catch{ setUpdateMsg('Update check failed') }
    setTimeout(()=>setUpdateMsg(null), 4000)
  }

  const [watch, setWatch] = useState<WatchItem[]>([])
  const [ticker, setTicker] = useState('AAPL')
  const [kind, setKind] = useState<'stock'|'crypto'>('stock')

  const canAdd = watch.length < 10 && ticker.trim().length >= 1
  const suggestionsInput = useMemo(()=>watch.slice(0,5), [watch])

  async function addTicker() {
    if (!canAdd) return
    const tkr = ticker.toUpperCase().trim()
    if (watch.some(w => w.ticker === tkr)) return // de-dup
    const series = await provider.fetchSeries(ticker.toUpperCase(), kind, '5m', 180)
    setWatch(w => [...w, { ticker: tkr, kind, series }])
    setTicker('')
  }

  function remove(i: number){
    setWatch(w => w.filter((_,idx)=>idx!==i))
  }

  // Load saved watchlist or seed initial examples on first load
  useEffect(()=>{
    ;(async()=>{
      try {
        const raw = localStorage.getItem(STORAGE_WATCH)
        const saved: SavedItem[] | null = raw ? JSON.parse(raw) : null
        if (saved && Array.isArray(saved) && saved.length > 0) {
          const loaded: WatchItem[] = []
          for (const s of saved.slice(0,10)){
            const k = (s.kind==='crypto' ? 'crypto' : 'stock') as 'stock'|'crypto'
            const series = await provider.fetchSeries(s.ticker, k, '5m', 180)
            loaded.push({ ticker: s.ticker, kind: k, series })
          }
          setWatch(loaded)
          try { const mod = await import('@/lib/signal'); const map: Record<string,number> = {}; for (const w of loaded){ map[w.ticker] = mod.scoreBullish(w.series).score }; prevScoresRef.current = map } catch {}
        } else {
          const seeds = ['AAPL','MSFT','TSLA','BTCUSD']
          const seeded: WatchItem[] = []
          for (const s of seeds.slice(0,3)){
            const k: 'stock'|'crypto' = s.includes('USD') ? 'crypto' : 'stock'
            const series = await provider.fetchSeries(s, k, '5m', 180)
            seeded.push({ ticker: s, kind: k, series })
          }
          setWatch(seeded)
          try { const mod = await import('@/lib/signal'); const map: Record<string,number> = {}; for (const w of seeded){ map[w.ticker] = mod.scoreBullish(w.series).score }; prevScoresRef.current = map } catch {}
        }
      } catch {}
      try {
        const inp = localStorage.getItem(STORAGE_INPUT)
        if (inp) {
          const obj = JSON.parse(inp)
          if (obj && typeof obj.ticker==='string') setTicker(obj.ticker)
          if (obj && (obj.kind==='stock' || obj.kind==='crypto')) setKind(obj.kind)
        }
      } catch {}
    })()
  },[])

  // Persist lightweight watchlist (tickers only) and input state
  useEffect(()=>{
    try {
      const minimal: SavedItem[] = watch.map(w => ({ ticker: w.ticker, kind: w.kind }))
      localStorage.setItem(STORAGE_WATCH, JSON.stringify(minimal))
    } catch {}
  },[watch])

  useEffect(()=>{
    try { localStorage.setItem(STORAGE_INPUT, JSON.stringify({ ticker, kind })) } catch {}
  },[ticker, kind])

  // Auto refresh data and notify on strong-signal cross
  useEffect(()=>{
    let stop = false
    let timer: any
    try { Notification?.requestPermission?.() } catch {}
    async function tick(){
      try{
        if (watch.length===0) return
        const results = await Promise.all(watch.map(async (w)=>{
          const series = await provider.fetchSeries(w.ticker, w.kind, '5m', 180)
          return { ...w, series }
        }))
        const mod = await import('@/lib/signal')
        const becameStrong: string[] = []
        const nextScores: Record<string, number> = { ...prevScoresRef.current }
        for (let i=0;i<results.length;i++){
          const tkr = results[i].ticker
          const prevScore = prevScoresRef.current[tkr] ?? 0
          const nextScore = mod.scoreBullish(results[i].series).score
          nextScores[tkr] = nextScore
          if (prevScore < 75 && nextScore >= 75) becameStrong.push(tkr)
        }
        if (becameStrong.length>0){
          const message = `Strong bullish setup: ${becameStrong.join(', ')}`
          setAlerts(a=>[message, ...a].slice(0,4))
          try { new Notification('Bullish Alert', { body: message }) } catch {}
        }
        prevScoresRef.current = nextScores
        if (!stop) setWatch(results)
      } catch {}
    }
    timer = setInterval(tick, REFRESH_MS)
    return ()=>{ stop = true; if (timer) clearInterval(timer) }
  },[watch.length])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 glow grid place-items-center">
            <Rocket className="text-slate-900" size={20} />
          </div>
          <div>
            <div className="text-2xl font-black">Beginner Bullish Scanner</div>
            <div className="text-xs opacity-70 -mt-1">Futuristic, simple, and focused on learning by doing</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="opacity-70 text-xs mr-2">Max 10 tickers · Live or mock data</div>
          <button onClick={checkUpdates} className="text-xs px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800/60">Check updates</button>
          <button onClick={()=>{ if (confirm('Reset app state?')){ localStorage.removeItem(STORAGE_WATCH); localStorage.removeItem(STORAGE_INPUT); setWatch([]); setTicker(''); setKind('stock'); setUpdateMsg('Reset complete'); setTimeout(()=>setUpdateMsg(null),2500) } }} className="text-xs px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800/60">Reset</button>
        </div>
      </header>

      {watch.length>0 && <Suggestions items={suggestionsInput} />}

      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Input placeholder="Ticker (e.g., AAPL or BTCUSD)" value={ticker} onChange={e=>setTicker(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') addTicker() }} className="w-60" />
          <select value={kind} onChange={e=>setKind(e.target.value as any)} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-3 py-2">
            <option value="stock">Stock</option>
            <option value="crypto">Crypto</option>
          </select>
          <Button onClick={addTicker} disabled={!canAdd} className="flex items-center gap-2"><Plus size={16}/> Add</Button>
          <div className="text-xs opacity-70 ml-auto">Tip: Add up to 10. Click the ? bubble per row to see how the signal works.</div>
        </div>
      </div>

      <div className="space-y-3">
        {watch.map((w, i)=>(
          <TickerRow key={w.ticker} ticker={w.ticker} series={w.series} onRemove={()=>remove(i)} />
        ))}
      </div>

      <footer className="pt-8 text-xs opacity-60">
        Educational use only. Not financial advice. Plug in a real market data provider before live use.
      </footer>
      {updateMsg && (
        <div className="fixed bottom-6 right-6 card px-4 py-3 text-sm">{updateMsg}</div>
      )}
      {alerts.map((a,i)=>(
        <div
          key={i}
          className="fixed right-6 card px-4 py-3 text-sm"
          style={{ bottom: 24 + i*56 }}
        >{a}</div>
      ))}
    </div>
  )
}

