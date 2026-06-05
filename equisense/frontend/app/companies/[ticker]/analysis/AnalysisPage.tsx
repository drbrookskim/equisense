'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import FundamentalsPage from '@/app/companies/[ticker]/fundamentals/FundamentalsPage'
import TechnicalPage from '@/app/companies/[ticker]/technical/TechnicalPage'

function Skeleton({ height }: { height: string }) {
  return <div className={`animate-pulse rounded ${height} bg-zinc-100 dark:bg-zinc-800`} />
}

function AnalysisContent() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const name = searchParams.get('name')

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
          {name ? `${name} (${ticker})` : ticker}
        </h1>
        <p className="mt-1 text-base font-bold text-zinc-500 dark:text-zinc-400">
          기본적 분석 · 기술적 분석
        </p>
      </div>

      <section>
        <FundamentalsPage />
      </section>

      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
        <span className="text-base font-bold text-zinc-600 dark:text-zinc-300">기술적 분석</span>
        <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
      </div>

      <section>
        <TechnicalPage hideHeader />
      </section>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<Skeleton height="h-8" />}>
      <AnalysisContent />
    </Suspense>
  )
}
