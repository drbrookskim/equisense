'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getMoatScore } from '@/lib/api-client'
import type { Market, MoatAnalysis } from '@/types'
import MoatCharts from '@/components/charts/MoatCharts'

const MOAT_DIMENSIONS = [
  {
    key: 'cost_advantage',
    emoji: '🏭',
    name: '비용 우위',
    definition: '경쟁사보다 낮은 원가로 생산하는 능력',
    method: '영업이익률 + 부채비율로 측정',
    benchmark: '영업이익률 30%↑ → 만점',
  },
  {
    key: 'intangible_assets',
    emoji: '💎',
    name: '무형 자산',
    definition: '브랜드·특허 등 모방하기 어려운 자산',
    method: 'ROE를 브랜드 가치의 대리 지표로 활용',
    benchmark: 'ROE 25%↑ → 만점',
  },
  {
    key: 'switching_costs',
    emoji: '🔒',
    name: '전환 비용',
    definition: '고객이 다른 제품으로 옮기기 어려운 마찰',
    method: '매출 CAGR + 성장 방향성 보정',
    benchmark: 'CAGR 12%↑ → 만점',
  },
  {
    key: 'network_effects',
    emoji: '🌐',
    name: '네트워크 효과',
    definition: '사용자 증가가 가치를 키우는 선순환',
    method: 'FCF 마진으로 수익 창출력 측정',
    benchmark: 'FCF 마진 15%↑ → 만점',
  },
]

const GRADE_LABEL: Record<string, string> = {
  wide: 'WIDE 해자',
  narrow: 'NARROW 해자',
  none: '해자 없음',
}

const GRADE_COLOR: Record<string, string> = {
  wide: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  narrow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  none: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

function MoatContent() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market
  const name = searchParams.get('name')

  const [data, setData] = useState<MoatAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setErrorMsg(null)
    getMoatScore(ticker, market)
      .then(data => { if (!cancelled) setData(data) })
      .catch((err: { status?: number }) => {
        if (!cancelled) setErrorMsg(
          err?.status === 404
            ? `${ticker} 종목의 해자 점수가 아직 입력되지 않았습니다. 분석가가 점수를 입력한 후 확인할 수 있습니다.`
            : '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        )
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [ticker, market])

  if (isLoading) return <LoadingSkeleton />
  if (errorMsg) {
    return (
      <div className="flex h-60 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">{errorMsg}</p>
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-2xl font-bold">
          {name ? `${name} (${data.ticker})` : data.ticker}
        </h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${GRADE_COLOR[data.grade]}`}>
          {GRADE_LABEL[data.grade]}
        </span>
        <span className="text-sm text-zinc-500">
          종합 {data.composite_score.toFixed(1)}점 / 10점
        </span>
      </div>

      {/* 해자 개념 소개 */}
      <MoatConceptIntro />

      {/* 차원별 차트 */}
      <MoatCharts data={data} />

      {/* Analyst Note */}
      {data.analyst_note && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            📝 Analyst Note
          </p>
          <div className="space-y-2">
            {data.analyst_note.split('\n').map((line, i) => (
              <p
                key={i}
                className={`text-sm ${
                  line.startsWith('✅')
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : line.startsWith('⚠️')
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-60 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  )
}

function MoatConceptIntro() {
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        💡 경제적 해자란?
      </p>
      <p className="mb-4 text-sm text-indigo-900 dark:text-indigo-200">
        워런 버핏이 제시한 개념으로, 경쟁자가 쉽게 침범할 수 없는{' '}
        <strong>구조적 경쟁 우위</strong>를 뜻합니다.
        해자가 넓을수록 기업은 장기간 초과수익을 유지할 수 있습니다.
        EquiSense는 아래 4가지 원천을 재무 데이터로 정량화합니다.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MOAT_DIMENSIONS.map((d) => (
          <div
            key={d.key}
            className="rounded-md bg-white p-3 dark:bg-indigo-950/50"
          >
            <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {d.emoji} {d.name}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{d.definition}</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              측정: {d.method}
            </p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400">{d.benchmark}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MoatPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MoatContent />
    </Suspense>
  )
}
