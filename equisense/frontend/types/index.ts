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
  icr: number | null           // 이자보상배율 = 영업이익 / 이자비용
  peg_ratio: number | null     // PEG = PER / EPS성장률 (US만, KR null)
  week52_high: number | null   // 52주 고가 (최신 연도만, 나머지 null)
  week52_low: number | null    // 52주 저가 (최신 연도만, 나머지 null)
  current_price: number | null // 현재가 (최신 연도만, 나머지 null)
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
  name: string | null
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
// Module 4: 기술적 분석
// ──────────────────────────────────────────────

export type TechnicalPeriod = '1m' | '3m' | '6m' | '1y' | '3y'

export interface TechnicalDataPoint {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  change_pct: number | null
}

export interface TechnicalSummary {
  start_price: number | null
  end_price: number | null
  period_return_pct: number | null
  high_period: number | null
  low_period: number | null
  avg_volume: number | null
}

export interface TechnicalAnalysis {
  ticker: string
  market: Market
  period: TechnicalPeriod
  data_points: TechnicalDataPoint[]
  summary: TechnicalSummary
}

// ──────────────────────────────────────────────
// Module 3: 정성적 분석
// ──────────────────────────────────────────────

export type DocType = 'annual_report' | 'earnings_call'
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface RiskFactor {
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface GrowthDriver {
  title: string
  description: string
}

export interface NoiseFilterItem {
  claim: string
  is_substantiated: boolean
  evidence: string
}

export interface QualitativeResult {
  id: string
  job_id: string
  ticker: string
  fiscal_period: string
  integrity_score: number | null
  summary_ko: string | null
  risk_factors: RiskFactor[] | null
  growth_drivers: GrowthDriver[] | null
  noise_filter: NoiseFilterItem[] | null
  created_at: string
}

export interface AnalysisJob {
  job_id: string
  status: JobStatus
  result: QualitativeResult | null
  error: string | null
}

export interface TriggerQualitativeRequest {
  market: Market
  fiscal_year: number
  doc_type: DocType
}

export interface TriggerQualitativeResponse {
  job_id: string
  status: 'PENDING'
  estimated_seconds: number
}

// ──────────────────────────────────────────────
// 분기별 인사이트
// ──────────────────────────────────────────────

export interface QuarterlyPoint {
  label: string       // "2024 Q3"
  value: number | null
}

export interface QuarterlyInsight {
  quarters: QuarterlyPoint[]    // 최대 3개, 오름차순
  trend_line: string            // "Q2 14.8% → Q3 16.1% → Q4 17.3%"
  momentum_label: string        // "↑ 3분기 연속 상승 · 모멘텀 가속"
  direction: 'up' | 'down' | 'mixed' | 'flat'
  insufficient?: boolean        // true = 유효 데이터 포인트 < 2 (연간 fallback 트리거)
}

export type QuarterlyInsightMap = Partial<Record<string, QuarterlyInsight>>

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
