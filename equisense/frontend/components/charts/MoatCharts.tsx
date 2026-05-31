'use client'

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { MoatAnalysis } from '@/types'

const DIMENSION_LABEL: Record<string, string> = {
  cost_advantage: '비용 우위',
  intangible_assets: '무형 자산',
  switching_costs: '전환 비용',
  network_effects: '네트워크 효과',
}

const DIMENSION_DESCRIPTION: Record<string, string> = {
  cost_advantage: '높은 영업이익률과 낮은 부채는 경쟁사 대비 지속적 원가 우위를 시사합니다.',
  intangible_assets: 'ROE는 브랜드·특허가 만들어내는 초과수익률의 대리 지표입니다.',
  switching_costs: '안정적·성장하는 매출은 고객이 이탈하기 어려운 구조를 반영합니다.',
  network_effects: 'FCF 마진이 높을수록 규모 확장 시 수익성이 자기강화됩니다.',
}

export default function MoatCharts({ data }: { data: MoatAnalysis }) {
  const radarData = data.dimension_scores.map((d) => ({
    dimension: DIMENSION_LABEL[d.dimension] ?? d.dimension,
    점수: d.score,
  }))

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          해자 차원별 점수 (0~10점)
        </h3>
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#3f3f46" strokeOpacity={0.4} />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                <Radar
                  name={data.ticker}
                  dataKey="점수"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.35}
                />
                <Tooltip formatter={(v) => (typeof v === 'number' ? `${v.toFixed(1)}점` : v)} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full shrink-0 space-y-2 md:w-64">
            {data.dimension_scores.map((d) => {
              const barColor =
                d.score >= 7.5
                  ? 'bg-indigo-500'
                  : d.score >= 5
                    ? 'bg-violet-400'
                    : 'bg-zinc-400'
              return (
                <div key={d.dimension} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {DIMENSION_LABEL[d.dimension] ?? d.dimension}
                    </span>
                    <span className="text-sm font-bold">{d.score.toFixed(1)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className={`h-1.5 rounded-full transition-all ${barColor}`}
                      style={{ width: `${d.score * 10}%` }}
                    />
                  </div>
                  {d.rationale && (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{d.rationale}</p>
                  )}
                  {DIMENSION_DESCRIPTION[d.dimension] && (
                    <p className="mt-1 text-xs italic text-zinc-400 dark:text-zinc-500">
                      {DIMENSION_DESCRIPTION[d.dimension]}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
