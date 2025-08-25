import { getProvider, type DataProvider, type Series } from './data'
import { scoreBullish } from './signal'
import { probHitTP1FromScore } from './edge'
import { getUniverse, type Sector } from './universe'

export const STOCK_UNIVERSE = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','AMD','NFLX','AVGO','ADBE','QCOM','COST','JPM','BAC','KO','PEP','WMT','MA','V','LLY','UNH','HD'
]
export const CRYPTO_UNIVERSE = ['BTCUSD','ETHUSD','SOLUSD','ADAUSD','XRPUSD']

export type Pick = { ticker: string, series: Series, score: number, prob: number }

export async function scanTopPicks(
  provider: DataProvider = getProvider(),
  limit = 5,
  minProb = 0.9,
  opts?: { interval?: '1m'|'5m'|'1h'|'1d', lookback?: number, sectors?: Sector[] }
): Promise<Pick[]>{
  // Pick interval/lookback from opts or localStorage
  let interval: '1m'|'5m'|'1h'|'1d' = opts?.interval || ((): any => { try { return (localStorage.getItem('bbs.interval') as any) || '5m' } catch { return '5m' } })()
  let lookback = opts?.lookback ?? ((): number => { try { return Number(localStorage.getItem('bbs.lookback')||'180') } catch { return 180 } })()
  const sectors: Sector[] | undefined = opts?.sectors || ((): Sector[]|undefined => { try { const raw = localStorage.getItem('bbs.sectors'); if (!raw) return undefined; const arr = JSON.parse(raw); return Array.isArray(arr)? arr: undefined } catch { return undefined } })()
  const pool = getUniverse(sectors)
  const out: Pick[] = []
  for (const t of pool){
    const kind = t.includes('USD') ? 'crypto' : 'stock'
    try{
      const series = await provider.fetchSeries(t, kind as any, interval, lookback)
      const score = scoreBullish(series).score
      const prob = probHitTP1FromScore(score)
      if (prob >= minProb) out.push({ ticker: t, series, score, prob })
    } catch {}
  }
  return out.sort((a,b)=>b.prob - a.prob || b.score - a.score).slice(0, limit)
}
