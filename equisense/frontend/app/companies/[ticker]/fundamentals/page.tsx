import { getFundamentals } from '@/lib/api'
import type { Market } from '@/types'
import FundamentalsCharts from '@/components/charts/FundamentalsCharts'

export default async function FundamentalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>
  searchParams: Promise<{ market?: string }>
}) {
  const { ticker } = await params
  const { market = 'US' } = await searchParams
  const validMarket = (market === 'KR' ? 'KR' : 'US') as Market

  let data = null
  let errorMsg: string | null = null

  try {
    data = await getFundamentals(ticker, validMarket)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status === 404) {
      errorMsg = `${ticker} 종목의 재무 데이터를 찾을 수 없습니다.`
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
      </div>
      <FundamentalsCharts data={data} />
    </div>
  )
}
