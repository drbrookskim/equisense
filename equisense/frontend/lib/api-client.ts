/**
 * 클라이언트 사이드 API 함수.
 *
 * 브라우저에서 Amplify로 JWT를 획득한 뒤 API Gateway를 직접 호출합니다.
 * 서버 사이드 코드 없음 — output: export와 완전히 호환됩니다.
 */

import { getAuthHeaders } from '@/lib/auth'
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  })

  const json = await res.json()
  if (!res.ok) {
    throw Object.assign(new Error(json.error?.message ?? 'API error'), {
      status: res.status,
      code: json.error?.code,
    })
  }
  return json as T
}

export function getFundamentals(ticker: string, market: Market): Promise<FundamentalAnalysis> {
  return apiFetch(`/companies/${ticker}/fundamentals?market=${market}`)
}

export function getMoatScore(ticker: string, market: Market): Promise<MoatAnalysis> {
  return apiFetch(`/companies/${ticker}/moat?market=${market}`)
}

export function getTechnicalData(
  ticker: string,
  market: Market,
  period: TechnicalPeriod = '1y',
): Promise<TechnicalAnalysis> {
  return apiFetch(`/companies/${ticker}/technical?market=${market}&period=${period}`)
}

export function triggerQualitativeAnalysis(
  ticker: string,
  market: Market,
  fiscal_year: number,
  doc_type: DocType,
): Promise<TriggerQualitativeResponse> {
  return apiFetch(`/companies/${ticker}/qualitative`, {
    method: 'POST',
    body: JSON.stringify({ market, fiscal_year, doc_type }),
  })
}

export function getJobStatus(jobId: string): Promise<AnalysisJob> {
  return apiFetch(`/jobs/${jobId}`)
}

/** 인증 불필요 — Redis 캐시에서 실시간 주가 반환 (Lambda가 Redis 보호) */
export async function getPrice(ticker: string) {
  const res = await fetch(`${API_BASE}/prices/${ticker.toUpperCase()}`)
  if (!res.ok) return { data: null, cached: false }
  return res.json()
}
