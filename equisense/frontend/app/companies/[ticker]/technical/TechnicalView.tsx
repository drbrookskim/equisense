'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getTechnicalData } from '@/lib/api'
import type { Market, TechnicalAnalysis, TechnicalPeriod } from '@/types'
import TechnicalCharts from '@/components/charts/TechnicalCharts'

const VALID_PERIODS = new Set<string>(['1m', '3m', '6m', '1y', '3y'])

export default function TechnicalView({ ticker }: { ticker: string }) {
  const searchParams = useSearchParams()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market
  const rawPeriod = searchParams.get('period') ?? '1y'
  const period = (VALID_PERIODS.has(rawPeriod) ? rawPeriod : '1y') as TechnicalPeriod

  const [data, setData] = useState<TechnicalAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setError(null)
    getTechnicalData(ticker, market, period)
      .then(setData)
      .catch((e) => {
        setError(
          e?.status === 404
            ? `${ticker} 주가 데이터가 없습니다. GitHub Actions를 실행해 주세요.`
            : '데이터를 불러오는 중 오류가 발생했습니다.',
        )
      })
  }, [ticker, market, period])

  if (error) {
    return (
      <div className="flex h-60 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-60 items-center justify-center">
        <span className="text-sm text-zinc-400">차트 로딩 중…</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-bold">
          {data.ticker}
          <span className="ml-2 text-base font-normal text-zinc-500">({data.market})</span>
        </h2>
        <span className="text-sm text-zinc-500">기술적 분석</span>
      </div>
      <Suspense
        fallback={
          <div className="flex h-60 items-center justify-center">
            <span className="text-sm text-zinc-400">차트 로딩 중…</span>
          </div>
        }
      >
        <TechnicalCharts data={data} ticker={ticker} />
      </Suspense>
    </div>
  )
}
