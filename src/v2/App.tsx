import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getProvider, type Series } from '@/lib/data'
import { scoreBullish } from '@/lib/signal'
import { probHitTP1FromScore } from '@/lib/edge'
import { scanTopPicks } from '@/lib/scan'
import { startExperiment, updateWithSeries } from '@/lib/learn'
import { Header } from './components/Header'
import { Suggestions } from './components/Suggestions'
import { Watchlist } from './components/Watchlist'

type WatchItem = { ticker: string, kind: 'stock'|'crypto', series: Series }
type SavedItem = { ticker: string, kind: 'stock'|'crypto' }

const STORAGE_WATCH = 'bbs.watchlist'
const STORAGE_INPUT = 'bbs.input'
const STORAGE_SUGG = 'bbs.suggestions'
const REFRESH_MS = (()=>{ const v = Number((import.meta as any).env?.VITE_REFRESH_MS); return Number.isFinite(v) && v>0 ? v : 60000 })()

export default function App(){
  const prevScoresRef = useRef<Record<string, number>>({})
  const [watch, setWatch] = useState<WatchItem[]>([])
  const [ticker, setTicker] = useState('AAPL')
  const [kind, setKind] = useState<'stock'|'crypto'>('stock')
  const [suggestions, setSuggestions] = useState<{ ticker: string, score: number, prob: number, at: number, source: 'scan'|'alert'|'breakout' }[]>([])
  const [intervalSel, setIntervalSel] = useState<'1m'|'5m'|'1h'|'1d'>(()=>{ try { return (localStorage.getItem('bbs.interval') as any) || '5m' } catch { return '5m' } })
  const [lookback, setLookback] = useState<number>(()=>{ try { return Number(localStorage.getItem('bbs.lookback')||'180') } catch { return 180 } })
  const [tab, setTab] = useState<'watch'|'suggestions'>(()=>{ try { return (localStorage.getItem('bbs.tab') as any) || 'watch' } catch { return 'watch' } })

  const canAdd = watch.length < 10 && ticker.trim().length >= 1
  const suggestionsInput = useMemo(()=>watch.slice(0,5), [watch])

  function pushSuggestion(s: { ticker: string, score: number, prob: number, at: number, source: 'scan'|'alert'|'breakout' }){
    setSuggestions(prev => {
      const exists = prev.find(p => p.ticker===s.ticker && Math.abs(p.at - s.at) < 60_000)
      const next = exists ? prev : [s, ...prev].slice(0, 30)
      try { localStorage.setItem(STORAGE_SUGG, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function detectKind(sym: string): 'stock'|'crypto' {
    const s = (sym||'').toUpperCase()
    const cryptoBases = ['BTC','ETH','SOL','ADA','XRP','DOGE','BNB','LTC','DOT','AVAX','LINK']
    if (s.includes('USDT') || s.includes('USD')) return 'crypto'
    if (cryptoBases.some(b => s===b)) return 'crypto'
    return 'stock'
  }

  async function addTicker() {
    if (!canAdd) return
    const tkr = ticker.toUpperCase().trim()
    if (watch.some(w => w.ticker === tkr)) return
    const k = detectKind(tkr)
    const series = await getProvider().fetchSeries(tkr, k, intervalSel, lookback)
    setWatch(w => [...w, { ticker: tkr, kind: k, series }])
    setTicker('')
  }

  async function addTickerBySymbol(symIn: string){
    const sym = symIn.toUpperCase().trim()
    const k: 'stock'|'crypto' = detectKind(sym)
    if (watch.some(w=>w.ticker===sym)) return
    const series = await getProvider().fetchSeries(sym, k, intervalSel, lookback)
    if (watch.length < 10){
      setWatch(w => [...w, { ticker: sym, kind: k, series }])
      return
    }
    // Replace lowest score if full
    try { const mod = await import('@/lib/signal'); const scored = watch.map(w=>({ w, s: mod.scoreBullish(w.series).score })); const lowest = scored.reduce((a,b)=> b.s < a.s ? b : a, scored[0]); if (confirm(`Replace ${lowest.w.ticker} with ${sym}?`)){ setWatch(w => w.map(x => x.ticker===lowest.w.ticker ? { ticker: sym, kind: k, series } : x)) } } catch {}
  }

  useEffect(()=>{ try { localStorage.setItem(STORAGE_INPUT, JSON.stringify({ ticker, kind })) } catch {} }, [ticker, kind])
  useEffect(()=>{ try { localStorage.setItem('bbs.interval', intervalSel) } catch {}; try { localStorage.setItem('bbs.lookback', String(lookback)) } catch {} }, [intervalSel, lookback])
  useEffect(()=>{ try { localStorage.setItem('bbs.tab', tab) } catch {} }, [tab])
  useEffect(()=>{ try { const minimal: SavedItem[] = watch.map(w => ({ ticker: w.ticker, kind: w.kind })); localStorage.setItem(STORAGE_WATCH, JSON.stringify(minimal)) } catch {} },[watch])

  // Initial load
  useEffect(()=>{
    (async()=>{
      try {
        const raw = localStorage.getItem(STORAGE_WATCH)
        const saved: SavedItem[] | null = raw ? JSON.parse(raw) : null
        if (saved && saved.length>0){
          const loaded: WatchItem[] = []
          for (const s of saved.slice(0,10)){
            const k = (s.kind==='crypto' ? 'crypto' : 'stock') as 'stock'|'crypto'
            const series = await getProvider().fetchSeries(s.ticker, k, intervalSel, lookback)
            loaded.push({ ticker: s.ticker, kind: k, series })
          }
          setWatch(loaded)
          try { const map: Record<string,number> = {}; for (const w of loaded){ map[w.ticker] = scoreBullish(w.series).score }; prevScoresRef.current = map } catch {}
        } else {
          const seeds = ['AAPL','MSFT','TSLA','BTCUSD']
          const seeded: WatchItem[] = []
          for (const s of seeds.slice(0,3)){
            const k: 'stock'|'crypto' = s.includes('USD') ? 'crypto' : 'stock'
            const series = await getProvider().fetchSeries(s, k, intervalSel, lookback)
            seeded.push({ ticker: s, kind: k, series })
          }
          setWatch(seeded)
          try { const map: Record<string,number> = {}; for (const w of seeded){ map[w.ticker] = scoreBullish(w.series).score }; prevScoresRef.current = map } catch {}
        }
      } catch {}
      try { const sraw = localStorage.getItem(STORAGE_SUGG); if (sraw){ const arr = JSON.parse(sraw); if (Array.isArray(arr)) setSuggestions(arr) } } catch {}
    })()
  },[])

  // Refresh + alerts + learning
  useEffect(()=>{
    let stop = false
    let timer: any
    try { Notification?.requestPermission?.() } catch {}
    async function tick(){
      try{
        if (watch.length===0) return
        const results = await Promise.all(watch.map(async (w)=>({ ...w, series: await getProvider().fetchSeries(w.ticker, w.kind, intervalSel, lookback) })))
        const becameStrong: string[] = []
        const nextScores: Record<string, number> = { ...prevScoresRef.current }
        for (const r of results){
          const prev = prevScoresRef.current[r.ticker] ?? 0
          const sig = scoreBullish(r.series)
          const next = sig.score
          nextScores[r.ticker] = next
          if (prev < 75 && next >= 75){
            becameStrong.push(r.ticker)
            try { startExperiment(r.ticker, r.series) } catch {}
            pushSuggestion({ ticker: r.ticker, score: next, prob: probHitTP1FromScore(next), at: Date.now(), source: 'alert' })
          }
          try { updateWithSeries(r.ticker, r.series) } catch {}
          // Simple breakout
          const highs = r.series.map(c=>c.h), closes = r.series.map(c=>c.c), vols = r.series.map(c=>c.v||0)
          if (highs.length>22){
            const last = highs.length-1
            const hi = Math.max(...highs.slice(-21,-1))
            const va = vols.slice(-20).reduce((a,b)=>a+b,0)/20
            const imp = va>0 ? vols[last]/va : 0
            if (closes[last] > hi && imp>=1.3){ pushSuggestion({ ticker: r.ticker, score: next, prob: probHitTP1FromScore(next), at: Date.now(), source: 'breakout' }) }
          }
        }
        if (becameStrong.length>0){ try { new Notification('Bullish Alert', { body: becameStrong.join(', ') }) } catch {} }
        prevScoresRef.current = nextScores
        if (!stop) setWatch(results)
      } catch {}
    }
    timer = setInterval(tick, REFRESH_MS)
    return ()=>{ stop = true; if (timer) clearInterval(timer) }
  },[watch.length, intervalSel, lookback])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <Header intervalSel={intervalSel} setIntervalSel={setIntervalSel} lookback={lookback} setLookback={setLookback} tab={tab} setTab={setTab} />
      {tab==='watch' ? (
        <>
          <Watchlist watch={watch} setWatch={setWatch} ticker={ticker} setTicker={setTicker} kind={kind} setKind={setKind} canAdd={canAdd} addTicker={addTicker} />
        </>
      ) : (
        <>
          <div className="card p-4">
            <div className="text-sm uppercase tracking-widest opacity-70 mb-2">Suggestions</div>
            <Suggestions table suggestions={suggestions} onPick={addTickerBySymbol} onDismiss={(s)=>{ setSuggestions(prev=>{ const next = prev.filter(x=>!(x.ticker===s.ticker && x.at===s.at)); try{ localStorage.setItem(STORAGE_SUGG, JSON.stringify(next)) }catch{}; return next }) }} />
          </div>
        </>
      )}
      <footer className="pt-4 text-xs opacity-60">Educational use only. Not financial advice. Free provider (Yahoo/Binance) by default.</footer>
    </div>
  )
}
