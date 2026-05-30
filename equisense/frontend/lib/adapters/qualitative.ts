import type {
  AnalysisJob,
  DocType,
  FundamentalAnalysis,
  GrowthDriver,
  Market,
  NoiseFilterItem,
  QualitativeResult,
  RiskFactor,
} from '@/types'

// ── 점수 계산 헬퍼 ────────────────────────────────────────────────

function scoreROE(roe: number | null): number {
  if (roe == null) return 0
  if (roe >= 20) return 30
  if (roe >= 15) return 22
  if (roe >= 10) return 15
  if (roe >= 0) return 7
  return 0
}

function scoreMargin(margin: number | null, direction: string): number {
  if (margin == null) return 10
  if (direction === 'improving') return 25
  if (direction === 'stable') return margin >= 10 ? 20 : 15
  return margin >= 10 ? 10 : 5
}

function scoreFCF(fcf: number | null, direction: string): number {
  if (fcf == null || fcf <= 0) return 0
  if (direction === 'improving') return 25
  if (direction === 'stable') return 18
  return 10
}

function scoreRevenue(direction: string): number {
  if (direction === 'improving') return 20
  if (direction === 'stable') return 12
  return 4
}

// ── 언행일치 점수 (0-100) ─────────────────────────────────────────

function calcIntegrityScore(f: FundamentalAnalysis): number {
  const latest = f.metrics_by_year.at(-1)
  const opTrend = f.trends.operating_income?.direction ?? 'stable'
  const revTrend = f.trends.revenue?.direction ?? 'stable'

  const total =
    scoreROE(latest?.roe ?? null) +
    scoreMargin(latest?.operating_margin ?? null, opTrend) +
    scoreFCF(latest?.fcf ?? null, opTrend) +
    scoreRevenue(revTrend)

  return Math.min(100, Math.round(total))
}

// ── 리스크 요인 ───────────────────────────────────────────────────

function buildRiskFactors(f: FundamentalAnalysis): RiskFactor[] {
  const latest = f.metrics_by_year.at(-1)
  const opTrend = f.trends.operating_income?.direction ?? 'stable'
  const revTrend = f.trends.revenue?.direction ?? 'stable'
  const risks: RiskFactor[] = []

  const debt = latest?.debt_ratio ?? null
  if (debt != null && debt > 70) {
    risks.push({
      title: '높은 부채 비율',
      description: `부채비율 ${debt.toFixed(1)}%로 재무 레버리지 리스크가 높습니다.`,
      severity: 'high',
    })
  } else if (debt != null && debt > 50) {
    risks.push({
      title: '부채 비율 주의',
      description: `부채비율 ${debt.toFixed(1)}%로 업종 평균 대비 높은 수준입니다.`,
      severity: 'medium',
    })
  }

  const opMargin = latest?.operating_margin ?? null
  if (opMargin != null && opMargin < 0) {
    risks.push({
      title: '영업 손실 발생',
      description: `영업이익률 ${opMargin.toFixed(1)}%로 현재 영업 단계에서 손실이 발생하고 있습니다.`,
      severity: 'high',
    })
  } else if (opTrend === 'deteriorating') {
    risks.push({
      title: '영업이익률 하락 추세',
      description: `영업이익률이 지속적으로 감소하는 추세로 수익성 모니터링이 필요합니다.`,
      severity: 'medium',
    })
  }

  const fcf = latest?.fcf ?? null
  if (fcf != null && fcf < 0) {
    risks.push({
      title: '마이너스 잉여현금흐름',
      description: `FCF가 음수로 지속될 경우 외부 자금 조달 필요성이 높아집니다.`,
      severity: 'high',
    })
  }

  if (revTrend === 'deteriorating') {
    risks.push({
      title: '매출 성장 둔화',
      description: `매출 성장률이 감소 추세에 있어 시장 수요 및 경쟁 환경 점검이 필요합니다.`,
      severity: 'medium',
    })
  }

  const roe = latest?.roe ?? null
  if (roe != null && roe < 0) {
    risks.push({
      title: '자기자본이익률 마이너스',
      description: `ROE ${roe.toFixed(1)}%로 주주 자본이 효율적으로 활용되지 않고 있습니다.`,
      severity: 'high',
    })
  }

  const per = latest?.per ?? null
  if (per != null && per > 40) {
    risks.push({
      title: '고 PER 밸류에이션',
      description: `PER ${per.toFixed(1)}배로 실적 기대치가 높아 실망 시 주가 조정 가능성이 있습니다.`,
      severity: 'medium',
    })
  }

  return risks
}

// ── 성장 동력 ─────────────────────────────────────────────────────

