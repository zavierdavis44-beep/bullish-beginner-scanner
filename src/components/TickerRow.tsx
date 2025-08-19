import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { QPopover } from './ui/Popover'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import type { Series } from '@/lib/data'
import { scoreBullish } from '@/lib/signal'
import { Info } from 'lucide-react'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
function toChart(series: Series){
  return series.map(c => ({ t: timeFmt.format(new Date(c.t)), c: +c.c.toFixed(2) }))
}

export const TickerRow: React.FC<{
  ticker: string
  series: Series
  onRemove: () => void
}> = ({ ticker, series, onRemove }) => {
  const [investment, setInvestment] = useState(500)
  const chart = useMemo(()=>toChart(series), [series])
  const signal = useMemo(()=>scoreBullish(series), [series])
  const price = series.length ? series[series.length-1].c : 0
  const safeEntry = signal.targets.entry || price || 1
  const shares = Math.max(0, Math.floor((investment / safeEntry) * 100) / 100)
  const proj = shares * Math.max(0, (signal.targets.t1 || price) - safeEntry)

  return (
    <div className="grid grid-cols-12 gap-3 items-center card p-3">
      <div className="col-span-3 h-20">
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
            <Area type="monotone" dataKey="c" stroke="#00F0FF" fill={`url(#g-${ticker})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="col-span-2 text-xl font-bold">{ticker}</div>
      <div className="col-span-1 text-sm opacity-80">$ {price.toFixed(2)}</div>

      <div className="col-span-3 text-xs">
        <div>Entry: <span className="font-semibold">$ {signal.targets.entry.toFixed(2)}</span></div>
        <div>Stop: <span className="text-rose-300">$ {signal.targets.stop.toFixed(2)}</span></div>
        <div>TP1/TP2: <span className="text-emerald-300">$ {signal.targets.t1.toFixed(2)}</span> / <span className="text-emerald-300">$ {signal.targets.t2.toFixed(2)}</span></div>
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <Input
          type="number"
          value={investment}
          min={50}
          step={50}
          onChange={e=>setInvestment(+e.target.value)}
          className="w-24"
        />
        <div className="text-xs opacity-80 leading-4">
          <div>Shares: <b>{shares}</b></div>
          <div>→ +$ {proj.toFixed(2)} @TP1</div>
        </div>
      </div>

      <div className="col-span-1 flex items-center justify-end gap-2">
        <span className={signal.score>=60?'badge badge-positive':'badge badge-negative'}>{signal.verdict} · {signal.score}</span>
        <QPopover trigger={<button aria-label="Explain" className="rounded-full p-2 hover:bg-slate-800/60"><Info size={16} /></button>}>
          <div className="space-y-1">
            <div className="text-sm font-semibold mb-1">Why bullish?</div>
            {signal.details.map((d,i)=>(<div key={i} className="text-xs flex justify-between gap-4"><span className="opacity-70">{d.label}</span><span className="font-mono">{d.value}</span></div>))}
            <div className="text-xs pt-2 opacity-70">Entry/Stop/Targets are guidance only and not financial advice.</div>
          </div>
        </QPopover>
        <Button variant="ghost" onClick={onRemove}>Remove</Button>
      </div>
    </div>
  )
}
