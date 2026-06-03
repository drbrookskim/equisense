'use client'

import { useState, useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FundamentalAnalysis, QuarterlyInsight, QuarterlyInsightMap } from '@/types'
import { computeAnnualInsight } from '@/lib/adapters/quarterly'

// ── 포맷 헬퍼 ──────────────────────────────────

function formatLargeNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `${(value / 1e6).toFixed(1)}M`
  return value.toFixed(0)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatRatio(value: number): string {
  return `${value.toFixed(1)}x`
}

type MetricFormat = 'percent' | 'ratio' | 'large'

function formatValue(value: number | null, format: MetricFormat): string {
  if (value == null) return '—'
  if (format === 'percent') return formatPercent(value)
  if (format === 'ratio')   return formatRatio(value)
  return formatLargeNumber(value)
}

function yAxisFormatter(format: MetricFormat): (v: unknown) => string {
  return (v) => {
    if (typeof v !== 'number') return ''
    if (format === 'percent') return formatPercent(v)
    if (format === 'ratio')   return formatRatio(v)
    return formatLargeNumber(v)
  }
}

// ── 타입 ────────────────────────────────────────

const METRIC_KEYS = ['roe', 'roa', 'debt_ratio', 'operating_margin', 'per', 'pbr', 'fcf'] as const

// ── 스윙 스코어 타입 ──────────────────────────────
interface SwingScoreItem {
  key: string
  label: string
  status: 'pass' | 'warn' | 'fail' | 'na'
  value: string
  detail: string
  score: number
  maxScore: number
}

interface SwingScore {
  total: number
  grade: 'strong' | 'good' | 'caution' | 'weak'
  items: SwingScoreItem[]
  comment: string
}
type MetricKey = typeof METRIC_KEYS[number]
type ExpandedKey = MetricKey | 'income' | 'margin'

// ── 지표 설정 ───────────────────────────────────

const METRIC_CONFIGS: Record<string, { label: string; format: MetricFormat; color: string; description: string }> = {
  roe:              { label: 'ROE',        format: 'percent', color: '#6366f1', description: '주주 자본으로 얼마나 수익을 냈는지' },
  roa:              { label: 'ROA',        format: 'percent', color: '#22c55e', description: '보유 자산 대비 수익 창출 효율' },
  debt_ratio:       { label: '부채비율',   format: 'percent', color: '#f59e0b', description: '낮을수록 재무 안정성 높음' },
  operating_margin: { label: '영업이익률', format: 'percent', color: '#a78bfa', description: '매출 중 영업이익이 차지하는 비율' },
  per:              { label: 'PER',        format: 'ratio',   color: '#34d399', description: '현재 주가가 이익의 몇 배인지' },
  pbr:              { label: 'PBR',        format: 'ratio',   color: '#f87171', description: '주가가 순자산 대비 몇 배인지' },
  fcf:              { label: 'FCF',        format: 'large',   color: '#fb923c', description: '실제 손에 쥔 잉여현금흐름' },
}

// ── computeSwingScore ────────────────────────────

