export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }
export type Series = Candle[]

// Provider interface you can swap for real APIs (Polygon, Alpaca, Binance, Finnhub, etc.)
export interface DataProvider {
  fetchSeries: (ticker: string, kind: 'stock'|'crypto', interval: '1m'|'5m'|'1h'|'1d', lookback: number) => Promise<Series>
}

// Mock provider: generates vaguely realistic uptrending/downtrending data
export const MockProvider: DataProvider = {
  async fetchSeries(ticker, kind, interval, lookback) {
    const now = Date.now()
    const candles: Series = []
    let price = Math.max(5, Math.random() * 150)
    for (let i=lookback; i>0; i--) {
      const t = now - i * 60_000
      const drift = (Math.sin(i/20) + Math.random()*0.4 - 0.2) * (price*0.002)
      price = Math.max(0.5, price + drift)
      const o = price * (1 - (Math.random()*0.01))
      const c = price * (1 + (Math.random()*0.01))
      const h = Math.max(o, c) * (1 + Math.random()*0.01)
      const l = Math.min(o, c) * (1 - Math.random()*0.01)
      candles.push({ t, o, h, l, c, v: Math.random()*1e6 })
    }
    return candles
  }
}

/** Example real provider (Polygon.io)
import { Candle, Series, DataProvider } from './data'
export const PolygonProvider: DataProvider = {
  async fetchSeries(ticker, kind, interval, lookback) {
    const apiKey = import.meta.env.VITE_POLYGON_KEY
    // Map interval to Polygon's timespan
    const timespan = interval === '1m' ? 'minute' : interval === '5m' ? 'minute' : interval === '1h' ? 'hour' : 'day'
    const multiplier = interval === '5m' ? 5 : 1
    const to = new Date().toISOString()
    const from = new Date(Date.now() - lookback * 60_000).toISOString()
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${apiKey}`
    const res = await fetch(url)
    const json = await res.json()
    const results = (json.results||[]) as any[]
    return results.map(r => ({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v })) as Series
  }
}
*/
