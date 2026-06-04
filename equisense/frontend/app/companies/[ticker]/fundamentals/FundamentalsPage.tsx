'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getFundamentals, getQuarterlyInsights } from '@/lib/api-client'
import type { FundamentalAnalysis, Market, QuarterlyInsightMap } from '@/types'
import FundamentalsCharts from '@/components/charts/FundamentalsCharts'

function FundamentalsContent() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market

  const [data, setData] = useState<FundamentalAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quarterlyInsights, setQuarterlyInsights] = useState<QuarterlyInsightMap | null>(null)
  const [quarterlyLoading, setQuarterlyLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setErrorMsg(null)
    getFundamentals(ticker, market)
      .then(data => { if (!cancelled) setData(data) })
      .catch((err: { status?: number }) => {
        if (!cancelled) setErrorMsg(
          err?.status === 404
            ? `${ticker} 종목의 재무 데이터를 찾을 수 없습니다.`
            : '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        )
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [ticker, market])

  useEffect(() => {
    if (!ticker) return
    let cancelled = false
    setQuarterlyLoading(true)
    setQuarterlyInsights(null)
    getQuarterlyInsights(ticker, market)
      .then(d => { if (!cancelled) setQuarterlyInsights(d) })
      .catch(() => { if (!cancelled) setQuarterlyInsights(null) })
      .finally(() => { if (!cancelled) setQuarterlyLoading(false) })
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
        <h2 className="text-2xl font-bold">{data.name ?? data.ticker}</h2>
        {data.name && (
          <span className="font-mono text-sm text-zinc-500">{data.ticker}</span>
        )}
        <span className="text-sm text-zinc-400">({data.market})</span>
      </div>
      <FundamentalsCharts
        data={data}
        quarterlyInsights={quarterlyInsights}
        quarterlyLoading={quarterlyLoading}
      />
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
