// Lightweight self-learning: track signal outcomes and calibrate probability by score bins.
// Stores to localStorage so the model "learns" on each machine over time.

import type { Series } from './data'
import { scoreBullish } from './signal'

type Outcome = 'tp1'|'stop'
type Experiment = {
  id: string
  ticker: string
  startedAt: number // ms epoch
  score: number
  entry: number
  stop: number
  t1: number
  resolved?: Outcome
  resolvedAt?: number
}

const STORE = 'bbs.learn.experiments'

function load(): Experiment[] {
  try { const raw = localStorage.getItem(STORE); if (!raw) return []; const x = JSON.parse(raw); return Array.isArray(x) ? x : [] } catch { return [] }
}
function save(exps: Experiment[]){ try { localStorage.setItem(STORE, JSON.stringify(exps.slice(-500))) } catch {} }

export function startExperiment(ticker: string, series: Series){
  try {
    const exps = load()
    const now = Date.now()
    // Avoid spamming: if an unresolved experiment for ticker exists in last 2 hours, skip
    const recentOpen = exps.find(e => e.ticker===ticker && !e.resolved && now - e.startedAt < 2*60*60*1000)
    if (recentOpen) return
    const sig = scoreBullish(series)
    const exp: Experiment = {
      id: `${ticker}-${now}`,
      ticker,
      startedAt: now,
      score: sig.score,
      entry: sig.targets.entry,
      stop: sig.targets.stop,
      t1: sig.targets.t1,
    }
    exps.push(exp)
    save(exps)
  } catch {}
}

export function updateWithSeries(ticker: string, series: Series){
  try {
    const exps = load()
    const open = exps.filter(e => e.ticker===ticker && !e.resolved)
    if (open.length===0) return
    // Determine outcome: did TP1 or Stop trigger first AFTER experiment start?
    for (const e of open){
      let outcome: Outcome | undefined
      for (let i=0;i<series.length;i++){
        const c = series[i]
        if (c.t < e.startedAt) continue
        const hitStop = c.l <= e.stop
        const hitTP1 = c.h >= e.t1
        if (hitStop && hitTP1){
          // If both in same candle, assume worst-case: stop first unless body is strong up
          outcome = (c.c > c.o) ? 'tp1' : 'stop'
          break
        }
        if (hitStop){ outcome = 'stop'; break }
        if (hitTP1){ outcome = 'tp1'; break }
      }
      if (outcome){
        e.resolved = outcome
        e.resolvedAt = Date.now()
      }
    }
    save(exps)
  } catch {}
}

// Return calibrated probability from past outcomes near this score.
// Uses 10-point bins and requires a minimum sample size to trust.
export function getCalibratedProb(score: number): number | undefined {
  try {
    const exps = load().filter(e => e.resolved)
    if (exps.length < 20) return undefined
    const bin = Math.max(0, Math.min(9, Math.floor(score / 10)))
    const inBin = exps.filter(e => Math.floor(e.score/10) === bin)
    const minN = 8
    if (inBin.length < minN) return undefined
    const wins = inBin.filter(e => e.resolved==='tp1').length
    const p = wins / inBin.length
    // Clamp to safe range so UI stays conservative
    return Math.max(0.25, Math.min(0.9, p))
  } catch { return undefined }
}

