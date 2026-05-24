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
  return <TechnicalView ticker={ticker} />
}
