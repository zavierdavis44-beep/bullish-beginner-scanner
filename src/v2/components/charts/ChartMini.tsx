import React, { useMemo, useState } from 'react'
import type { Series } from '@/lib/data'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Line, Tooltip } from 'recharts'
import { ema, rsi } from '@/lib/signal'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

export const ChartMini: React.FC<{
  ticker: string
  series: Series
  targets: { entry: number, stop: number, t1: number, t2: number }
}> = ({ ticker, series, targets }) => {
  const [hover, setHover] = useState(false)
  const data = useMemo(()=>{
    const closes = series.map(s=>s.c)
    const e9 = ema(closes, 9), e21 = ema(closes, 21), e50 = ema(closes, 50)
    const r = rsi(closes, 14)
    return series.map((c, i) => ({
      t: timeFmt.format(new Date(c.t)), c: +c.c.toFixed(2), e9:+e9[i].toFixed(2), e21:+e21[i].toFixed(2), e50:+e50[i].toFixed(2), rsi:+r[i].toFixed(1)
    }))
  },[series])
  const { entry, stop, t1, t2 } = targets
  return (
    <div className="relative" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
            <Tooltip contentStyle={{ background:'#0b1220', border:'1px solid rgba(100,116,139,.5)', borderRadius:8 }} labelStyle={{ color:'#94a3b8' }} formatter={(v: any, n: any)=>[String(v), n]} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {hover && (
        <div className="absolute left-4 right-4 -top-2 translate-y-[-100%] z-20 p-3 rounded-xl bg-slate-950/95 border border-slate-800/70 shadow-2xl backdrop-blur">
          <div className="text-xs opacity-70 mb-1">{ticker} · detail</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                <Tooltip contentStyle={{ background:'#0b1220', border:'1px solid rgba(100,116,139,.5)', borderRadius:8 }} labelStyle={{ color:'#94a3b8' }} formatter={(v: any, n: any)=>[String(v), n]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-16 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
  )
}
