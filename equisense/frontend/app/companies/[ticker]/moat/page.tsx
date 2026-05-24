import { getMoatScore } from '@/lib/api'
import type { Market } from '@/types'
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

export default async function MoatPage({
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
    data = await getMoatScore(ticker, validMarket)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    if (e?.status === 404) {
      errorMsg = `${ticker} 종목의 해자 점수가 아직 입력되지 않았습니다. 분석가가 점수를 입력한 후 확인할 수 있습니다.`
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
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${GRADE_COLOR[data.grade]}`}
        >
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
