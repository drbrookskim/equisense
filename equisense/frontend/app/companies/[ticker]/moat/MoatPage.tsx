'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getMoatScore } from '@/lib/api-client'
import type { Market, MoatAnalysis } from '@/types'
import MoatCharts from '@/components/charts/MoatCharts'

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
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-2xl font-bold">{name ?? data.ticker}</h2>
        {name && <span className="font-mono text-sm text-zinc-500">{data.ticker}</span>}
        <span className="text-sm text-zinc-400">({data.market})</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${GRADE_COLOR[data.grade]}`}>
          {GRADE_LABEL[data.grade]}
        </span>
        <span className="text-sm text-zinc-500">
          종합 {data.composite_score.toFixed(1)}점 / 10점
        </span>
      </div>
      {data.analyst_note && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{data.analyst_note}</p>
      )}
      <MoatCharts data={data} />
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

export default function MoatPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MoatContent />
    </Suspense>
  )
}