function buildGrowthDrivers(f: FundamentalAnalysis): GrowthDriver[] {
  const latest = f.metrics_by_year.at(-1)
  const revCagr = f.trends.revenue?.cagr ?? null
  const revTrend = f.trends.revenue?.direction ?? 'stable'
  const opTrend = f.trends.operating_income?.direction ?? 'stable'
  const drivers: GrowthDriver[] = []

  if (revCagr != null && revCagr > 10) {
    drivers.push({
      title: '강한 매출 성장 모멘텀',
      description: `매출 CAGR ${revCagr.toFixed(1)}%로 업종 내 높은 성장률을 유지하고 있습니다.`,
    })
  } else if (revCagr != null && revCagr > 5 && revTrend !== 'deteriorating') {
    drivers.push({
      title: '안정적 매출 성장',
      description: `매출 CAGR ${revCagr.toFixed(1)}%로 안정적인 성장 기조를 이어가고 있습니다.`,
    })
  }

  const opMargin = latest?.operating_margin ?? null
  if (opTrend === 'improving' && opMargin != null && opMargin > 0) {
    drivers.push({
      title: '수익성 개선 추세',
      description: `영업이익이 지속 상승 중으로 운영 효율화 및 규모의 경제가 실현되고 있습니다.`,
    })
  } else if (opMargin != null && opMargin > 20) {
    drivers.push({
      title: '높은 영업이익률',
      description: `영업이익률 ${opMargin.toFixed(1)}%로 업종 내 높은 수준의 수익성을 유지하고 있습니다.`,
    })
  }

  const roe = latest?.roe ?? null
  if (roe != null && roe > 15) {
    drivers.push({
      title: '우수한 자기자본이익률',
      description: `ROE ${roe.toFixed(1)}%로 주주 자본을 효율적으로 운용하고 있습니다.`,
    })
  }

  const fcf = latest?.fcf ?? null
  if (fcf != null && fcf > 0) {
    drivers.push({
      title: '안정적 잉여현금흐름',
      description: `양수 FCF 유지로 사업 재투자 및 주주 환원을 위한 재원이 확보되어 있습니다.`,
    })
  }

  const debt = latest?.debt_ratio ?? null
  if (debt != null && debt < 30) {
    drivers.push({
      title: '낮은 부채 비율 — 재무 건전성',
      description: `부채비율 ${debt.toFixed(1)}%로 불확실한 경기 환경에서도 안정적 재무 구조를 유지합니다.`,
    })
  }

  return drivers
}

// ── 노이즈 필터 ───────────────────────────────────────────────────

function buildNoiseFilter(f: FundamentalAnalysis): NoiseFilterItem[] {
  const latest = f.metrics_by_year.at(-1)
  const opTrend = f.trends.operating_income?.direction ?? 'stable'
  const revTrend = f.trends.revenue?.direction ?? 'stable'

  const per = latest?.per ?? null
  const debt = latest?.debt_ratio ?? null
  const fcf = latest?.fcf ?? null

  return [
    {
      claim: '고평가 우려: 현재 주가는 실적 대비 지나치게 비싸다',
      is_substantiated: per != null && per > 25,
      evidence:
        per != null
          ? per > 25
            ? `PER ${per.toFixed(1)}배로 시장 평균을 상회합니다. 성장 프리미엄 여부 검토가 필요합니다.`
            : `PER ${per.toFixed(1)}배로 과도한 고평가 주장을 뒷받침할 근거가 부족합니다.`
          : 'PER 데이터가 없어 판단이 어렵습니다.',
    },
    {
      claim: '부채 리스크: 과도한 부채로 재무 위기 가능성이 있다',
      is_substantiated: debt != null && debt > 60,
      evidence:
        debt != null
          ? debt > 60
            ? `부채비율 ${debt.toFixed(1)}%로 재무 안정성 주의가 필요합니다.`
            : `부채비율 ${debt.toFixed(1)}%로 과도한 부채 우려는 재무 데이터로 뒷받침되지 않습니다.`
          : '부채 데이터가 없어 판단이 어렵습니다.',
    },
    {
      claim: '성장 모멘텀 둔화: 매출 성장이 정점을 지나 하락 중이다',
      is_substantiated: revTrend === 'deteriorating',
      evidence:
        revTrend === 'deteriorating'
          ? '매출 성장률이 감소 추세로 해당 우려가 재무 데이터로 확인됩니다.'
          : revTrend === 'improving'
            ? '매출이 성장 추세를 유지 중으로 성장 둔화 주장은 근거가 부족합니다.'
            : '매출이 안정적 수준을 유지 중으로 급격한 둔화는 관찰되지 않습니다.',
    },
    {
      claim: '수익성 악화: 영업 마진이 지속적으로 감소하고 있다',
      is_substantiated: opTrend === 'deteriorating',
      evidence:
        opTrend === 'deteriorating'
          ? '영업이익이 감소 추세로 수익성 악화 우려가 데이터로 확인됩니다.'
          : opTrend === 'improving'
            ? '영업이익이 개선 추세로 수익성 악화 주장은 근거가 부족합니다.'
            : '영업이익이 안정적 수준을 유지 중입니다.',
    },
    {
      claim: '현금흐름 위기: 현금이 빠르게 소진되고 있다',
      is_substantiated: fcf != null && fcf < 0,
      evidence:
        fcf != null
          ? fcf < 0
            ? 'FCF가 음수로 외부 자금 조달 의존도가 높아질 수 있습니다.'
            : 'FCF가 양수로 현금흐름 위기 주장은 재무 데이터로 뒷받침되지 않습니다.'
          : 'FCF 데이터가 없어 판단이 어렵습니다.',
    },
  ]
}

