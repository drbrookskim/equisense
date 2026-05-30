/**
 * 클라이언트 사이드 API 함수.
 *
 * Cloudflare Worker 프록시를 통해 Yahoo Finance / DART API를 직접 호출합니다.
 * 백엔드 없음 — output: export와 완전히 호환됩니다.
 */

import type {
  AnalysisJob,
  DocType,
  FundamentalAnalysis,
  Market,
  MoatAnalysis,
  TechnicalAnalysis,
  TechnicalPeriod,
  TriggerQualitativeResponse,
} from '@/types'
import { transformDartToFundamentals } from '@/lib/adapters/dart'
import { transformYahooToFundamentals, transformYahooToTechnical } from '@/lib/adapters/yahoo'
import { calculateMoat } from '@/lib/adapters/moat'

const PROXY = process.env.NEXT_PUBLIC_PROXY_URL ?? ''
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const SUMMARY_MODULES = [
  'incomeStatementHistory',
  'balanceSheetHistory',
  'cashflowStatementHistory',
  'defaultKeyStatistics',
].join(',')

async function proxyFetch<T>(path: string): Promise<T> {
  if (!PROXY) throw new Error('NEXT_PUBLIC_PROXY_URL이 설정되지 않았습니다.')
  const res = await fetch(`${PROXY}${path}`)
  if (!res.ok) throw new Error(`Proxy ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

// corp-codes.json은 GitHub Pages 정적 파일로 제공 (CF Worker IP 차단 우회)
let _corpCodeMap: Record<string, string> | null = null

async function getCorpCode(stockCode: string): Promise<string> {
  if (!_corpCodeMap) {
    const res = await fetch(`${BASE_PATH}/corp-codes.json`)
    if (!res.ok) throw new Error('corp-codes.json 로드 실패')
    _corpCodeMap = await res.json() as Record<string, string>
  }
  const corpCode = _corpCodeMap[stockCode]
  if (!corpCode) throw new Error(`DART: 기업코드 없음 (${stockCode})`)
  return corpCode
}

export async function getFundamentals(ticker: string, market: Market): Promise<FundamentalAnalysis> {
  if (market === 'KR') {
    const corpCode = await getCorpCode(ticker)

    const year = new Date().getFullYear() - 1
    const [dartData, yahooData] = await Promise.all([
      proxyFetch<unknown>(`/dart/fs?corp_code=${corpCode}&year=${year}`),
      proxyFetch<unknown>(
        `/yahoo/summary?symbol=${ticker}&market=KR&modules=defaultKeyStatistics,financialData`,
      ).catch(() => null),
    ])

    const yahooResult = (
      yahooData as { quoteSummary?: { result?: Record<string, unknown>[] } } | null
    )?.quoteSummary?.result?.[0] ?? {}

    const keyStats = {
      ...((yahooResult.defaultKeyStatistics as Record<string, unknown>) ?? {}),
      ...((yahooResult.financialData as Record<string, unknown>) ?? {}),
    }

    return transformDartToFundamentals(dartData, keyStats, ticker)
  }

  const data = await proxyFetch<unknown>(
    `/yahoo/summary?symbol=${ticker}&modules=${SUMMARY_MODULES}`,
  )
  return transformYahooToFundamentals(data, ticker, market)
}

export async function getMoatScore(ticker: string, market: Market): Promise<MoatAnalysis> {
  const fundamentals = await getFundamentals(ticker, market)
  return calculateMoat(fundamentals)
}

export async function getTechnicalData(
  ticker: string,
  market: Market,
  period: TechnicalPeriod = '1y',
): Promise<TechnicalAnalysis> {
  const rangeMap: Record<TechnicalPeriod, string> = {
    '1m': '1mo',
    '3m': '3mo',
    '6m': '6mo',
    '1y': '1y',
    '3y': '3y',
  }
  const data = await proxyFetch<unknown>(
    `/yahoo/chart?symbol=${ticker}&market=${market}&range=${rangeMap[period]}&interval=1d`,
  )
  return transformYahooToTechnical(data, ticker, market, period)
}

/** @deprecated LLM 백엔드 미구현 — 향후 지원 예정 */
export async function triggerQualitativeAnalysis(
  _ticker: string,
  _market: Market,
  _fiscal_year: number,
  _doc_type: DocType,
): Promise<TriggerQualitativeResponse> {
  throw new Error('정성적 분석은 현재 지원되지 않습니다.')
}

/** @deprecated LLM 백엔드 미구현 — 향후 지원 예정 */
export async function getJobStatus(_jobId: string): Promise<AnalysisJob> {
  throw new Error('작업 상태 조회는 현재 지원되지 않습니다.')
}

/** @deprecated 백엔드 미사용 */
export async function getPrice(_ticker: string): Promise<{ data: null; cached: false }> {
  return { data: null, cached: false }
}