function computeSwingScore(
  metrics: import('@/types').FundamentalMetrics,
  quarterlyInsights: QuarterlyInsightMap | null,
): SwingScore {
  const items: SwingScoreItem[] = []

  // 1. 부채비율
  const dr = metrics.debt_ratio
  if (dr != null) {
    const s = dr <= 200 ? 'pass' : dr <= 300 ? 'warn' : 'fail'
    items.push({
      key: 'debt_ratio', label: '부채비율', status: s,
      value: `${dr.toFixed(1)}%`,
      detail: s === 'pass' ? '기준 ≤ 200% 충족' : s === 'warn' ? '200~300% 주의' : '300% 초과 부적합',
      score: s === 'pass' ? 25 : s === 'warn' ? 12 : 0, maxScore: 25,
    })
  }

  // 2. 이자보상배율
  const icr = metrics.icr
  if (icr != null) {
    const s = icr >= 3 ? 'pass' : icr >= 1.5 ? 'warn' : 'fail'
    items.push({
      key: 'icr', label: '이자보상배율', status: s,
      value: `${icr.toFixed(1)}x`,
      detail: s === 'pass' ? '기준 ≥ 3배 충족' : s === 'warn' ? '1.5x~3x 주의' : '1.5배 미만 위험',
      score: s === 'pass' ? 15 : s === 'warn' ? 7 : 0, maxScore: 15,
    })
  }

  // 3. FCF
  const fcf = metrics.fcf
  if (fcf != null) {
    const s = fcf > 0 ? 'pass' : 'fail'
    items.push({
      key: 'fcf', label: 'FCF', status: s,
      value: formatLargeNumber(fcf),
      detail: s === 'pass' ? '잉여현금흐름 양호' : '잉여현금흐름 마이너스',
      score: s === 'pass' ? 10 : 0, maxScore: 10,
    })
  }

  // 4. 이익 모멘텀 (quarterly insight 재활용)
  const opInsight = quarterlyInsights?.['operating_margin'] ?? quarterlyInsights?.['margin']
  if (opInsight && !opInsight.insufficient) {
    const s = opInsight.direction === 'up' ? 'pass' : opInsight.direction === 'mixed' ? 'warn' : 'fail'
    items.push({
      key: 'momentum', label: '이익 모멘텀', status: s,
      value: opInsight.momentum_label,
      detail: opInsight.trend_line,
      score: s === 'pass' ? 25 : s === 'warn' ? 12 : 0, maxScore: 25,
    })
  } else {
    const om = metrics.operating_margin
    if (om != null) {
      items.push({
        key: 'momentum', label: '이익 모멘텀', status: om > 0 ? 'pass' : 'fail',
        value: `영업이익률 ${om.toFixed(1)}%`,
        detail: '분기 데이터 없음 — 연간 기준',
        score: om > 0 ? 12 : 0, maxScore: 25,
      })
    }
  }

  // 5. PEG Ratio
  const peg = metrics.peg_ratio
  if (peg != null) {
    const s = peg < 1.0 ? 'pass' : peg < 2.0 ? 'warn' : 'fail'
    items.push({
      key: 'peg', label: 'PEG Ratio', status: s,
      value: `${peg.toFixed(1)}x`,
      detail: s === 'pass' ? '기준 < 1.0 저평가' : s === 'warn' ? '1.0~2.0 적정' : '2.0 이상 고평가',
      score: s === 'pass' ? 15 : s === 'warn' ? 7 : 0, maxScore: 15,
    })
  }

  // 6. 52주 위치
  const high52 = metrics.week52_high
  const cur    = metrics.current_price
  if (high52 != null && cur != null && high52 > 0) {
    const distPct = (1 - cur / high52) * 100
    const s = distPct <= 25 ? 'pass' : distPct <= 40 ? 'warn' : 'fail'
    items.push({
      key: 'position52', label: '52주 위치', status: s,
      value: `고점 대비 -${distPct.toFixed(1)}%`,
      detail: s === 'pass' ? '고점 근처 (모멘텀 구간)' : s === 'warn' ? '재집결 구간' : '고점 대비 과도한 조정',
      score: s === 'pass' ? 10 : s === 'warn' ? 5 : 0, maxScore: 10,
    })
  }

  const totalMax   = items.reduce((a, i) => a + i.maxScore, 0)
  const totalScore = items.reduce((a, i) => a + i.score, 0)
  const total      = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
  const grade: SwingScore['grade'] =
    total >= 80 ? 'strong' : total >= 60 ? 'good' : total >= 40 ? 'caution' : 'weak'

  const healthFail   = items.find(i => i.key === 'debt_ratio')?.status === 'fail'
  const momentumFail = items.find(i => i.key === 'momentum')?.status === 'fail'
  const healthPass   = items.find(i => i.key === 'debt_ratio')?.status === 'pass'
                    && (items.find(i => i.key === 'fcf')?.status ?? 'pass') !== 'fail'
  const momentumPass = items.find(i => i.key === 'momentum')?.status === 'pass'
  const positionPass = items.find(i => i.key === 'position52')?.status === 'pass'

  const comment =
    healthFail   ? '재무 체력 기준 미달. 스윙 트레이딩 진입 부적합.' :
    momentumFail ? '이익 모멘텀 정체·하락. 촉발 이벤트 발생 시까지 관망 권장.' :
    (healthPass && momentumPass && positionPass) ? '재무·모멘텀·기술적 조건 모두 양호. 진입 검토 가능.' :
    (healthPass && momentumPass && !positionPass) ? '재무 체력 우수, 이익 모멘텀 양호 — 고점 대비 조정 중. 50MA 회복 후 진입 재검토 권장.' :
    '일부 지표 주의 필요. 세부 항목을 확인하세요.'

  return { total, grade, items, comment }
}

