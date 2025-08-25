export type Sector = 'Tech'|'Semis'|'Finance'|'Consumer'|'Healthcare'|'Energy'|'Industrials'|'Materials'|'Crypto'

export const SECTOR_TICKERS: Record<Sector, string[]> = {
  Tech: ['AAPL','MSFT','NVDA','AMZN','META','GOOGL','ADBE','CRM','NOW','ORCL','INTU','SHOP','PANW','UBER'],
  Semis: ['AMD','AVGO','QCOM','MU','INTC','ASML','TSM','SMH'],
  Finance: ['JPM','BAC','MS','GS','SCHW','V','MA','AXP'],
  Consumer: ['COST','WMT','HD','LOW','NKE','SBUX','MCD','PG','KO','PEP'],
  Healthcare: ['LLY','UNH','JNJ','PFE','MRK','ABT','TMO'],
  Energy: ['XOM','CVX','COP','SLB','EOG'],
  Industrials: ['CAT','DE','HON','GE','BA','UPS'],
  Materials: ['LIN','SHW','FCX','NEM'],
  Crypto: ['BTCUSD','ETHUSD','SOLUSD','ADAUSD','XRPUSD']
}

export function getUniverse(selected?: Sector[]): string[] {
  const sectors = selected && selected.length>0 ? selected : (Object.keys(SECTOR_TICKERS) as Sector[])
  const set = new Set<string>()
  for (const s of sectors){
    for (const t of SECTOR_TICKERS[s]) set.add(t)
  }
  return Array.from(set)
}

