'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getJobStatus, triggerQualitativeAnalysis } from '@/lib/api'
import type {
  AnalysisJob,
  DocType,
  JobStatus,
  Market,
  NoiseFilterItem,
  QualitativeResult,
  RiskFactor,
} from '@/types'

const CURRENT_YEAR = new Date().getFullYear()
const FISCAL_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 - i)
const POLL_INTERVAL_MS = 3000

interface Props {
  ticker: string
  market: Market
}

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
        <div
          className={`h-2 rounded-full transition-all ${bgColor}`}
          style={{ width: `${score}%` }}
        />
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
        {result.integrity_score !== null && (
          <IntegrityGauge score={result.integrity_score} />
        )}

        {result.summary_ko && (
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium text-zinc-500">AI 요약</p>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {result.summary_ko}
            </p>
          </div>
        )}
      </div>

      {result.risk_factors && result.risk_factors.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            리스크 요인
          </h3>
          <ul className="space-y-2">
            {result.risk_factors.map((rf, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {rf.title}
                    </span>
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
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            성장 동력
          </h3>
          <ul className="space-y-2">
            {result.growth_drivers.map((gd, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{gd.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{gd.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.noise_filter && result.noise_filter.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            노이즈 필터
          </h3>
          <ul className="space-y-2">
            {result.noise_filter.map((nf, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-100 px-4 py-3 dark:border-zinc-800"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 text-sm ${nf.is_substantiated ? 'text-emerald-500' : 'text-red-500'}`}
                  >
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

function StatusBanner({ status }: { status: JobStatus }) {
  const config = {
    PENDING: {
      text: '분석 대기 중…',
      className: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400',
    },
    PROCESSING: {
      text: 'AI 분석 진행 중… (최대 2분 소요)',
      className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    },
    COMPLETED: { text: '분석 완료', className: 'hidden' },
    FAILED: { text: '분석 중 오류가 발생했습니다.', className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  }
  const c = config[status]
  if (c.className === 'hidden') return null
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${c.className}`}>
      {(status === 'PENDING' || status === 'PROCESSING') && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {c.text}
    </div>
  )
}

export default function QualitativeAnalysisView({ ticker, market }: Props) {
  const [fiscalYear, setFiscalYear] = useState<number>(FISCAL_YEARS[0])
  const [docType, setDocType] = useState<DocType>('annual_report')
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const updated = await getJobStatus(jobId)
          setJob(updated)
          if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
            stopPolling()
          }
        } catch {
          stopPolling()
        }
      }, POLL_INTERVAL_MS)
    },
    [stopPolling],
  )

  useEffect(() => stopPolling, [stopPolling])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await triggerQualitativeAnalysis(ticker, market, fiscalYear, docType)
      const initialJob: AnalysisJob = { job_id: res.job_id, status: 'PENDING', result: null, error: null }
      setJob(initialJob)
      startPolling(res.job_id)
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string }
      if (e?.code === 'RATE_LIMIT_EXCEEDED') {
        setError('일일 분석 한도(5회)에 도달했습니다. 내일 다시 시도해 주세요.')
      } else {
        setError(e?.message ?? '분석 요청에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline gap-3">
        <h2 className="text-2xl font-bold">
          {ticker}
          <span className="ml-2 text-base font-normal text-zinc-500">({market})</span>
        </h2>
        <span className="text-sm text-zinc-500">정성적 분석 (AI)</span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">회계연도</label>
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            disabled={loading || (job?.status === 'PENDING' || job?.status === 'PROCESSING')}
          >
            {FISCAL_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">문서 유형</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            disabled={loading || (job?.status === 'PENDING' || job?.status === 'PROCESSING')}
          >
            <option value="annual_report">사업보고서</option>
            <option value="earnings_call">실적발표</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || job?.status === 'PENDING' || job?.status === 'PROCESSING'}
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? '요청 중…' : '분석 시작'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {job && <StatusBanner status={job.status} />}

      {job?.status === 'COMPLETED' && job.result && (
        <ResultCard result={job.result} />
      )}
    </div>
  )
}
