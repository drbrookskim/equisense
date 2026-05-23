'use client'

import { useEffect, useState } from 'react'
import { getQualitativeIndex, getQualitativeResult } from '@/lib/api'
import type {
  DocType,
  Market,
  QualitativeIndexEntry,
  QualitativeResult,
  RiskFactor,
} from '@/types'

interface Props {
  ticker: string
  market: Market
}

const DOC_LABEL: Record<DocType, string> = {
  annual_report: '사업보고서',
  earnings_call: '실적발표',
}

// ── 하위 컴포넌트 ──────────────────────────────────────────────────────────

function IntegrityGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-500' : 'text-red-500'
  const bgColor =
    score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="mb-2 text-xs font-medium text-zinc-500">언행일치 점수</p>
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold tabular-nums ${color}`}>{score}</span>
        <span className="mb-1 text-sm text-zinc-400">/ 100</span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div className={`h-2 rounded-full transition-all ${bgColor}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: RiskFactor['severity'] }) {
  const classes = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  const labels = { high: '높음', medium: '중간', low: '낮음' }
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${classes[severity]}`}>
      {labels[severity]}
    </span>
  )
}

function ResultCard({ result }: { result: QualitativeResult }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {result.integrity_score !== null && <IntegrityGauge score={result.integrity_score} />}
        {result.summary_ko && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium text-zinc-500">분석 요약</p>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {result.summary_ko}
            </p>
          </div>
        )}
      </div>

      {result.risk_factors && result.risk_factors.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">리스크 요인</h3>
          <ul className="space-y-2">
            {result.risk_factors.map((rf, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{rf.title}</span>
                    <SeverityBadge severity={rf.severity} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{rf.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.growth_drivers && result.growth_drivers.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">성장 동력</h3>
          <ul className="space-y-2">
            {result.growth_drivers.map((gd, i) => (
              <li key={i} className="rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{gd.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{gd.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.noise_filter && result.noise_filter.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">노이즈 필터</h3>
          <ul className="space-y-2">
            {result.noise_filter.map((nf, i) => (
              <li key={i} className="rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 text-sm ${nf.is_substantiated ? 'text-emerald-500' : 'text-red-500'}`}>
                    {nf.is_substantiated ? '✓' : '✗'}
                  </span>
                  <div>
                    <p className="text-sm text-zinc-800 dark:text-zinc-100">{nf.claim}</p>
                    <p className="mt-1 text-xs text-zinc-500">{nf.evidence}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function QualitativeAnalysisView({ ticker, market }: Props) {
  const [entries, setEntries] = useState<QualitativeIndexEntry[]>([])
  const [selected, setSelected] = useState<QualitativeIndexEntry | null>(null)
  const [result, setResult] = useState<QualitativeResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [resultLoading, setResultLoading] = useState(false)
  const [noData, setNoData] = useState(false)

  // 인덱스 로드
  useEffect(() => {
    setLoading(true)
    setNoData(false)
    getQualitativeIndex(ticker, market)
      .then((idx) => {
        setEntries(idx.analyses)
        if (idx.analyses.length > 0) {
          setSelected(idx.analyses[0])
        }
      })
      .catch(() => setNoData(true))
      .finally(() => setLoading(false))
  }, [ticker, market])

  // 선택된 항목 결과 로드
  useEffect(() => {
    if (!selected) return
    setResultLoading(true)
    setResult(null)
    getQualitativeResult(ticker, market, selected.year, selected.doc_type)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setResultLoading(false))
  }, [ticker, market, selected])

  return (
    <div className="space-y-8">
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-bold">
          {ticker}
          <span className="ml-2 text-base font-normal text-zinc-500">({market})</span>
        </h2>
        <span className="text-sm text-zinc-500">정성적 분석</span>
      </div>

      {/* 새 분석 실행 안내 */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        새 분석을 실행하려면{' '}
        <a
          href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'your-repo'}/actions/workflows/analyze_qualitative.yml`}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
        >
          GitHub Actions → M3 Qualitative Analysis
        </a>
        를 수동으로 트리거하세요. (ticker: {ticker}, market: {market})
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <span className="text-sm text-zinc-400">분석 목록 로딩 중…</span>
        </div>
      )}

      {noData && !loading && (
        <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            아직 분석 결과가 없습니다. GitHub Actions를 실행하면 여기에 표시됩니다.
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <>
          {/* 분석 선택 탭 */}
          <div className="flex flex-wrap gap-2">
            {entries.map((e) => {
              const isActive = selected?.year === e.year && selected?.doc_type === e.doc_type
              return (
                <button
                  key={`${e.year}-${e.doc_type}`}
                  onClick={() => setSelected(e)}
                  className={[
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                      : 'border border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400',
                  ].join(' ')}
                >
                  {e.year} {DOC_LABEL[e.doc_type as DocType]}
                </button>
              )
            })}
          </div>

          {/* 결과 표시 */}
          {resultLoading && (
            <div className="flex h-40 items-center justify-center">
              <span className="text-sm text-zinc-400">결과 로딩 중…</span>
            </div>
          )}
          {!resultLoading && result && <ResultCard result={result} />}
        </>
      )}
    </div>
  )
}
