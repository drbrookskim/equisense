import { Suspense } from 'react'
import { readWatchlist } from '@/lib/watchlist'
import TechnicalView from './TechnicalView'

export function generateStaticParams() {
  return readWatchlist().companies.map((c) => ({ ticker: c.ticker }))
}

export default async function TechnicalPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params
  return (
    <Suspense fallback={<div className="flex h-60 items-center justify-center"><span className="text-sm text-zinc-400">로딩 중…</span></div>}>
      <TechnicalView ticker={ticker} />
    </Suspense>
  )
}
