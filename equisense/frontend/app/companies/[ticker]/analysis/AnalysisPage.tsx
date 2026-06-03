'use client'

import { Suspense } from 'react'
import FundamentalsPage from '@/app/companies/[ticker]/fundamentals/FundamentalsPage'
import TechnicalPage from '@/app/companies/[ticker]/technical/TechnicalPage'

function Skeleton({ height }: { height: string }) {
  return <div className={`animate-pulse rounded ${height} bg-zinc-100 dark:bg-zinc-800`} />
}

export default function AnalysisPage() {
  return (
    <div className="space-y-12">
      <section>
        <Suspense fallback={<Skeleton height="h-60" />}>
          <FundamentalsPage />
        </Suspense>
      </section>

      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">기술적 분석</span>
        <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
      </div>

      <section>
        <Suspense fallback={<Skeleton height="h-80" />}>
          <TechnicalPage />
        </Suspense>
      </section>
    </div>
  )
}
