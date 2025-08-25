import type { Series } from './data'

export function ema(values: number[], period: number) {
  const k = 2 / (period + 1)
  let emaPrev = values[0]
  const out = [emaPrev]
  for (let i=1;i<values.length;i++){
    emaPrev = values[i]*k + emaPrev*(1-k)
    out.push(emaPrev)
  }
  return out
}

export function rsi(values: number[], period=14) {
  if (values.length < period+1) return Array(values.length).fill(50)
  let gains = 0, losses = 0
  for (let i=1;i<=period;i++){
    const diff = values[i] - values[i-1]
    if (diff>=0) gains += diff; else losses -= diff
  }
  let rs = gains / (losses||1e-9)
  let rsi = 100 - 100/(1+rs)
  const out = [rsi]
  for (let i=period+1; i<values.length; i++){
    const diff = values[i] - values[i-1]
    const gain = Math.max(0, diff)
    const loss = Math.max(0, -diff)
    gains = (gains*(period-1) + gain) / period
    losses = (losses*(period-1) + loss) / period
    rs = gains / (losses||1e-9)
    rsi = 100 - 100/(1+rs)
    out.push(rsi)
  }
  while (out.length < values.length) out.unshift(out[0])
  return out
}

function atr(series: Series, period=14) {
  if (series.length === 0) return [] as number[]
  const trs: number[] = []
  for (let i=0; i<series.length; i++){
    const c = series[i]
    const prev = series[i-1]
    const tr = i===0 ? (c.h - c.l) : Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c))
    trs.push(tr)
  }
  // RMA for ATR
  let out: number[] = []
  let rma = trs.slice(0, period).reduce((a,b)=>a+b,0) / Math.max(1, Math.min(period, trs.length))
  out[period-1] = rma
  for (let i=period; i<trs.length; i++){
    rma = (rma*(period-1) + trs[i]) / period
    out[i] = rma
  }
  while (out.length < trs.length) out.unshift(out[0] ?? trs[0])
  return out
}

export type SignalExplanation = {
  score: number // 0-100
  verdict: 'Strong'|'Moderate'|'Weak'|'Avoid'
  details: { label: string, value: string }[]
  targets: { entry: number, stop: number, t1: number, t2: number }
}

// Smarter scoring: EMA confluence, RSI regime, trend slope, volatility normalization, and volume impulse.
export function scoreBullish(series: Series): SignalExplanation {
  if (!series || series.length === 0) {
    return { score: 0, verdict: 'Avoid', details: [], targets: { entry: 0, stop: 0, t1: 0, t2: 0 } }
  }
  const closes = series.map(c => c.c)
  const vols = series.map(c => c.v || 0)
  const ema9 = ema(closes, 9)
  const ema21 = ema(closes, 21)
  const ema50 = ema(closes, 50)
  const ema200 = ema(closes, Math.min(200, Math.max(50, Math.round(series.length*0.6))))
  const last = closes[closes.length-1]
  const last9 = ema9[ema9.length-1]
  const last21 = ema21[ema21.length-1]
  const last50 = ema50[ema50.length-1]
  const last200 = ema200[ema200.length-1]
  const r = rsi(closes)
  const lastRSI = r[r.length-1]
  const a = atr(series, 14)
  const lastATR = a[a.length-1] || 0

  const lookback = Math.min(20, closes.length - 1)
  const slope = lookback > 0 ? (closes[closes.length - 1] - closes[closes.length - 1 - lookback]) / lookback : 0
  const emaCross = last9 > last21 ? 1 : 0
  const emaRegime = last21 > last50 ? 1 : 0
  const htfRegime = last50 > last200 ? 1 : 0
  const rsiBull = lastRSI >= 50 ? 1 : 0
  const slopePos = slope > 0 ? 1 : 0
  const volAvg = vols.slice(-20).reduce((a,b)=>a+b,0) / Math.max(1, Math.min(20, vols.length))
  const volImpulse = volAvg>0 ? Math.min(2, (vols[vols.length-1] / volAvg)) - 1 : 0 // -1..1

  // Base score with HTF confluence
  let raw = (emaCross*0.30 + emaRegime*0.15 + htfRegime*0.10 + rsiBull*0.18 + slopePos*0.17 + (Math.max(0, volImpulse))*0.10) * 100
  // Normalize by ATR relative to price: very high vol conditions reduce confidence slightly
  const atrPct = last ? (lastATR / last) : 0
  raw -= Math.min(15, atrPct*100) * 0.25

  const score = Math.round(Math.min(100, Math.max(0, raw)))

  // Targets: swing-based stop and R-multiples
  const swingLook = Math.min(20, series.length)
  const recentLow = Math.min(...series.slice(-swingLook).map(c=>c.l))
  const entry = last
  const stopBuf = Math.max(entry*0.005, lastATR*0.6)
  const rawStop = Math.min(entry - stopBuf, recentLow - lastATR*0.2)
  const safeStop = Math.max(0.01, rawStop)
  const risk = Math.max(0.0001, entry - safeStop)
  const t1 = entry + Math.max(risk, lastATR*0.8)
  const t2 = entry + Math.max(2*risk, lastATR*1.5)

  let verdict: SignalExplanation['verdict'] = 'Avoid'
  if (score >= 75) verdict = 'Strong'
  else if (score >= 60) verdict = 'Moderate'
  else if (score >= 50) verdict = 'Weak'

  return {
    score,
    verdict,
    details: [
      { label: 'EMA(9) > EMA(21)', value: (last9>last21)+' ('+last9.toFixed(2)+'/'+last21.toFixed(2)+')' },
      { label: 'EMA(21) > EMA(50)', value: (last21>last50)+' ('+last21.toFixed(2)+'/'+last50.toFixed(2)+')' },
      { label: 'EMA(50) > EMA(HTF)', value: (last50>last200)+' ('+last50.toFixed(2)+'/'+last200.toFixed(2)+')' },
      { label: 'RSI(14)', value: lastRSI.toFixed(1) },
      { label: 'Slope(20)', value: slope.toFixed(3) },
      { label: 'ATR(14)/Price', value: (atrPct*100).toFixed(2)+'%' },
    ],
    targets: { entry, stop: safeStop, t1, t2 }
  }
}
