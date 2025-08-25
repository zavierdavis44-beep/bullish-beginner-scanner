import type { Series } from './data'
import { getCalibratedProb } from './learn'

// Map signal score (0-100) to probability of hitting TP1 before Stop.
// This is a simple logistic shaping you can calibrate later.
export function probHitTP1FromScore(score: number) {
  const learned = getCalibratedProb(score)
  if (typeof learned === 'number' && Number.isFinite(learned)) return learned
  const k = 0.09 // slope of logistic
  const x0 = 60   // mid-point (50% at score ~60)
  const p = 1 / (1 + Math.exp(-k * (score - x0)))
  // Cap modestly to avoid overconfidence
  return Math.max(0.25, Math.min(0.85, p))
}

export function riskReward(entry: number, stop: number, t1: number) {
  const risk = Math.max(0.0001, entry - stop)
  const reward = Math.max(0, t1 - entry)
  return reward / risk
}

export function expectedValuePerShare(entry: number, stop: number, t1: number, probTP1: number) {
  const risk = Math.max(0.0001, entry - stop)
  const reward = Math.max(0, t1 - entry)
  return probTP1 * reward - (1 - probTP1) * risk
}

// Very lightweight linear regression forecast for the next n steps.
export function forecastLinear(series: Series, steps = 3) {
  if (!series || series.length < 5) return { next: [], slope: 0 }
  const closes = series.map(c => c.c)
  const n = closes.length
  const xs = Array.from({ length: n }, (_, i) => i + 1)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = closes.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * closes[i], 0)
  const sumXX = xs.reduce((a, x) => a + x * x, 0)
  const denom = n * sumXX - sumX * sumX || 1
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const lastX = xs[xs.length - 1]
  const next: number[] = []
  for (let i = 1; i <= steps; i++) next.push(intercept + slope * (lastX + i))
  return { next, slope }
}

export function worthTaking(score: number, entry: number, stop: number, t1: number) {
  const rr = riskReward(entry, stop, t1)
  const p = probHitTP1FromScore(score)
  const ev = expectedValuePerShare(entry, stop, t1, p)
  const ok = ev > 0 && rr >= 1.2 && p >= 0.5
  return { ok, rr, p, ev }
}
