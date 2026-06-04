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

type ExpandedKey = 'roe' | 'roa' | 'debt_ratio' | 'operating_margin' | 'per' | 'pbr' | 'fcf' | 'income' | 'margin'

// ── 섹션 헬퍼 ───────────────────────────────────

function calcCagr(data: { year: number; value: number | null }[]): number | null {
  const valid = data.filter((d): d is { year: number; value: number } => d.value != null)
  if (valid.length < 2) return null
  const first = valid[0].value
  const last  = valid.at(-1)!.value
  const years = valid.at(-1)!.year - valid[0].year
  if (years <= 0 || first <= 0) return null
  return (Math.pow(last / first, 1 / years) - 1) * 100
}

function healthSignal(
  latest: import('@/types').FundamentalMetrics | null,
): 'good' | 'warn' | 'danger' {
  if (!latest) return 'warn'
  const dr  = latest.debt_ratio ?? Infinity
  const fcf = latest.fcf        ?? -1
  const icr = latest.icr        ?? 0
  if (dr > 300 || fcf < 0 || icr < 1.5) return 'danger'
  if (dr > 200 || icr < 3)               return 'warn'
  return 'good'
}

function pillCls(status: 'pass' | 'warn' | 'fail' | 'na'): string {
  if (status === 'pass') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
  if (status === 'warn') return 'bg-amber-50  text-amber-700  dark:bg-amber-950/20  dark:text-amber-400'
  if (status === 'fail') return 'bg-red-50    text-red-700    dark:bg-red-950/20    dark:text-red-400'
  return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
}

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
  showClose = true,
}: {
  expandedKey: ExpandedKey
  sparkDataByKey: Record<string, { year: number; value: number | null }[]>
  incomeData: IncomeRow[]
  marginData: MarginRow[]
  uid: string
  onClose: () => void
  showClose?: boolean
}) {
  const header =
    expandedKey === 'income' ? '손익 추이 — 연도별 추이' :
    expandedKey === 'margin' ? '수익성 지표 — 연도별 추이' :
    `${METRIC_CONFIGS[expandedKey].label} — 연도별 추이`

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{header}</h4>
        {showClose && (
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-200"
          >
            ✕ 닫기
          </button>
        )}
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
  const [openSection, setOpenSection] = useState<'growth' | 'profit' | 'health' | null>(null)

  function toggleSection(key: 'growth' | 'profit' | 'health') {
    setOpenSection(prev => prev === key ? null : key)
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

  const sparkDataByKey: Record<string, { year: number; value: number | null }[]> = {
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

  // ── 파생 값 ──────────────────────────────────────

  const cagr = calcCagr(incomeSpark)
  const validIncomeSpark = incomeSpark.filter(
    (d): d is { year: number; value: number } => d.value != null,
  )
  const maxRevenue = validIncomeSpark.reduce((m, d) => Math.max(m, d.value), 0)

  const signal = healthSignal(latestMetrics)
  const healthBadgeCls =
    signal === 'good'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
      : signal === 'warn'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
      : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
  const healthBorderCls =
    signal === 'good'
      ? 'border-emerald-500/50 dark:border-emerald-500/40'
      : signal === 'warn'
      ? 'border-amber-500/50 dark:border-amber-500/40'
      : 'border-red-500/50 dark:border-red-500/40'

  type PillStatus = 'pass' | 'warn' | 'fail' | 'na'
  const debtStatus: PillStatus = latestMetrics?.debt_ratio == null ? 'na'
    : latestMetrics.debt_ratio <= 200 ? 'pass'
    : latestMetrics.debt_ratio <= 300 ? 'warn' : 'fail'
  const fcfStatus: PillStatus = latestMetrics?.fcf == null ? 'na'
    : latestMetrics.fcf > 0 ? 'pass' : 'fail'
  const icrStatus: PillStatus = latestMetrics?.icr == null ? 'na'
    : latestMetrics.icr >= 3 ? 'pass' : latestMetrics.icr >= 1.5 ? 'warn' : 'fail'
  const perStatus: PillStatus = latestMetrics?.per == null ? 'na'
    : latestMetrics.per < 15 ? 'pass' : latestMetrics.per < 30 ? 'warn' : 'fail'
  const pbrStatus: PillStatus = latestMetrics?.pbr == null ? 'na'
    : latestMetrics.pbr < 1 ? 'pass' : latestMetrics.pbr < 3 ? 'warn' : 'fail'

  const growthInsight = effectiveInsight('income', incomeSpark)

  return (
    <div className="space-y-3">

      {/* ── 1. 성장성 ── */}
      <section className={[
        'rounded-lg border transition-colors bg-zinc-50 dark:bg-zinc-900/50',
        openSection === 'growth'
          ? 'border-indigo-500/50 dark:border-indigo-500/40'
          : 'border-zinc-200 dark:border-zinc-800',
      ].join(' ')}>
        <div
          className="flex cursor-pointer select-none items-start justify-between px-4 py-3"
          onClick={() => toggleSection('growth')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg leading-none">🚀</span>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">성장성</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">매출 · 영업이익 · 순이익</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {cagr != null && (
              <span className={[
                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                cagr >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400',
              ].join(' ')}>
                CAGR {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
              </span>
            )}
            <span className="text-xs text-zinc-400">{openSection === 'growth' ? '▲' : '▼'}</span>
          </div>
        </div>

        {validIncomeSpark.length >= 2 && (
          <div className="flex h-5 items-end gap-0.5 px-4 pb-2">
            {validIncomeSpark.map((d, i) => {
              const h = maxRevenue > 0 ? Math.max(3, Math.round((d.value / maxRevenue) * 18)) : 3
              return (
                <div
                  key={i}
                  style={{ height: `${h}px` }}
                  className="flex-1 rounded-sm bg-indigo-400 opacity-70 dark:bg-indigo-500"
                />
              )
            })}
          </div>
        )}

        {openSection === 'growth' && (
          <div className="space-y-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
            <ExpandedPanel
              expandedKey="income"
              sparkDataByKey={sparkDataByKey}
              incomeData={incomeData}
              marginData={marginData}
              uid={uid}
              onClose={() => {}}
              showClose={false}
            />
            <QuarterlyOverlay
              insight={growthInsight.insight}
              loading={quarterlyLoading}
              isAnnual={growthInsight.isAnnual}
            />
          </div>
        )}
      </section>

      {/* ── 2. 수익성 ── */}
      <section className={[
        'rounded-lg border transition-colors bg-zinc-50 dark:bg-zinc-900/50',
        openSection === 'profit'
          ? 'border-emerald-500/50 dark:border-emerald-500/40'
          : 'border-zinc-200 dark:border-zinc-800',
      ].join(' ')}>
        <div
          className="flex cursor-pointer select-none items-start justify-between px-4 py-3"
          onClick={() => toggleSection('profit')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg leading-none">💎</span>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">수익성</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">ROE · ROA · 영업이익률</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {latestROE != null && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                ROE {formatPercent(latestROE)}
              </span>
            )}
            <span className="text-xs text-zinc-400">{openSection === 'profit' ? '▲' : '▼'}</span>
          </div>
        </div>

        {latestMetrics && (
          <div className="grid grid-cols-3 gap-px border-t border-zinc-200 dark:border-zinc-800">
            {(
              [
                { label: 'ROE',       value: latestMetrics.roe,              format: 'percent' },
                { label: '영업이익률', value: latestMetrics.operating_margin, format: 'percent' },
                { label: 'ROA',       value: latestMetrics.roa,              format: 'percent' },
              ] as { label: string; value: number | null; format: MetricFormat }[]
            ).map(({ label, value, format }) => (
              <div key={label} className="px-4 py-2.5 text-center">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className="mt-0.5 text-base font-bold text-zinc-800 dark:text-zinc-200">
                  {formatValue(value, format)}
                </p>
              </div>
            ))}
          </div>
        )}

        {openSection === 'profit' && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <ExpandedPanel
              expandedKey="margin"
              sparkDataByKey={sparkDataByKey}
              incomeData={incomeData}
              marginData={marginData}
              uid={uid}
              onClose={() => {}}
              showClose={false}
            />
          </div>
        )}
      </section>

      {/* ── 3. 재무 건전성 ── */}
      <section className={[
        'rounded-lg border transition-colors bg-zinc-50 dark:bg-zinc-900/50',
        openSection === 'health' ? healthBorderCls : 'border-zinc-200 dark:border-zinc-800',
      ].join(' ')}>
        <div
          className="flex cursor-pointer select-none items-start justify-between px-4 py-3"
          onClick={() => toggleSection('health')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg leading-none">🛡️</span>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">재무 건전성</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">부채비율 · FCF · 이자보상 · PER · PBR</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className={['rounded-full px-2.5 py-0.5 text-xs font-bold', healthBadgeCls].join(' ')}>
              {signal === 'good' ? '✓ 양호' : signal === 'warn' ? '⚠ 주의' : '✗ 위험'}
            </span>
            <span className="text-xs text-zinc-400">{openSection === 'health' ? '▲' : '▼'}</span>
          </div>
        </div>

        {latestMetrics && (
          <div className="flex flex-wrap gap-1.5 border-t border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
            <span className={['rounded px-2 py-0.5 text-xs font-medium', pillCls(debtStatus)].join(' ')}>
              부채 {formatValue(latestMetrics.debt_ratio, 'percent')}
            </span>
            <span className={['rounded px-2 py-0.5 text-xs font-medium', pillCls(fcfStatus)].join(' ')}>
              FCF {latestMetrics.fcf != null ? formatLargeNumber(latestMetrics.fcf) : '—'}
            </span>
            <span className={['rounded px-2 py-0.5 text-xs font-medium', pillCls(icrStatus)].join(' ')}>
              이자보상 {latestMetrics.icr != null ? `${latestMetrics.icr.toFixed(1)}x` : '—'}
            </span>
            <span className={['rounded px-2 py-0.5 text-xs font-medium', pillCls(perStatus)].join(' ')}>
              PER {formatValue(latestMetrics.per, 'ratio')}
            </span>
            <span className={['rounded px-2 py-0.5 text-xs font-medium', pillCls(pbrStatus)].join(' ')}>
              PBR {formatValue(latestMetrics.pbr, 'ratio')}
            </span>
          </div>
        )}

        {openSection === 'health' && latestMetrics && (
          <div className="space-y-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
            <div className="grid grid-cols-2 gap-4">
              <ExpandedPanel
                expandedKey="debt_ratio"
                sparkDataByKey={sparkDataByKey}
                incomeData={incomeData}
                marginData={marginData}
                uid={uid}
                onClose={() => {}}
                showClose={false}
              />
              <ExpandedPanel
                expandedKey="fcf"
                sparkDataByKey={sparkDataByKey}
                incomeData={incomeData}
                marginData={marginData}
                uid={uid}
                onClose={() => {}}
                showClose={false}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { label: '이자보상배율', value: latestMetrics.icr, format: 'ratio' },
                  { label: 'PER',         value: latestMetrics.per, format: 'ratio' },
                  { label: 'PBR',         value: latestMetrics.pbr, format: 'ratio' },
                ] as { label: string; value: number | null; format: MetricFormat }[]
              ).map(({ label, value, format }) => (
                <div key={label} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
                  <p className="mt-1 text-lg font-bold text-zinc-800 dark:text-zinc-200">
                    {formatValue(value, format)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