// ── AI 요약 ───────────────────────────────────────────────────────

function buildSummary(f: FundamentalAnalysis, fiscal_year: number, doc_type: DocType): string {
  const latest = f.metrics_by_year.at(-1)
  const revTrend = f.trends.revenue?.direction ?? 'stable'
  const opTrend = f.trends.operating_income?.direction ?? 'stable'
  const revCagr = f.trends.revenue?.cagr ?? null
  const opMargin = latest?.operating_margin ?? null
  const roe = latest?.roe ?? null
  const debt = latest?.debt_ratio ?? null

  const docLabel = doc_type === 'earnings_call' ? '실적발표' : '사업보고서'

  const revDesc =
    revTrend === 'improving' && revCagr != null
      ? `매출은 CAGR ${revCagr.toFixed(1)}%의 성장세를 보이며`
      : revTrend === 'deteriorating'
        ? '매출 성장이 둔화되는 흐름을 보이며'
        : '매출이 안정적 수준을 유지하며'

  const profitDesc =
    opTrend === 'improving'
      ? '수익성이 개선되는 긍정적 흐름을 보이고 있습니다'
      : opTrend === 'deteriorating'
        ? '수익성이 하락 추세에 있어 모니터링이 필요합니다'
        : opMargin != null
          ? `영업이익률 ${opMargin.toFixed(1)}%의 안정적 수익성을 유지하고 있습니다`
          : '수익성은 안정적 수준입니다'

  const healthDesc =
    debt != null && roe != null
      ? `재무적으로는 부채비율 ${debt.toFixed(1)}%, ROE ${roe.toFixed(1)}%를 기록하며`
      : '재무 지표를 종합하면'

  const integrityScore = calcIntegrityScore(f)
  const overallDesc =
    integrityScore >= 70
      ? '전반적으로 양호한 경영 일관성을 보여주고 있습니다.'
      : integrityScore >= 40
        ? '일부 개선이 필요한 부분이 있으나 전반적으로 무난한 성과를 보이고 있습니다.'
        : '여러 재무 지표에서 개선이 필요한 상황으로 면밀한 모니터링이 요구됩니다.'

  return `${fiscal_year}년 ${docLabel} 기반 분석: ${f.ticker}은(는) ${revDesc} ${profitDesc}. ${healthDesc} ${overallDesc}`
}

// ── 메모리 내 잡 스토어 ───────────────────────────────────────────

const jobStore = new Map<string, AnalysisJob>()

// ── 공개 API ─────────────────────────────────────────────────────

export function calculateQualitative(
  f: FundamentalAnalysis,
  fiscal_year: number,
  doc_type: DocType,
  market: Market,
): AnalysisJob {
  const job_id = crypto.randomUUID()

  const result: QualitativeResult = {
    id: crypto.randomUUID(),
    job_id,
    ticker: f.ticker,
    fiscal_period: `${fiscal_year}A`,
    integrity_score: calcIntegrityScore(f),
    summary_ko: buildSummary(f, fiscal_year, doc_type),
    risk_factors: buildRiskFactors(f),
    growth_drivers: buildGrowthDrivers(f),
    noise_filter: buildNoiseFilter(f),
    created_at: new Date().toISOString(),
  }

  // market은 향후 KR/US별 임계값 분기에 사용 예정
  void market

  const job: AnalysisJob = { job_id, status: 'COMPLETED', result, error: null }
  jobStore.set(job_id, job)
  return job
}

export function lookupJob(job_id: string): AnalysisJob | null {
  return jobStore.get(job_id) ?? null
}
