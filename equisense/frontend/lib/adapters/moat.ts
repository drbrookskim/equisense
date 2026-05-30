import type { DimensionScore, FundamentalAnalysis, MoatAnalysis, MoatGrade } from '@/types'

function score(value: number | null, thresholds: [number, number, number, number]): number {
  if (value == null) return 0
  const [t1, t2, t3, t4] = thresholds
  if (value >= t4) return 10
  if (value >= t3) return 7.5
  if (value >= t2) return 5
  if (value >= t1) return 2.5
  return 0
}

export function calculateMoat(fundamentals: FundamentalAnalysis): MoatAnalysis {
  const years = fundamentals.metrics_by_year
  const latest = years.at(-1)
  const fiscal_year = latest?.fiscal_year ?? new Date().getFullYear() - 1

  // Cost advantage: operating margin + low debt
  const opMargin = latest?.operating_margin ?? null
  const debtRatio = latest?.debt_ratio ?? null
  const opMarginScore = score(opMargin, [5, 10, 20, 30])
  const debtScore = debtRatio != null ? score(100 - debtRatio, [20, 40, 55, 70]) : 0
  const costAdvantage = (opMarginScore + debtScore) / 2

  // Intangible assets: ROE as proxy for brand/IP value
  const roe = latest?.roe ?? null
  const intangibleScore = score(roe, [5, 10, 15, 25])

  // Switching costs: revenue CAGR + trend direction
  const revCagr = fundamentals.trends.revenue.cagr ?? null
  const revDirection = fundamentals.trends.revenue.direction
  const cagrScore = score(revCagr, [0, 3, 7, 12])
  const directionBonus = revDirection === 'improving' ? 1 : revDirection === 'deteriorating' ? -1 : 0
  const switchingCosts = Math.min(10, Math.max(0, cagrScore + directionBonus))

  // Network effects: FCF margin as proxy
  const fcf = latest?.fcf ?? null
  const revVal = fundamentals.trends.revenue.values.at(-1)?.[1] ?? null
  const fcfMargin = fcf != null && revVal != null && revVal > 0 ? (fcf / revVal) * 100 : null
  const networkEffects = score(fcfMargin, [-5, 0, 5, 15])

  const dimension_scores: DimensionScore[] = [
    {
      dimension: 'cost_advantage',
      score: Math.round(costAdvantage * 10) / 10,
      rationale: opMargin != null ? `영업이익률 ${opMargin.toFixed(1)}%` : null,
    },
    {
      dimension: 'intangible_assets',
      score: Math.round(intangibleScore * 10) / 10,
      rationale: roe != null ? `ROE ${roe.toFixed(1)}%` : null,
    },
    {
      dimension: 'switching_costs',
      score: Math.round(switchingCosts * 10) / 10,
      rationale: revCagr != null ? `매출 CAGR ${revCagr.toFixed(1)}%` : null,
    },
    {
      dimension: 'network_effects',
      score: Math.round(networkEffects * 10) / 10,
      rationale: fcfMargin != null ? `FCF 마진 ${fcfMargin.toFixed(1)}%` : null,
    },
  ]

  const composite_score =
    dimension_scores.reduce((s, d) => s + d.score, 0) / dimension_scores.length
  const grade: MoatGrade =
    composite_score >= 7.5 ? 'wide' : composite_score >= 5.0 ? 'narrow' : 'none'

  return {
    ticker: fundamentals.ticker,
    market: fundamentals.market,
    fiscal_year,
    dimension_scores,
    composite_score: Math.round(composite_score * 10) / 10,
    grade,
    analyst_note: null,
    scored_at: new Date().toISOString(),
  }
}
