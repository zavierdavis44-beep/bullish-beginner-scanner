import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getProvider, type DataProvider, type Series } from '@/lib/data'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TickerRow } from '@/components/TickerRow'
import { Suggestions, type Suggestion } from '@/components/Suggestions'
import Discovery from '@/components/Discovery'
import { Rocket, Plus } from 'lucide-react'
import { Settings } from '@/components/Settings'
import { startExperiment, updateWithSeries } from '@/lib/learn'
import { scanTopPicks } from '@/lib/scan'
import { probHitTP1FromScore } from '@/lib/edge'

type WatchItem = { ticker: string, kind: 'stock'|'crypto', series: Series }
type SavedItem = { ticker: string, kind: 'stock'|'crypto' }

const STORAGE_WATCH = 'bbs.watchlist'
const STORAGE_INPUT = 'bbs.input'
const STORAGE_SUGG = 'bbs.suggestions'
const REFRESH_MS = (()=>{ const v = Number((import.meta as any).env?.VITE_REFRESH_MS); return Number.isFinite(v) && v>0 ? v : 60000 })()

export default function App(){
  const [updateMsg, setUpdateMsg] = useState<string|null>(null)
  const [updateState, setUpdateState] = useState<{ status: 'available'|'downloading'|'ready'|'error', progress?: number, message?: string }|null>(null)
  const prevScoresRef = useRef<Record<string, number>>({})
  const [alerts, setAlerts] = useState<string[]>([])
  const [provBump, setProvBump] = useState(0)
  async function checkUpdates(){
    try{
      const res = await window?.desktop?.checkUpdates?.()
      if(!res) return setUpdateMsg('Updater not available in web build')
      if(res.ok && res.updateInfo && res.updateInfo.version && res.updateInfo.version!==undefined){
        setUpdateMsg(`Update check complete. Latest: v${res.updateInfo.version}`)
      } else if(res.ok){
        setUpdateMsg('No updates found')
      } else {
        const msg = String(res.error||'')
        if (/update\s*config|app-update\.yml|provider/i.test(msg)) setUpdateMsg('Updater not configured (install from Release)')
        else setUpdateMsg('Update check failed')
      }
    }catch{ setUpdateMsg('Update check failed') }
    setTimeout(()=>setUpdateMsg(null), 4000)
  }

  const [watch, setWatch] = useState<WatchItem[]>([])
  const [ticker, setTicker] = useState('AAPL')
  const [kind, setKind] = useState<'stock'|'crypto'>('stock')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [intervalSel, setIntervalSel] = useState<'1m'|'5m'|'1h'|'1d'>(()=>{ try { return (localStorage.getItem('bbs.interval') as any) || '5m' } catch { return '5m' } })
  const [lookback, setLookback] = useState<number>(()=>{ try { return Number(localStorage.getItem('bbs.lookback')||'180') } catch { return 180 } })
  const [showTop, setShowTop] = useState(false)

  const canAdd = watch.length < 10 && ticker.trim().length >= 1
  const suggestionsInput = useMemo(()=>watch.slice(0,5), [watch])

  async function addTicker() {
    if (!canAdd) return
    const tkr = ticker.toUpperCase().trim()
    if (watch.some(w => w.ticker === tkr)) return // de-dup
    const series = await getProvider().fetchSeries(ticker.toUpperCase(), kind, intervalSel, lookback)
    setWatch(w => [...w, { ticker: tkr, kind, series }])
    setTicker('')
  }

  async function addTickerBySymbol(tkr: string){
    const sym = tkr.toUpperCase().trim()
    const k: 'stock'|'crypto' = sym.includes('USD') ? 'crypto' : 'stock'
    if (watch.some(w=>w.ticker===sym)) return
    if (watch.length < 10){
      const series = await getProvider().fetchSeries(sym, k, intervalSel, lookback)
      setWatch(w => [...w, { ticker: sym, kind: k, series }])
      return
    }
    try {
      // Choose a replacement: lowest current score
      const mod = await import('@/lib/signal')
      const scored = watch.map(w=>({ w, s: mod.scoreBullish(w.series).score }))
      const lowest = scored.reduce((a,b)=> b.s < a.s ? b : a, scored[0])
      if (confirm(`Watchlist is full. Replace ${lowest.w.ticker} (score ${lowest.s}) with ${sym}?`)){
        const series = await getProvider().fetchSeries(sym, k, intervalSel, lookback)
        setWatch(w => w.map(x => x.ticker===lowest.w.ticker ? { ticker: sym, kind: k, series } : x))
      }
    } catch {}
  }

  function pushSuggestion(s: Suggestion){
    setSuggestions(prev => {
      const exists = prev.find(p => p.ticker===s.ticker && Math.abs(p.at - s.at) < 60_000)
      const next = exists ? prev : [s, ...prev].slice(0, 30)
      try { localStorage.setItem(STORAGE_SUGG, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function remove(i: number){
    setWatch(w => w.filter((_,idx)=>idx!==i))
  }

  // Load saved watchlist or seed initial examples on first load
  useEffect(()=>{
    // Listen for updater status events from main
    let off: any
    try {
      // @ts-ignore
      off = window?.desktop?.onUpdateStatus?.((p: any)=>{
        if (!p || !p.status) return
        setUpdateState(p)
        if (p.status === 'ready'){
          setUpdateMsg('Installing update...')
          setTimeout(()=>setUpdateMsg(null), 4000)
        }
      })
    } catch {}
    return ()=>{ try { off && off() } catch {} }
  },[])
    ;(async()=>{
      try {
        const raw = localStorage.getItem(STORAGE_WATCH)
        const saved: SavedItem[] | null = raw ? JSON.parse(raw) : null
        if (saved && Array.isArray(saved) && saved.length > 0) {
          const loaded: WatchItem[] = []
          for (const s of saved.slice(0,10)){
            const k = (s.kind==='crypto' ? 'crypto' : 'stock') as 'stock'|'crypto'
            const series = await getProvider().fetchSeries(s.ticker, k, intervalSel, lookback)
            loaded.push({ ticker: s.ticker, kind: k, series })
          }
          setWatch(loaded)
          try { const mod = await import('@/lib/signal'); const map: Record<string,number> = {}; for (const w of loaded){ map[w.ticker] = mod.scoreBullish(w.series).score }; prevScoresRef.current = map } catch {}
        } else {
          const seeds = ['AAPL','MSFT','TSLA','BTCUSD']
          const seeded: WatchItem[] = []
          for (const s of seeds.slice(0,3)){
            const k: 'stock'|'crypto' = s.includes('USD') ? 'crypto' : 'stock'
            const series = await getProvider().fetchSeries(s, k, intervalSel, lookback)
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
      try {
        const sraw = localStorage.getItem(STORAGE_SUGG)
        if (sraw){ const arr = JSON.parse(sraw); if (Array.isArray(arr)) setSuggestions(arr) }
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
          const series = await getProvider().fetchSeries(w.ticker, w.kind, intervalSel, lookback)
          return { ...w, series }
        }))
        const mod = await import('@/lib/signal')
        const becameStrong: string[] = []
        const nextScores: Record<string, number> = { ...prevScoresRef.current }
        for (let i=0;i<results.length;i++){
          const tkr = results[i].ticker
          const prevScore = prevScoresRef.current[tkr] ?? 0
          const sig = mod.scoreBullish(results[i].series)
          const nextScore = sig.score
          nextScores[tkr] = nextScore
          if (prevScore < 75 && nextScore >= 75) {
            becameStrong.push(tkr)
            // Start a learn experiment on strong signal cross
            try { startExperiment(tkr, results[i].series) } catch {}
            // Push a suggestion
            pushSuggestion({ ticker: tkr, score: nextScore, prob: probHitTP1FromScore(nextScore), at: Date.now(), source: 'alert' })
          }
          // Update learning outcomes with the latest series
          try { updateWithSeries(tkr, results[i].series) } catch {}

          // Breakout detection: last close above prior 20 high with volume impulse
          const closes = results[i].series.map(c=>c.c)
          const highs = results[i].series.map(c=>c.h)
          const vols = results[i].series.map(c=>c.v||0)
          if (highs.length>22){
            const lastIdx = highs.length-1
            const priorHigh = Math.max(...highs.slice(-21,-1))
            const volAvg = vols.slice(-20).reduce((a,b)=>a+b,0) / 20
            const volImpulse = volAvg>0 ? (vols[lastIdx] / volAvg) : 0
            const broke = closes[lastIdx] > priorHigh && volImpulse >= 1.3
            if (broke){
              pushSuggestion({ ticker: tkr, score: nextScore, prob: probHitTP1FromScore(nextScore), at: Date.now(), source: 'breakout' })
            }
          }
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
  },[watch.length, intervalSel, lookback])

  // Market-wide scan to seed suggestions periodically
  useEffect(()=>{
    let stop = false
    async function runScan(){
      try{
        const picks = await scanTopPicks(getProvider(), 5, 0.85)
        for (const p of picks){
          pushSuggestion({ ticker: p.ticker, score: p.score, prob: p.prob, at: Date.now(), source: 'scan' })
        }
      } catch {}
    }
    runScan()
    const id = setInterval(runScan, Math.max(2*REFRESH_MS, 120000))
    return ()=>{ stop = true; clearInterval(id) }
  },[])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 glow grid place-items-center">
            <Rocket className="text-slate-900" size={20} />
          </div>
          <div>
            <div className="text-2xl font-black">THE ZAi</div>
            <div className="text-xs opacity-70 -mt-1">Futuristic, simple, and focused on learning by doing</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="opacity-70 text-xs mr-2">Max 10 · Interval/Depth apply to data</div>
          <select value={intervalSel} onChange={e=>{ const v = e.target.value as any; setIntervalSel(v); try{ localStorage.setItem('bbs.interval', v) }catch{} }} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-2 py-1 text-xs">
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="1h">1h</option>
            <option value="1d">1d</option>
          </select>
          <select value={lookback} onChange={e=>{ const v=Number(e.target.value); setLookback(v); try{ localStorage.setItem('bbs.lookback', String(v)) }catch{} }} className="rounded-xl bg-slate-900/80 border border-slate-700/60 px-2 py-1 text-xs">
            <option value={120}>120 bars</option>
            <option value={180}>180 bars</option>
            <option value={300}>300 bars</option>
            <option value={500}>500 bars</option>
          </select>
          <button onClick={()=>setShowTop(true)} className="text-xs px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800/60">Top Picks</button>
          <Settings onSaved={async()=>{ setUpdateMsg('Settings saved'); setTimeout(()=>setUpdateMsg(null),2000); setProvBump(x=>x+1); try{ const results = await Promise.all(watch.map(async (w)=>({ ...w, series: await getProvider().fetchSeries(w.ticker, w.kind, intervalSel, lookback) }))); setWatch(results) }catch{} }} />
          <button onClick={checkUpdates} className="text-xs px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800/60">Check updates</button>
          <button onClick={()=>{ if (confirm('Reset app state?')){ localStorage.removeItem(STORAGE_WATCH); localStorage.removeItem(STORAGE_INPUT); setWatch([]); setTicker(''); setKind('stock'); setUpdateMsg('Reset complete'); setTimeout(()=>setUpdateMsg(null),2500) } }} className="text-xs px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800/60">Reset</button>
        </div>
      </header>

      <Discovery />
      <Suggestions suggestions={suggestions} onPick={addTickerBySymbol} onDismiss={(s)=>{
        setSuggestions(prev=>{ const next = prev.filter(x=> !(x.ticker===s.ticker && x.at===s.at)); try { localStorage.setItem(STORAGE_SUGG, JSON.stringify(next)) } catch {}; return next })
      }} />

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

      {/* Watchlist table */}
      {watch.length>0 && (
        <div className="card p-3 space-y-2">
          <div className="grid grid-cols-12 gap-2 px-1 text-[11px] uppercase tracking-wider opacity-70">
            <div className="col-span-3">Mini Chart</div>
            <div>Ticker</div>
            <div>Price</div>
            <div>Buy-in</div>
            <div>Target</div>
            <div>Stop</div>
            <div>Take Profit</div>
            <div>Capital ($)</div>
            <div>Shares</div>
            <div>Probability (%)</div>
            <div>Help</div>
          </div>
          <div className="space-y-2">
            {watch.map((w, i)=>(
              <TickerRow key={w.ticker} ticker={w.ticker} series={w.series} onRemove={()=>remove(i)} />
            ))}
          </div>
        </div>
      )}

      <footer className="pt-8 text-xs opacity-60">
        Educational use only. Not financial advice. Plug in a real market data provider before live use.
      </footer>
      {updateMsg && (
        <div className="fixed bottom-6 right-6 card px-4 py-3 text-sm">{updateMsg}</div>
      )}
      {updateState && (
        <div className="fixed bottom-6 right-6 card px-4 py-3 text-sm min-w-[220px]">
          {updateState.status === 'available' && <div>Update available… preparing download</div>}
          {updateState.status === 'downloading' && (
            <div>
              <div>Downloading update… {Math.round(updateState.progress||0)}%</div>
            </div>
          )}
          {updateState.status === 'ready' && <div>Installing update…</div>}
          {updateState.status === 'error' && <div className="text-rose-300">Update error: {updateState.message||'unknown'}</div>}
        </div>
      )}
      {alerts.map((a,i)=>(
        <div
          key={i}
          className="fixed right-6 card px-4 py-3 text-sm"
          style={{ bottom: 24 + i*56 }}
        >{a}</div>
      ))}

      {showTop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 grid place-items-center" onClick={()=>setShowTop(false)}>
          <div className="card max-w-5xl w-full max-h-[80vh] overflow-auto p-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold">Top Picks</div>
              <button className="text-xs px-2 py-1 rounded-lg border border-slate-700/60" onClick={()=>setShowTop(false)}>Close</button>
            </div>
            <Suggestions suggestions={suggestions} onPick={(t)=>{ addTickerBySymbol(t); setShowTop(false) }} onDismiss={(s)=>{
              setSuggestions(prev=>{ const next = prev.filter(x=> !(x.ticker===s.ticker && x.at===s.at)); try { localStorage.setItem(STORAGE_SUGG, JSON.stringify(next)) } catch {}; return next })
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

