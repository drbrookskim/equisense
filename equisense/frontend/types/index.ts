// ──────────────────────────────────────────────
// Module 1: 펀더멘털
// ──────────────────────────────────────────────

export type Market = 'KR' | 'US'

export type TrendDirection = 'improving' | 'deteriorating' | 'stable'

export interface FundamentalMetrics {
  fiscal_year: number
  roe: number | null
  roa: number | null
  debt_ratio: number | null
  operating_margin: number | null
  fcf: number | null
  per: number | null
  pbr: number | null
}

export interface MetricTrend {
  metric_name: string
  values: [number, number][]
  cagr: number | null
  direction: TrendDirection
  yoy_changes: [number, number | null][]
}

export interface FundamentalAnalysis {
  ticker: string
  market: Market
  metrics_by_year: FundamentalMetrics[]
  trends: Record<string, MetricTrend>
}

// ──────────────────────────────────────────────
// Module 2: 해자
// ──────────────────────────────────────────────

export type MoatDimension =
  | 'cost_advantage'
  | 'intangible_assets'
  | 'switching_costs'
  | 'network_effects'

export type MoatGrade = 'wide' | 'narrow' | 'none'

export interface DimensionScore {
  dimension: MoatDimension
  score: number
  rationale: string | null
}

export interface MoatAnalysis {
  ticker: string
  market: Market
  fiscal_year: number
  dimension_scores: DimensionScore[]
  composite_score: number
  grade: MoatGrade
  analyst_note: string | null
  scored_at: string
}

// ──────────────────────────────────────────────
// 공통 에러
// ──────────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
  request_id: string
}

export interface ApiErrorResponse {
  error: ApiError
}
