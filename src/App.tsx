import React, { useEffect, useMemo, useState } from 'react'
import { MockProvider, type DataProvider, type Series } from '@/lib/data'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TickerRow } from '@/components/TickerRow'
import { Suggestions } from '@/components/Suggestions'
import { Rocket, Plus } from 'lucide-react'

type WatchItem = { ticker: string, kind: 'stock'|'crypto', series: Series }

const provider: DataProvider = MockProvider // swap to a real provider when ready

export default function App(){
  const [updateMsg, setUpdateMsg] = useState<string|null>(null)
  async function checkUpdates(){
    try{
      // @ts-ignore
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
    const series = await provider.fetchSeries(ticker.toUpperCase(), kind, '5m', 180)
    setWatch(w => [...w, { ticker: ticker.toUpperCase(), kind, series }])
    setTicker('')
  }

  function remove(i: number){
    setWatch(w => w.filter((_,idx)=>idx!==i))
  }

  // Seed with a couple examples on first load
  useEffect(()=>{
    ;(async()=>{
      const seeds = ['AAPL','MSFT','TSLA','BTCUSD']
      const seeded: WatchItem[] = []
      for (const s of seeds.slice(0,3)){
        const k: 'stock'|'crypto' = s.includes('USD') ? 'crypto' : 'stock'
        const series = await provider.fetchSeries(s, k, '5m', 180)
        seeded.push({ ticker: s, kind: k, series })
      }
      setWatch(seeded)
    })()
  },[])

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
        <div className="flex items-center gap-3">
          <div className="opacity-70 text-xs">Max 10 tickers · Mock data now · Plug in live data later</div>
          <button onClick={checkUpdates} className="text-xs px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800/60">Check for updates</button>
        </div>
      </header>

      {watch.length>0 && <Suggestions items={suggestionsInput} />}

      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Input placeholder="Ticker (e.g., AAPL or BTCUSD)" value={ticker} onChange={e=>setTicker(e.target.value)} className="w-60" />
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
    </div>
  )
}

