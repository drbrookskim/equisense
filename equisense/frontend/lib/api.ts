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

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
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

export async function getFundamentals(
  ticker: string,
  market: Market,
): Promise<FundamentalAnalysis> {
  return apiFetch(`/companies/${ticker}/fundamentals?market=${market}`)
}

export async function getMoatScore(ticker: string, market: Market): Promise<MoatAnalysis> {
  return apiFetch(`/companies/${ticker}/moat?market=${market}`)
}

export async function getTechnicalData(
  ticker: string,
  market: Market,
  period: TechnicalPeriod = '1y',
): Promise<TechnicalAnalysis> {
  return apiFetch(`/companies/${ticker}/technical?market=${market}&period=${period}`)
}

export async function triggerQualitativeAnalysis(
  ticker: string,
  market: Market,
  fiscal_year: number,
  doc_type: DocType,
): Promise<TriggerQualitativeResponse> {
  const res = await fetch(`${API_BASE}/companies/${ticker}/qualitative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market, fiscal_year, doc_type }),
  })
  const json = await res.json()
  if (!res.ok) {
    throw Object.assign(new Error(json.error?.message ?? 'API error'), {
      status: res.status,
      code: json.error?.code,
    })
  }
  return json as TriggerQualitativeResponse
}

export async function getJobStatus(jobId: string): Promise<AnalysisJob> {
  return apiFetch(`/jobs/${jobId}`)
}