// ── SwingScoreDrawer ──────────────────────────────

const SCORE_STATUS_CLS: Record<string, string> = {
  pass: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20',
  warn: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20',
  fail: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20',
  na:   'text-zinc-400 bg-zinc-100 dark:text-zinc-500 dark:bg-zinc-800/40',
}

const STATUS_ICON: Record<string, string> = {
  pass: '🟢', warn: '🟡', fail: '🔴', na: '⚪',
}

const GRADE_BAR_COLOR: Record<string, string> = {
  strong:  'bg-emerald-500',
  good:    'bg-indigo-500',
  caution: 'bg-amber-500',
  weak:    'bg-red-500',
}

function SwingScoreDrawer({
  metrics,
  quarterlyInsights,
  quarterlyLoading,
  market,
}: {
  metrics: import('@/types').FundamentalMetrics | null
  quarterlyInsights: QuarterlyInsightMap | null
  quarterlyLoading: boolean
  market: import('@/types').Market
}) {
  const [open, setOpen] = useState(false)

  if (!metrics) return null

  const score = quarterlyLoading ? null : computeSwingScore(metrics, quarterlyInsights)

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">스윙 적합도</h3>
      <div
        onClick={() => setOpen(o => !o)}
        className="cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors select-none"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">📊 스윙 적합도</span>
          {score ? (
            <div className="flex flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className={`h-full rounded-full ${GRADE_BAR_COLOR[score.grade]}`}
                  style={{ width: `${score.total}%` }}
                />
              </div>
              <span className={`text-sm font-bold ${
                score.grade === 'strong'  ? 'text-emerald-600 dark:text-emerald-400' :
                score.grade === 'good'    ? 'text-indigo-600 dark:text-indigo-400' :
                score.grade === 'caution' ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>{score.total}점</span>
            </div>
          ) : (
            <div className="h-1.5 flex-1 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{open ? '▲' : '▼'}</span>
        </div>

        {/* 본문 — 펼침 */}
        {open && score && (
          <div className="space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {score.items.map(item => (
                <div key={item.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span>{STATUS_ICON[item.status]}</span>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{item.label}</span>
                  </div>
                  <div className={`mb-1 inline-block rounded px-2 py-0.5 text-xs font-bold ${SCORE_STATUS_CLS[item.status]}`}>
                    {item.value}
                  </div>
                  <p className="text-xs leading-snug text-zinc-400 dark:text-zinc-500">{item.detail}</p>
                </div>
              ))}
              {market === 'KR' && !score.items.find(i => i.key === 'peg') && (
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span>⚪</span>
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">PEG Ratio</span>
                  </div>
                  <div className="mb-1 inline-block rounded px-2 py-0.5 text-xs font-bold text-zinc-400 bg-zinc-100 dark:text-zinc-500 dark:bg-zinc-800/40">
                    데이터 없음
                  </div>
                  <p className="text-xs leading-snug text-zinc-400 dark:text-zinc-500">KR 종목 미제공</p>
                </div>
              )}
            </div>
            <p className="border-t border-zinc-200 pt-2 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              💡 {score.comment}
            </p>
          </div>
        )}

        {/* 로딩 */}
        {open && !score && (
          <div className="animate-pulse space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="h-16 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        )}
      </div>
    </section>
  )
}

// ── SparklineCard ───────────────────────────────

function QuarterlyOverlay({
  insight,
  loading,
  isAnnual,
}: {
  insight: QuarterlyInsight | null | undefined
  loading: boolean
  isAnnual: boolean
}) {
  return (
    <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
      {loading ? (
        <div className="animate-pulse space-y-1.5">
          <div className="h-2.5 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-2.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      ) : insight && !insight.insufficient ? (
        <>
          <div className="flex items-center gap-1.5">
            {isAnnual && (
              <span className="rounded px-1 py-0.5 text-[10px] font-medium bg-zinc-200/60 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                연간
              </span>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {insight.trend_line}
            </p>
          </div>
          <span className={[
            'mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide',
            insight.direction === 'up'
              ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
              : insight.direction === 'down'
              ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
              : insight.direction === 'mixed'
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
              : 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20',
          ].join(' ')}>
            {insight.momentum_label}
          </span>
        </>
      ) : (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">추이 데이터 없음</p>
      )}
    </div>
  )
}

function SparklineCard({
  metricKey,
  label,
  latestValue,
  format,
  sparkData,
  color,
  description,
  insight,
  isAnnual,
  quarterlyLoading,
  isExpanded,
  onToggle,
}: {
  metricKey: string
  label: string
  latestValue: number | null
  format: MetricFormat
  sparkData: { year: number; value: number | null }[]
  color: string
  description: string
  insight: QuarterlyInsight | null | undefined
  isAnnual?: boolean
  quarterlyLoading: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const hasEnoughData = sparkData.filter(d => d.value !== null).length >= 2

  return (
    <div
      onClick={onToggle}
      className={[
        'rounded-lg border p-3 cursor-pointer transition-colors select-none',
        isExpanded
          ? 'border-indigo-500 bg-indigo-950/10 dark:bg-indigo-950/20'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600',
      ].join(' ')}
    >
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{formatValue(latestValue, format)}</div>
      {hasEnoughData && (
        <ResponsiveContainer width="100%" height={52}>
          <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#spark-grad-${metricKey})`}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{description}</p>
      {isExpanded && (
        <QuarterlyOverlay insight={insight} loading={quarterlyLoading} isAnnual={isAnnual ?? false} />
      )}
    </div>
  )
}

// ── 확장 패널 ───────────────────────────────────

type IncomeRow  = { year: string; revenue: number | null; operating_income: number | null; net_income: number | null }
type MarginRow  = { year: string; ROE: number | null; ROA: number | null; 영업이익률: number | null }

function ExpandedPanel({
  expandedKey,
  sparkDataByKey,
  incomeData,
  marginData,
  uid,
  onClose,
}: {
  expandedKey: ExpandedKey
  sparkDataByKey: Record<MetricKey, { year: number; value: number | null }[]>
  incomeData: IncomeRow[]
  marginData: MarginRow[]
  uid: string
  onClose: () => void
}) {
  const header =
    expandedKey === 'income' ? '손익 추이 — 연도별 추이' :
    expandedKey === 'margin' ? '수익성 지표 — 연도별 추이' :
    `${METRIC_CONFIGS[expandedKey].label} — 연도별 추이`

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{header}</h4>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 transition-colors hover:text-zinc-200"
        >
          ✕ 닫기
        </button>
      </div>

      {expandedKey === 'income' && (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={incomeData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id={`${uid}-ep-income-revenue`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id={`${uid}-ep-income-op`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id={`${uid}-ep-income-net`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v: unknown) => typeof v === 'number' ? formatLargeNumber(v) : ''}
              tick={{ fontSize: 11 }}
              width={60}
              domain={['auto', 'auto']}
            />
            <Tooltip formatter={(v) => (typeof v === 'number' ? formatLargeNumber(v) : v)} />
            <Legend />
            <Area type="monotone" dataKey="revenue"          name="매출액"   stroke="#6366f1" strokeWidth={2} fill={`url(#${uid}-ep-income-revenue)`} dot={false} connectNulls />
            <Area type="monotone" dataKey="operating_income" name="영업이익" stroke="#22c55e" strokeWidth={2} fill={`url(#${uid}-ep-income-op)`}      dot={false} connectNulls />
            <Area type="monotone" dataKey="net_income"       name="순이익"   stroke="#f59e0b" strokeWidth={2} fill={`url(#${uid}-ep-income-net)`}     dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {expandedKey === 'margin' && (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={marginData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id={`${uid}-ep-margin-roe`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id={`${uid}-ep-margin-roa`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id={`${uid}-ep-margin-op`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(v: unknown) => typeof v === 'number' ? formatPercent(v) : ''}
              tick={{ fontSize: 11 }}
              width={52}
              domain={['auto', 'auto']}
            />
            <Tooltip formatter={(v) => (typeof v === 'number' ? formatPercent(v) : v)} />
            <Legend />
            <Area type="monotone" dataKey="ROE"       name="ROE"      stroke="#6366f1" strokeWidth={2} fill={`url(#${uid}-ep-margin-roe)`} dot={false} connectNulls />
            <Area type="monotone" dataKey="ROA"       name="ROA"      stroke="#22c55e" strokeWidth={2} fill={`url(#${uid}-ep-margin-roa)`} dot={false} connectNulls />
            <Area type="monotone" dataKey="영업이익률" name="영업이익률" stroke="#f59e0b" strokeWidth={2} fill={`url(#${uid}-ep-margin-op)`}  dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {expandedKey !== 'income' && expandedKey !== 'margin' && (() => {
        const cfg = METRIC_CONFIGS[expandedKey]
        const sparkData = sparkDataByKey[expandedKey]
        return (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sparkData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id={`${uid}-ep-metric-${expandedKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={yAxisFormatter(cfg.format)}
                tick={{ fontSize: 11 }}
                width={cfg.format === 'large' ? 64 : 52}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(v) => [
                  typeof v === 'number' ? formatValue(v, cfg.format) : v,
                  cfg.label,
                ]}
                labelFormatter={(label) => `${label}년`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={cfg.color}
                strokeWidth={2}
                fill={`url(#${uid}-ep-metric-${expandedKey})`}
                dot={{ fill: cfg.color, r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )
      })()}
    </div>
  )
}

// ── 메인 컴포넌트 ───────────────────────────────

export default function FundamentalsCharts({
  data,
  quarterlyInsights,
  quarterlyLoading,
}: {
  data: FundamentalAnalysis
  quarterlyInsights: QuarterlyInsightMap | null
  quarterlyLoading: boolean
}) {
  const uid = useId()
  const [expanded, setExpanded] = useState<ExpandedKey | null>(null)

  function toggle(key: ExpandedKey) {
    setExpanded(prev => (prev === key ? null : key))
  }

  const incomeData: IncomeRow[] = data.metrics_by_year.map(m => ({
    year: String(m.fiscal_year),
    revenue:          data.trends['revenue']?.values.find(([y]) => y === m.fiscal_year)?.[1]          ?? null,
    operating_income: data.trends['operating_income']?.values.find(([y]) => y === m.fiscal_year)?.[1] ?? null,
    net_income:       data.trends['net_income']?.values.find(([y]) => y === m.fiscal_year)?.[1]       ?? null,
  }))

  const marginData: MarginRow[] = data.metrics_by_year.map(m => ({
    year: String(m.fiscal_year),
    ROE:      m.roe,
    ROA:      m.roa,
    영업이익률: m.operating_margin,
  }))

  const sparkDataByKey: Record<MetricKey, { year: number; value: number | null }[]> = {
    roe:              data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.roe })),
    roa:              data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.roa })),
    debt_ratio:       data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.debt_ratio })),
    operating_margin: data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.operating_margin })),
    per:              data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.per })),
    pbr:              data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.pbr })),
    fcf:              data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.fcf })),
  }

  // 손익추이 카드: 대표 스파크라인 = 매출액
  const incomeSpark = data.metrics_by_year.map(m => ({
    year: m.fiscal_year,
    value: data.trends['revenue']?.values.find(([y]) => y === m.fiscal_year)?.[1] ?? null,
  }))
  const latestRevenue = incomeSpark.at(-1)?.value ?? null

  // 수익성지표 카드: 대표 스파크라인 = ROE
  const marginSpark = data.metrics_by_year.map(m => ({ year: m.fiscal_year, value: m.roe }))
  const latestROE    = data.metrics_by_year.at(-1)?.roe ?? null

  const latestMetrics = data.metrics_by_year.at(-1) ?? null

  // 분기 인사이트가 없거나 부족할 때 연간 데이터로 fallback
  function effectiveInsight(
    key: string,
    annualSpark: { year: number; value: number | null }[],
  ): { insight: QuarterlyInsight | null; isAnnual: boolean } {
    if (quarterlyLoading) return { insight: null, isAnnual: false }
    const qi = quarterlyInsights?.[key]
    if (qi && !qi.insufficient) return { insight: qi, isAnnual: false }
    const annual = computeAnnualInsight(key, annualSpark)
    return { insight: annual, isAnnual: true }
  }

  return (
    <div className="space-y-6">

      {/* 확장 패널 — 상단 고정 */}
      {expanded && (
        <ExpandedPanel
          expandedKey={expanded}
          sparkDataByKey={sparkDataByKey}
          incomeData={incomeData}
          marginData={marginData}
          uid={uid}
          onClose={() => setExpanded(null)}
        />
      )}

      {/* 손익추이 + 수익성지표 카드 */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">추이 분석</h3>
        <div className="grid grid-cols-2 gap-3">
          <SparklineCard
            metricKey="income"
            label="손익 추이"
            latestValue={latestRevenue}
            format="large"
            sparkData={incomeSpark}
            color="#6366f1"
            description="매출액·영업이익·순이익의 연도별 변화 추이"
            {...effectiveInsight('income', incomeSpark)}
            quarterlyLoading={quarterlyLoading}
            isExpanded={expanded === 'income'}
            onToggle={() => toggle('income')}
          />
          <SparklineCard
            metricKey="margin"
            label="수익성 지표"
            latestValue={latestROE}
            format="percent"
            sparkData={marginSpark}
            color="#22c55e"
            description="ROE·ROA·영업이익률의 연도별 추이"
            {...effectiveInsight('margin', marginSpark)}
            quarterlyLoading={quarterlyLoading}
            isExpanded={expanded === 'margin'}
            onToggle={() => toggle('margin')}
          />
        </div>
      </section>

      {/* 핵심지표 SparklineCard 그리드 */}
      {latestMetrics && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">핵심지표</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {METRIC_KEYS.map(key => {
              const cfg = METRIC_CONFIGS[key]
              const latestVal = latestMetrics[key as keyof typeof latestMetrics] as number | null
              return (
                <SparklineCard
                  key={key}
                  metricKey={key}
                  label={cfg.label}
                  latestValue={latestVal}
                  format={cfg.format}
                  sparkData={sparkDataByKey[key]}
                  color={cfg.color}
                  description={cfg.description}
                  {...effectiveInsight(key, sparkDataByKey[key])}
                  quarterlyLoading={quarterlyLoading}
                  isExpanded={expanded === key}
                  onToggle={() => toggle(key)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* 스윙 적합도 드로어 */}
      <SwingScoreDrawer
        metrics={latestMetrics}
        quarterlyInsights={quarterlyInsights}
        quarterlyLoading={quarterlyLoading}
        market={data.market}
      />

    </div>
  )
}
