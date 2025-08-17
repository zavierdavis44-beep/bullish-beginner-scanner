import type { Series } from './data'

function ema(values: number[], period: number) {
  const k = 2 / (period + 1)
  let emaPrev = values[0]
  const out = [emaPrev]
  for (let i=1;i<values.length;i++){
    emaPrev = values[i]*k + emaPrev*(1-k)
    out.push(emaPrev)
  }
  return out
}

function rsi(values: number[], period=14) {
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

export type SignalExplanation = {
  score: number // 0-100
  verdict: 'Strong'|'Moderate'|'Weak'|'Avoid'
  details: { label: string, value: string }[]
  targets: { entry: number, stop: number, t1: number, t2: number }
}

// Very simple scoring: confluence of EMA cross, RSI regime, and trend slope
export function scoreBullish(series: Series): SignalExplanation {
  const closes = series.map(c => c.c)
  const ema9 = ema(closes, 9)
  const ema21 = ema(closes, 21)
  const last = closes[closes.length-1]
  const last9 = ema9[ema9.length-1]
  const last21 = ema21[ema21.length-1]
  const r = rsi(closes)
  const lastRSI = r[r.length-1]

  const lookback = Math.min(20, closes.length - 1)
  const slope = lookback > 0 ? (closes[closes.length - 1] - closes[closes.length - 1 - lookback]) / lookback : 0
  const emaCross = last9 > last21 ? 1 : 0
  const rsiBull = lastRSI >= 50 ? 1 : 0
  const slopePos = slope > 0 ? 1 : 0

  const raw = (emaCross*0.45 + rsiBull*0.25 + slopePos*0.30) * 100
  const score = Math.round(Math.min(100, Math.max(0, raw + (Math.random()*6-3))))

  const entry = last
  const stop = Math.max(...closes.slice(-20)) * 0.92 // rough swing low buffer
  const t1 = entry * 1.03
  const t2 = entry * 1.06

  let verdict: SignalExplanation['verdict'] = 'Avoid'
  if (score >= 75) verdict = 'Strong'
  else if (score >= 60) verdict = 'Moderate'
  else if (score >= 50) verdict = 'Weak'

  return {
    score,
    verdict,
    details: [
      { label: 'EMA(9) vs EMA(21)', value: last9.toFixed(2)+' > '+last21.toFixed(2) },
      { label: 'RSI(14)', value: lastRSI.toFixed(1) },
      { label: 'Short-term slope', value: slope.toFixed(3) },
    ],
    targets: { entry, stop, t1, t2 }
  }
}
