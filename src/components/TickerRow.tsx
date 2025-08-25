import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Line } from 'recharts'
import { QPopover } from './ui/Popover'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import type { Series } from '@/lib/data'
import { scoreBullish, ema, rsi } from '@/lib/signal'
import { worthTaking, probHitTP1FromScore } from '@/lib/edge'
import { Info } from 'lucide-react'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
function toChart(series: Series){
  const closes = series.map(s=>s.c)
  const e9 = ema(closes, 9)
  const e21 = ema(closes, 21)
  const e50 = ema(closes, 50)
  const r = rsi(closes, 14)
  return series.map((c, i) => ({
    t: timeFmt.format(new Date(c.t)),
    c: +c.c.toFixed(2),
    e9: +e9[i].toFixed(2),
    e21: +e21[i].toFixed(2),
    e50: +e50[i].toFixed(2),
    rsi: +r[i].toFixed(1)
  }))
}

export const TickerRow: React.FC<{
  ticker: string
  series: Series
  onRemove: () => void
}> = ({ ticker, series, onRemove }) => {
  const [investment, setInvestment] = useState(500)
  const [hover, setHover] = useState(false)
  const chart = useMemo(()=>toChart(series), [series])
  const signal = useMemo(()=>scoreBullish(series), [series])
  const price = series.length ? series[series.length-1].c : 0
  const entry = signal.targets.entry || price || 1
  const stop = signal.targets.stop || price*0.95
  const t1 = signal.targets.t1 || price*1.02
  const t2 = signal.targets.t2 || price*1.04
  const shares = Math.max(0, Math.floor((investment / entry) * 100) / 100)
  const proj = shares * Math.max(0, t1 - entry)
  const edge = worthTaking(signal.score, entry, stop, t1)
  const pTP1 = probHitTP1FromScore(signal.score)
  // Keep detailed metrics inline and lean for perf

  return (
    <div className="relative grid grid-cols-12 gap-2 items-center p-2 rounded-md hover:bg-slate-900/40 group" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div className="col-span-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart}>
            <defs>
              <linearGradient id={`g-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Area type="monotone" dataKey="c" stroke="#00F0FF" fill={`url(#g-${ticker})`} strokeWidth={2} isAnimationActive={false} />
            <ReferenceLine y={entry} stroke="#FFFFFF" strokeDasharray="3 3" ifOverflow="extendDomain" />
            <ReferenceLine y={stop} stroke="#EF4444" strokeDasharray="3 3" ifOverflow="extendDomain" />
            <ReferenceLine y={t1} stroke="#22C55E" strokeDasharray="2 2" ifOverflow="extendDomain" />
            <ReferenceLine y={t2} stroke="#22C55E" strokeDasharray="2 2" ifOverflow="extendDomain" />
          </AreaChart>
        </ResponsiveContainer>
        {hover && (
          <div className="absolute left-4 right-4 -top-2 translate-y-[-100%] z-20 p-3 rounded-xl bg-slate-950/95 border border-slate-800/70 shadow-2xl backdrop-blur">
            <div className="text-xs opacity-70 mb-1">{ticker} · detail</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id={`g-lg-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#00F0FF" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Area type="monotone" dataKey="c" stroke="#00F0FF" fill={`url(#g-lg-${ticker})`} strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="e9" stroke="#00E5FF" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="e21" stroke="#8B5CF6" dot={false} strokeWidth={1.25} />
                  <Line type="monotone" dataKey="e50" stroke="#F59E0B" dot={false} strokeWidth={1} />
                  <ReferenceLine y={entry} stroke="#FFFFFF" strokeDasharray="3 3" ifOverflow="extendDomain" label={{ value: 'Entry', position: 'insideTopRight', fill: '#fff', fontSize: 10 }} />
                  <ReferenceLine y={stop} stroke="#EF4444" strokeDasharray="3 3" ifOverflow="extendDomain" label={{ value: 'Stop', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={t1} stroke="#22C55E" strokeDasharray="2 2" ifOverflow="extendDomain" label={{ value: 'TP1', position: 'insideTopRight', fill: '#22c55e', fontSize: 10 }} />
                  <ReferenceLine y={t2} stroke="#22C55E" strokeDasharray="2 2" ifOverflow="extendDomain" label={{ value: 'TP2', position: 'insideTopRight', fill: '#22c55e', fontSize: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <XAxis dataKey="t" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Line type="monotone" dataKey="rsi" stroke="#22C55E" dot={false} strokeWidth={1.25} />
                  <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="#94A3B8" strokeDasharray="2 2" />
                  <ReferenceLine y={30} stroke="#22C55E" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      <div className="text-sm font-bold flex items-center gap-2">
        {ticker}
        <QPopover trigger={<button aria-label="Explain" className="rounded-full p-1 hover:bg-slate-800/60"><Info size={14} /></button>}>
          <div className="space-y-1">
            <div className="text-sm font-semibold mb-1">Why bullish?</div>
            {signal.details.map((d,i)=>(<div key={i} className="text-xs flex justify-between gap-4"><span className="opacity-70">{d.label}</span><span className="font-mono">{d.value}</span></div>))}
            <div className="text-xs flex justify-between"><span className="opacity-70">Score</span><span className="font-mono">{signal.score}</span></div>
            <div className="text-xs pt-2 opacity-70">Entry/Stop/Targets are guidance only and not financial advice.</div>
          </div>
        </QPopover>
      </div>
      <div className="text-sm opacity-90">$ {price.toFixed(2)}</div>
      <div className="text-sm">$ {entry.toFixed(2)}</div>
      <div className="text-sm">$ {t1.toFixed(2)}</div>
      <div className="text-sm text-rose-300">$ {stop.toFixed(2)}</div>
      <div className="text-sm text-emerald-300">$ {t2.toFixed(2)}</div>
      <div>
        <Input
          type="number"
          value={investment}
          min={50}
          step={50}
          onChange={e=>setInvestment(+e.target.value)}
          className="w-24"
        />
      </div>
      <div className="text-sm">{shares}</div>
      <div className="text-sm">{(pTP1*100).toFixed(0)}%</div>
      <div className="flex items-center justify-end gap-2">
        <QPopover trigger={<button className="text-[10px] h-6 w-6 rounded-full bg-slate-800/70 hover:bg-slate-700/70 grid place-items-center" aria-label="How to spot"><span>?</span></button>}>
          <div className="space-y-1 max-w-sm">
            <div className="text-sm font-semibold mb-1">How to spot this</div>
            <div className="text-xs opacity-80">Look for EMA(9) above EMA(21), price holding above EMA(21), RSI above 50, and rising slope. Entry near pullback to EMA(9/21), stop under recent swing low, take profits at ATR-based levels.</div>
          </div>
        </QPopover>
        <button onClick={onRemove} className="text-xs px-2 py-1 rounded-lg border border-slate-700/60 hover:bg-slate-800/60">Remove</button>
      </div>
    </div>
  )
}
