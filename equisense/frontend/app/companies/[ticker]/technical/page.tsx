import { Suspense } from 'react'
import { getTechnicalData } from '@/lib/api'
import type { Market, TechnicalPeriod } from '@/types'
import TechnicalCharts from '@/components/charts/TechnicalCharts'

const VALID_PERIODS = new Set<string>(['1m', '3m', '6m', '1y', '3y'])

export default async function TechnicalPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>
  searchParams: Promise<{ market?: string; period?: string }>
}) {
  const { ticker } = await params
  const { market = 'US', period = '1y' } = await searchParams

  const validMarket = (market === 'KR' ? 'KR' : 'US') as Market
  const validPeriod = (VALID_PERIODS.has(period) ? period : '1y') as TechnicalPeriod

  let data = null
  let errorMsg: string | null = null

  try {
    data = await getTechnicalData(ticker, validMarket, validPeriod)
  } catch (err: unknown) {
    const e = err as { status?: number }
    if (e?.status === 404) {
      errorMsg = `${ticker} 종목의 주가 데이터를 찾을 수 없습니다.`
    } else {
      errorMsg = '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }
  }

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
