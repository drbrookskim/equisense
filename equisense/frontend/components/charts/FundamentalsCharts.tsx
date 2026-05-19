'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FundamentalAnalysis } from '@/types'

function formatLargeNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  return value.toFixed(0)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

type MetricFormat = 'percent' | 'ratio' | 'large'

export default function FundamentalsCharts({ data }: { data: FundamentalAnalysis }) {
  const incomeData = data.metrics_by_year.map((m) => ({
    year: String(m.fiscal_year),
    revenue: data.trends['revenue']?.values.find(([y]) => y === m.fiscal_year)?.[1] ?? null,
    operating_income:
      data.trends['operating_income']?.values.find(([y]) => y === m.fiscal_year)?.[1] ?? null,
    net_income:
      data.trends['net_income']?.values.find(([y]) => y === m.fiscal_year)?.[1] ?? null,
  }))

  const marginData = data.metrics_by_year.map((m) => ({
    year: String(m.fiscal_year),
    ROE: m.roe,
    ROA: m.roa,
    영업이익률: m.operating_margin,
  }))

  const latestMetrics = data.metrics_by_year.at(-1) ?? null

  return (
    <div className="space-y-10">
      <section>
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          손익 추이 (최근 5개년)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={incomeData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatLargeNumber} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? formatLargeNumber(v) : v)} />
            <Legend />
            <Bar dataKey="revenue" name="매출액" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="operating_income" name="영업이익" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="net_income" name="순이익" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          수익성 지표 (%)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={marginData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatPercent} tick={{ fontSize: 11 }} width={52} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? formatPercent(v) : v)} />
            <Legend />
            <Bar dataKey="ROE" name="ROE" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="ROA" name="ROA" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="영업이익률" name="영업이익률" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {latestMetrics && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            핵심 지표 (최근 연도)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="ROE" value={latestMetrics.roe} format="percent" />
            <MetricCard label="ROA" value={latestMetrics.roa} format="percent" />
            <MetricCard label="부채비율" value={latestMetrics.debt_ratio} format="percent" />
            <MetricCard label="영업이익률" value={latestMetrics.operating_margin} format="percent" />
            <MetricCard label="PER" value={latestMetrics.per} format="ratio" />
            <MetricCard label="PBR" value={latestMetrics.pbr} format="ratio" />
            <MetricCard label="FCF" value={latestMetrics.fcf} format="large" />
          </div>
        </section>
      )}
    </div>
  )
}

function MetricCard({ label, value, format }: { label: string; value: number | null; format: MetricFormat }) {
  let display = '—'
  if (value != null) {
    if (format === 'percent') display = `${value.toFixed(1)}%`
    else if (format === 'ratio') display = `${value.toFixed(1)}x`
    else display = formatLargeNumber(value)
  }
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{display}</div>
    </div>
  )
}
