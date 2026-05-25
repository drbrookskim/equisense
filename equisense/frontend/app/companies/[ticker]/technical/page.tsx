'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getTechnicalData } from '@/lib/api-client'
import type { Market, TechnicalAnalysis, TechnicalPeriod } from '@/types'
import TechnicalCharts from '@/components/charts/TechnicalCharts'

const VALID_PERIODS = new Set<string>(['1m', '3m', '6m', '1y', '3y'])

function TechnicalContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const ticker = (params.ticker as string).toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market
  const period = (
    VALID_PERIODS.has(searchParams.get('period') ?? '') ? searchParams.get('period') : '1y'
  ) as TechnicalPeriod

  const [data, setData] = useState<TechnicalAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setErrorMsg(null)
    getTechnicalData(ticker, market, period)
      .then(setData)
      .catch((err: { status?: number }) => {
        setErrorMsg(
          err?.status === 404
            ? `${ticker} 종목의 주가 데이터를 찾을 수 없습니다.`
            : '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        )
      })
      .finally(() => setIsLoading(false))
  }, [ticker, market, period])

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

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-60 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  )
}

export default function TechnicalPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TechnicalContent />
    </Suspense>
  )
}
