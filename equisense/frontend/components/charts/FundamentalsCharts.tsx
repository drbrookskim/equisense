'use client'

import { useState } from 'react'
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
import type { FundamentalAnalysis } from '@/types'

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

// ── 지표 설정 ───────────────────────────────────

const METRIC_CONFIGS: Record<string, { label: string; format: MetricFormat; color: string }> = {
  roe:              { label: 'ROE',        format: 'percent', color: '#6366f1' },
  roa:              { label: 'ROA',        format: 'percent', color: '#22c55e' },
  debt_ratio:       { label: '부채비율',   format: 'percent', color: '#f59e0b' },
  operating_margin: { label: '영업이익률', format: 'percent', color: '#a78bfa' },
  per:              { label: 'PER',        format: 'ratio',   color: '#34d399' },
  pbr:              { label: 'PBR',        format: 'ratio',   color: '#f87171' },
  fcf:              { label: 'FCF',        format: 'large',   color: '#fb923c' },
}

const METRIC_KEYS = ['roe', 'roa', 'debt_ratio', 'operating_margin', 'per', 'pbr', 'fcf'] as const
type MetricKey = typeof METRIC_KEYS[number]

// ── SparklineCard ───────────────────────────────

function SparklineCard({
  metricKey,
  label,
  latestValue,
  format,
  sparkData,
  color,
  isExpanded,
  onToggle,
}: {
  metricKey: string
  label: string
  latestValue: number | null
  format: MetricFormat
  sparkData: { year: number; value: number | null }[]
  color: string
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
    </div>
  )
}

// ── 확장 패널 ───────────────────────────────────

function ExpandedPanel({
  metricKey,
  sparkData,
  onClose,
}: {
  metricKey: MetricKey
  sparkData: { year: number; value: number | null }[]
  onClose: () => void
}) {
  const cfg = METRIC_CONFIGS[metricKey]

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {cfg.label} — 연도별 추이
        </h4>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ✕ 닫기
        </button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={sparkData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id={`expanded-grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"   stopColor={cfg.color} stopOpacity={0.3} />
              <stop offset="95%"  stopColor={cfg.color} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
          />
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
            fill={`url(#expanded-grad-${metricKey})`}
            dot={{ fill: cfg.color, r: 3 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 메인 컴포넌트 ───────────────────────────────

export default function FundamentalsCharts({ data }: { data: FundamentalAnalysis }) {
  const [expandedMetric, setExpandedMetric] = useState<MetricKey | null>(null)

  function toggleMetric(key: MetricKey) {
    setExpandedMetric(prev => (prev === key ? null : key))
  }

  const incomeData = data.metrics_by_year.map(m => ({
    year: String(m.fiscal_year),
    revenue:          data.trends['revenue']?.values.find(([y]) => y === m.fiscal_year)?.[1]          ?? null,
    operating_income: data.trends['operating_income']?.values.find(([y]) => y === m.fiscal_year)?.[1] ?? null,
    net_income:       data.trends['net_income']?.values.find(([y]) => y === m.fiscal_year)?.[1]       ?? null,
  }))

  const marginData = data.metrics_by_year.map(m => ({
    year: String(m.fiscal_year),
    ROE:    m.roe,
    ROA:    m.roa,
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

  const latestMetrics = data.metrics_by_year.at(-1) ?? null

  return (
    <div className="space-y-10">

      {/* 손익 추이 */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          손익 추이
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={incomeData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="income-grad-revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="income-grad-op" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="income-grad-net" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="revenue"          name="매출액"   stroke="#6366f1" strokeWidth={2} fill="url(#income-grad-revenue)" dot={false} connectNulls />
            <Area type="monotone" dataKey="operating_income" name="영업이익" stroke="#22c55e" strokeWidth={2} fill="url(#income-grad-op)"      dot={false} connectNulls />
            <Area type="monotone" dataKey="net_income"       name="순이익"   stroke="#f59e0b" strokeWidth={2} fill="url(#income-grad-net)"     dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* 수익성 지표 */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          수익성 지표 (%)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={marginData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="margin-grad-roe" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="margin-grad-roa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="margin-grad-op" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="ROE"      name="ROE"      stroke="#6366f1" strokeWidth={2} fill="url(#margin-grad-roe)" dot={false} connectNulls />
            <Area type="monotone" dataKey="ROA"      name="ROA"      stroke="#22c55e" strokeWidth={2} fill="url(#margin-grad-roa)" dot={false} connectNulls />
            <Area type="monotone" dataKey="영업이익률" name="영업이익률" stroke="#f59e0b" strokeWidth={2} fill="url(#margin-grad-op)"  dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* 핵심지표 SparklineCard 그리드 */}
      {latestMetrics && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            핵심지표
          </h3>
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
                  isExpanded={expandedMetric === key}
                  onToggle={() => toggleMetric(key)}
                />
              )
            })}
          </div>
          {expandedMetric && (
            <ExpandedPanel
              metricKey={expandedMetric}
              sparkData={sparkDataByKey[expandedMetric]}
              onClose={() => setExpandedMetric(null)}
            />
          )}
        </section>
      )}

    </div>
  )
}
