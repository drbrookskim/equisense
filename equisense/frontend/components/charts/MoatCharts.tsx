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
            {data.dimension_scores.map((d) => (
              <div key={d.dimension} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {DIMENSION_LABEL[d.dimension] ?? d.dimension}
                  </span>
                  <span className="text-sm font-bold">{d.score.toFixed(1)}</span>
                </div>
                {d.rationale && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{d.rationale}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
