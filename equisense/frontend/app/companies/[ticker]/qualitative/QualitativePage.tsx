'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import type { Market } from '@/types'
import QualitativeAnalysisView from '@/components/qualitative/QualitativeAnalysisView'

function QualitativeContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const ticker = (params.ticker as string).toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market

  return <QualitativeAnalysisView ticker={ticker} market={market} />
}

export default function QualitativePage() {
  return (
    <Suspense fallback={<div className="h-60 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />}>
      <QualitativeContent />
    </Suspense>
  )
}
