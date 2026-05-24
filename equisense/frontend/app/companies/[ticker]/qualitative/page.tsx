import type { Market } from '@/types'
import QualitativeAnalysisView from '@/components/qualitative/QualitativeAnalysisView'

export default async function QualitativePage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>
  searchParams: Promise<{ market?: string }>
}) {
  const { ticker } = await params
  const { market = 'US' } = await searchParams

  const validMarket = (market === 'KR' ? 'KR' : 'US') as Market

  return <QualitativeAnalysisView ticker={ticker} market={validMarket} />
}
