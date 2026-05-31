import type { DimensionScore, FundamentalAnalysis, MoatAnalysis, MoatGrade } from '@/types'

const DIMENSION_NAME_KO: Record<string, string> = {
  cost_advantage: '비용 우위',
  intangible_assets: '무형 자산',
  switching_costs: '전환 비용',
  network_effects: '네트워크 효과',
}

const GRADE_TEXT: Record<string, string> = {
  wide: '강력한 경제적 해자를 보유합니다',
  narrow: '일부 구조적 우위가 확인됩니다',
  none: '뚜렷한 해자가 확인되지 않습니다',
}

function score(value: number | null, thresholds: [number, number, number, number]): number {
  if (value == null) return 0
  const [t1, t2, t3, t4] = thresholds
  if (value >= t4) return 10
  if (value >= t3) return 7.5
  if (value >= t2) return 5
  if (value >= t1) return 2.5
  return 0
}

function subjectParticle(word: string): string {
  const last = word[word.length - 1]
  const code = last.charCodeAt(0)
  // 한글 완성형: 받침 없으면(0) '는', 있으면 '은'
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? '는' : '은'
  return '은'
}

function generateAnalystNote(
  displayName: string,
  grade: MoatGrade,
  dimension_scores: DimensionScore[],
): string {
  const sorted = [...dimension_scores].sort((a, b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  const strongName = DIMENSION_NAME_KO[strongest.dimension] ?? strongest.dimension
  const weakName = DIMENSION_NAME_KO[weakest.dimension] ?? weakest.dimension

  const para1 =
    `${displayName}${subjectParticle(displayName)} ${GRADE_TEXT[grade]}. ` +
    `${strongName}(${strongest.score.toFixed(1)}점)이 가장 강한 경쟁 기반으로` +
    (strongest.rationale ? `, ${strongest.rationale}` : '') +
    `. ${weakName}(${weakest.score.toFixed(1)}점)은 상대적으로 약합니다.`

  const strengths = dimension_scores.filter((d) => d.score >= 6.0)
  const weaknesses = dimension_scores.filter((d) => d.score < 5.0)

  const lines: string[] = [para1]

  if (strengths.length > 0) {
    lines.push(
      '✅ 강점: ' +
        strengths
          .map((d) => d.rationale ?? `${DIMENSION_NAME_KO[d.dimension] ?? d.dimension} ${d.score.toFixed(1)}점`)
          .join(' · '),
    )
  }
  if (weaknesses.length > 0) {
    lines.push(
      '⚠️ 개선 필요: ' +
        weaknesses
          .map((d) => d.rationale ?? `${DIMENSION_NAME_KO[d.dimension] ?? d.dimension} ${d.score.toFixed(1)}점`)
          .join(' · '),
    )
  }

  return lines.join('\n')
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
    analyst_note: generateAnalystNote(
      fundamentals.name ?? fundamentals.ticker,
      grade,
      dimension_scores,
    ),
    scored_at: new Date().toISOString(),
  }
}
