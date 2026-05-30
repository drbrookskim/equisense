'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TechnicalAnalysis, TechnicalPeriod } from '@/types'

const PERIODS: { value: TechnicalPeriod; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
]

function formatPrice(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return String(value)
}

function formatDateTick(date: string, period: TechnicalPeriod): string {
  const d = new Date(date)
  if (period === '1m' || period === '3m') {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getFullYear().toString().slice(2)}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface SummaryCardProps {
  label: string
  value: string
  highlight?: boolean
}

function SummaryCard({ label, value, highlight }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={`mt-1 text-base font-semibold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

export default function TechnicalCharts({
  data,
  ticker,
  period: currentPeriod,
  onPeriodChange,
}: {
  data: TechnicalAnalysis
  ticker: string
  period: TechnicalPeriod
  onPeriodChange: (p: TechnicalPeriod) => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const market = searchParams.get('market') ?? 'US'

  function handlePeriod(period: TechnicalPeriod) {
    onPeriodChange(period)
    // URL도 업데이트 (북마크/공유용 — 현재 Next.js 16 static export에서는 query 반영이 불완전)
    router.push(`/companies/_/technical?ticker=${ticker}&market=${market}&period=${period}`)
  }

  const chartData = data.data_points.map((dp) => ({
    date: dp.date,
    종가: dp.close,
    거래량: dp.volume,
  }))

  const { summary } = data
  const returnPct = summary.period_return_pct
  const returnPositive = returnPct !== null && returnPct >= 0

  return (
    <div className="space-y-8">
      {/* 기간 선택 버튼 */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePeriod(p.value)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              p.value === currentPeriod
                ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          label="시작가"
          value={summary.start_price != null ? formatPrice(summary.start_price) : '—'}
        />
        <SummaryCard
          label="현재가"
          value={summary.end_price != null ? formatPrice(summary.end_price) : '—'}
        />
        <SummaryCard
          label="기간 수익률"
          value={returnPct != null ? `${returnPositive ? '+' : ''}${returnPct.toFixed(2)}%` : '—'}
          highlight={returnPositive}
        />
        <SummaryCard
          label="구간 고가"
          value={summary.high_period != null ? formatPrice(summary.high_period) : '—'}
        />
        <SummaryCard
          label="구간 저가"
          value={summary.low_period != null ? formatPrice(summary.low_period) : '—'}
        />
        <SummaryCard
          label="평균 거래량"
          value={summary.avg_volume != null ? formatVolume(summary.avg_volume) : '—'}
        />
      </div>

      {/* 종가 에어리어 차트 */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          종가 추이
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatDateTick(v, currentPeriod)}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fontSize: 11 }}
              width={70}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(v) => [typeof v === 'number' ? formatPrice(v) : v, '종가']}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="종가"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* 거래량 바 차트 */}
      <section>
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          거래량
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" strokeOpacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatDateTick(v, currentPeriod)}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatVolume} tick={{ fontSize: 11 }} width={52} />
            <Tooltip formatter={(v) => [typeof v === 'number' ? formatVolume(v) : v, '거래량']} />
            <Legend />
            <Bar dataKey="거래량" fill="#22c55e" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
