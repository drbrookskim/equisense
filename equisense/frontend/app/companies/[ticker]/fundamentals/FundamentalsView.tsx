'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getFundamentals } from '@/lib/api'
import type { FundamentalAnalysis, Market } from '@/types'
import FundamentalsCharts from '@/components/charts/FundamentalsCharts'

export default function FundamentalsView({ ticker }: { ticker: string }) {
  const searchParams = useSearchParams()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market

  const [data, setData] = useState<FundamentalAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setError(null)
    getFundamentals(ticker, market)
      .then(setData)
      .catch((e) => {
        setError(
          e?.status === 404
            ? `${ticker} 재무 데이터가 아직 없습니다. GitHub Actions를 실행해 주세요.`
            : '데이터를 불러오는 중 오류가 발생했습니다.',
        )
      })
  }, [ticker, market])

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
        <span className="text-sm text-zinc-400">데이터 로딩 중…</span>
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
      </div>
      <FundamentalsCharts data={data} />
    </div>
  )
}
