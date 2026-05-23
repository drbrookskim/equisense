import type {
  FundamentalAnalysis,
  Market,
  MoatAnalysis,
  QualitativeIndex,
  QualitativeResult,
  TechnicalAnalysis,
  TechnicalPeriod,
  Watchlist,
} from '@/types'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

async function readJson<T>(path: string): Promise<T> {
  const url = `${BASE_PATH}${path}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw Object.assign(new Error(`Not found: ${url}`), { status: res.status })
  }
  return res.json() as Promise<T>
}

export async function getWatchlist(): Promise<Watchlist> {
  return readJson('/data/watchlist.json')
}

export async function getFundamentals(
  ticker: string,
  market: Market,
): Promise<FundamentalAnalysis> {
  return readJson(`/data/fundamentals/${ticker}_${market}.json`)
}

export async function getMoatScore(ticker: string, market: Market): Promise<MoatAnalysis> {
  return readJson(`/data/moat/${ticker}_${market}.json`)
}

export async function getTechnicalData(
  ticker: string,
  market: Market,
  period: TechnicalPeriod = '1y',
): Promise<TechnicalAnalysis> {
  return readJson(`/data/technical/${ticker}_${market}_${period}.json`)
}

export async function getQualitativeIndex(
  ticker: string,
  market: Market,
): Promise<QualitativeIndex> {
  return readJson(`/data/qualitative/${ticker}_${market}_index.json`)
}

export async function getQualitativeResult(
  ticker: string,
  market: Market,
  year: number,
  docType: string,
): Promise<QualitativeResult> {
  return readJson(`/data/qualitative/${ticker}_${market}_${year}_${docType}.json`)
}
