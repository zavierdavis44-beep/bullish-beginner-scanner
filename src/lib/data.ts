export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }
export type Series = Candle[]

// Provider interface you can swap for real APIs (Polygon, Alpaca, Binance, Finnhub, etc.)
export interface DataProvider {
  fetchSeries: (ticker: string, kind: 'stock'|'crypto', interval: '1m'|'5m'|'1h'|'1d', lookback: number) => Promise<Series>
}

// Simple Polygon.io provider (requires VITE_POLYGON_KEY)
export const PolygonProvider: DataProvider = {
  async fetchSeries(ticker, kind, interval, lookback) {
    let apiKey: string | undefined
    try { apiKey = window?.localStorage?.getItem?.('bbs.polygonKey') || undefined } catch {}
    if (!apiKey) apiKey = (import.meta as any).env?.VITE_POLYGON_KEY
    if (!apiKey) return FreeProvider.fetchSeries(ticker, kind, interval, lookback)
    try {
      const timespan = interval === '1m' ? 'minute'
        : interval === '5m' ? 'minute'
        : interval === '1h' ? 'hour'
        : 'day'
      const multiplier = interval === '5m' ? 5 : 1
      const msPerCandle = interval === '1m' ? 60_000 : interval === '5m' ? 5*60_000 : interval === '1h' ? 60*60_000 : 24*60*60_000
      const to = new Date().toISOString()
      const from = new Date(Date.now() - lookback * msPerCandle).toISOString()
      const polyTicker = kind === 'crypto' ? (ticker.startsWith('X:') ? ticker : `X:${ticker}`) : ticker
      const url = `https://api.polygon.io/v2/aggs/ticker/${polyTicker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${apiKey}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Polygon error ${res.status}`)
      const json = await res.json()
      const results = (json.results||[]) as any[]
      return results.map(r => ({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v })) as Series
    } catch (e) {
      return FreeProvider.fetchSeries(ticker, kind, interval, lookback)
    }
  }
}

function hasDesktopFetch(){
  try { return typeof (window as any)?.desktop?.fetchJson === 'function' } catch { return false }
}
async function fetchJson(url: string){
  try {
    if (hasDesktopFetch()){
      // @ts-ignore
      const data = await (window as any).desktop.fetchJson(url)
      if (data && (data as any).__error) throw new Error((data as any).message||'Fetch failed')
      return data
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error('HTTP '+res.status)
    return await res.json()
  } catch (e){ throw e }
}

// Free provider using public endpoints: Yahoo Finance for stocks, Binance for crypto
export const FreeProvider: DataProvider = {
  async fetchSeries(ticker, kind, interval, lookback){
    if (kind === 'crypto'){
      // Normalize common crypto inputs: XRP -> XRPUSDT, BTC-USD -> BTCUSDT, X:BTCUSD -> BTCUSDT
      function normCryptoSymbols(t: string){
        let s = String(t||'').toUpperCase().trim()
        s = s.replace(/^X:/, '')
        s = s.replace(/[-_]/g, '')
        let binance = s
        if (binance.endsWith('USDT')) { /* ok */ }
        else if (binance.endsWith('USD')) binance = binance.replace(/USD$/, 'USDT')
        else binance = binance + 'USDT'
        const yahoo = s.endsWith('USD') ? s.replace(/USD$/, '-USD') : (s.endsWith('USDT') ? s.replace(/USDT$/, '-USD') : (s + '-USD'))
        return { binance, yahoo }
      }
      const { binance, yahoo } = normCryptoSymbols(ticker)
      const i = interval === '1m' ? '1m' : interval === '5m' ? '5m' : interval === '1h' ? '1h' : '1d'
      const limit = Math.min(1000, lookback)
      try {
        const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binance)}&interval=${i}&limit=${limit}`
        const json = await fetchJson(url)
        if (!Array.isArray(json)) throw new Error('Binance error')
        return json.map((k: any[])=>({ t: k[0], o:+k[1], h:+k[2], l:+k[3], c:+k[4], v:+k[5] })) as Series
      } catch {
        // Fallback to Yahoo Finance crypto chart (e.g., XRP-USD)
        const yi = interval === '1m' ? '1m' : interval === '5m' ? '5m' : interval === '1h' ? '60m' : '1d'
        const range = interval === '1d' ? '1mo' : interval === '1h' ? '5d' : '1d'
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=${yi}&range=${range}`
        const json = await fetchJson(url)
        const r = json?.chart?.result?.[0]
        const ts: number[] = r?.timestamp || []
        const o = r?.indicators?.quote?.[0]?.open || []
        const h = r?.indicators?.quote?.[0]?.high || []
        const l = r?.indicators?.quote?.[0]?.low || []
        const c = r?.indicators?.quote?.[0]?.close || []
        const v = r?.indicators?.quote?.[0]?.volume || []
        const out: Series = []
        for (let idx=0; idx<ts.length; idx++) out.push({ t: ts[idx]*1000, o:+(o[idx]??c[idx]??0), h:+(h[idx]??c[idx]??0), l:+(l[idx]??c[idx]??0), c:+(c[idx]??0), v:+(v[idx]??0) })
        return out.slice(-lookback)
      }
    }
    // Stocks via Yahoo Finance chart API
    const i = interval === '1m' ? '1m' : interval === '5m' ? '5m' : interval === '1h' ? '60m' : '1d'
    // Choose a range that covers lookback
    const range = interval === '1d' ? '1mo' : interval === '1h' ? '5d' : '1d'
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${i}&range=${range}`
    const json = await fetchJson(url)
    const r = json?.chart?.result?.[0]
    const ts: number[] = r?.timestamp || []
    const o = r?.indicators?.quote?.[0]?.open || []
    const h = r?.indicators?.quote?.[0]?.high || []
    const l = r?.indicators?.quote?.[0]?.low || []
    const c = r?.indicators?.quote?.[0]?.close || []
    const v = r?.indicators?.quote?.[0]?.volume || []
    const series: Series = []
    for (let i=0;i<ts.length;i++){
      series.push({ t: ts[i]*1000, o:+(o[i]??c[i]??0), h:+(h[i]??c[i]??0), l:+(l[i]??c[i]??0), c:+(c[i]??0), v:+(v[i]??0) })
    }
    return series.slice(-lookback)
  }
}

export function getProvider(): DataProvider {
  try {
    let prefer = ''
    try { prefer = String(window?.localStorage?.getItem?.('bbs.provider')||'').toLowerCase() } catch {}
    const env = (import.meta as any).env || {}
    if (!prefer) prefer = String(env?.VITE_PROVIDER||'').toLowerCase()
    if (prefer === 'free') return FreeProvider
    if (prefer === 'polygon') return PolygonProvider
    const key = ((): string|undefined => {
      try { return window?.localStorage?.getItem?.('bbs.polygonKey') || undefined } catch { return env?.VITE_POLYGON_KEY }
    })()
    if (key) return PolygonProvider
    return FreeProvider
  } catch {}
  return FreeProvider
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
