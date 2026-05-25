'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getFundamentals } from '@/lib/api-client'
import type { FundamentalAnalysis, Market } from '@/types'
import FundamentalsCharts from '@/components/charts/FundamentalsCharts'

function FundamentalsContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const ticker = (params.ticker as string).toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market

  const [data, setData] = useState<FundamentalAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setErrorMsg(null)
    getFundamentals(ticker, market)
      .then(setData)
      .catch((err: { status?: number }) => {
        setErrorMsg(
          err?.status === 404
            ? `${ticker} 종목의 재무 데이터를 찾을 수 없습니다.`
            : '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        )
      })
      .finally(() => setIsLoading(false))
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
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-bold">
          {data.ticker}
          <span className="ml-2 text-base font-normal text-zinc-500">({data.market})</span>
        </h2>
      </div>
      <FundamentalsCharts data={data} />
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

export default function FundamentalsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FundamentalsContent />
    </Suspense>
  )
}
