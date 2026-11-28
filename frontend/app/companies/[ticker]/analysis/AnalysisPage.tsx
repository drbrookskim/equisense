'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import FundamentalsPage from '@/app/companies/[ticker]/fundamentals/FundamentalsPage'
import TechnicalPage from '@/app/companies/[ticker]/technical/TechnicalPage'
import { useCompanyScores } from '@/contexts/CompanyScoresContext'
import { readSuiteContextFromParams, buildSignnithFeedbackUrl } from '@/lib/suiteBridge'

function Skeleton({ height }: { height: string }) {
  return <div className={`animate-pulse rounded ${height} bg-zinc-100 dark:bg-zinc-800`} />
}

function AnalysisContent() {
  const searchParams = useSearchParams()
  const { compositeScore } = useCompanyScores()
  const suiteCtx = useMemo(() => readSuiteContextFromParams(searchParams), [searchParams])

  const showSuiteBar = suiteCtx.from === 'signnith' || Boolean(suiteCtx.signal)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {showSuiteBar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            padding: '10px 16px',
            borderRadius: 12,
            border: '1px solid rgba(255,138,0,0.35)',
            background: 'rgba(255,138,0,0.08)',
            fontSize: '0.84rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {suiteCtx.signal ? (
              <>
                <strong>Signnith 기준 신호</strong>
                <span>{suiteCtx.signal.action || 'HOLD'}</span>
                <span>
                  · 신뢰도{' '}
                  {suiteCtx.signal.confidence != null
                    ? `${Math.round(suiteCtx.signal.confidence * 100)}%`
                    : '-'}
                </span>
                <span>
                  · 점수{' '}
                  {suiteCtx.signal.combined != null ? suiteCtx.signal.combined.toFixed(2) : '-'}
                </span>
              </>
            ) : (
              <strong>Signnith에서 전달된 종목 컨텍스트</strong>
            )}
          </div>
          <button
            type="button"
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,138,0,0.45)',
              background: 'transparent',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => {
              const score =
                compositeScore != null ? Math.round(((compositeScore - 50) / 50) * 1000) / 1000 : 0
              const curTheme =
                typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
                  ? 'dark'
                  : suiteCtx.theme || 'light'
              const url = buildSignnithFeedbackUrl({
                ticker: suiteCtx.ticker,
                market: suiteCtx.market,
                theme: curTheme,
                signalId: suiteCtx.signal?.signalId,
                feedbackScore: score,
                feedbackSummary:
                  compositeScore != null ? `equisense_composite=${compositeScore}` : 'pending',
              })
              window.open(url, '_blank')
            }}
          >
            Signnith로 되먹임 전송
          </button>
        </div>
      )}
      <section>
        <FundamentalsPage />
      </section>
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
