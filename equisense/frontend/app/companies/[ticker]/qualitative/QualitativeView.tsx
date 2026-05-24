'use client'

import { useSearchParams } from 'next/navigation'
import type { Market } from '@/types'
import QualitativeAnalysisView from '@/components/qualitative/QualitativeAnalysisView'

export default function QualitativeView({ ticker }: { ticker: string }) {
  const searchParams = useSearchParams()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market
  return <QualitativeAnalysisView ticker={ticker} market={market} />
}
