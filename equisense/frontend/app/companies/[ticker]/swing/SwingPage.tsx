'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type {
  FundamentalAnalysis, GateAResult, GateBResult,
  Market, QuarterlyInsightMap, RRInput, RRResult, StockType, SwingFinalResult,
} from '@/types'
import { getFundamentals, getQuarterlyInsights } from '@/lib/api-client'
import { checkRR, getTimeStop, getFinalVerdict } from '@/lib/adapters/swingPipeline'
import GateAPanel from '@/components/swing/GateAPanel'
import GateBPanel from '@/components/swing/GateBPanel'
import SwingScoreDrawer from '@/components/swing/SwingScoreDrawer'

function fmtKR(n: number) { return n.toLocaleString('ko-KR') }

const STOCK_TYPE_LABEL: Record<StockType, string> = {
  high_beta:  '고베타 (10거래일)',
  value:      '가치형 (15거래일)',
  small_cap:  '소형 (10거래일)',
}

const FINAL_BORDER: Record<SwingFinalResult['verdict'], string> = {
  PASS:        'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20',
  CONDITIONAL: 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20',
  BLOCK:       'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/20',
}
const FINAL_TEXT: Record<SwingFinalResult['verdict'], string> = {
  PASS:        'text-emerald-700 dark:text-emerald-400',
  CONDITIONAL: 'text-amber-700 dark:text-amber-400',
  BLOCK:       'text-red-700 dark:text-red-400',
}
const FINAL_LABEL: Record<SwingFinalResult['verdict'], string> = {
  PASS: '✅ 진입 가능', CONDITIONAL: '⚠️ 조건부 진입', BLOCK: '🚫 진입 불가',
}

function Arrow() {
  return (
    <div className="flex justify-center py-1 text-xl text-indigo-400 select-none dark:text-indigo-600">↓</div>
  )
}

function BlockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">이전 단계 통과 후 활성화</span>
    </div>
  )
}

function SwingContent() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market

  const [fundamentals, setFundamentals] = useState<FundamentalAnalysis | null>(null)
  const [quarterlyInsights, setQuarterlyInsights] = useState<QuarterlyInsightMap | null>(null)
  const [quarterlyLoading, setQuarterlyLoading] = useState(false)
  const [gateAResult, setGateAResult] = useState<GateAResult | null>(null)
  const [gateBResult, setGateBResult] = useState<GateBResult | null>(null)
  const [stockType, setStockType] = useState<StockType>('high_beta')
  const [rrInput, setRRInput] = useState<RRInput | null>(null)
  const [final, setFinal] = useState<SwingFinalResult | null>(null)

  useEffect(() => {
    if (!ticker) return
    getFundamentals(ticker, market).then(setFundamentals).catch(() => {})
  }, [ticker, market])

  useEffect(() => {
    if (!ticker) return
    let cancelled = false
    setQuarterlyLoading(true)
    getQuarterlyInsights(ticker, market)
      .then(d => { if (!cancelled) setQuarterlyInsights(d) })
      .catch(() => { if (!cancelled) setQuarterlyInsights(null) })
      .finally(() => { if (!cancelled) setQuarterlyLoading(false) })
    return () => { cancelled = true }
  }, [ticker, market])

  // R:R 기본값 계산 (current_price + week52_high 기반)
  useEffect(() => {
    const latest = fundamentals?.metrics_by_year.at(-1)
    if (!latest?.current_price) return
    const entry  = latest.current_price
    const stop   = Math.round(entry * 0.95 / 1000) * 1000
    const target = latest.week52_high
      ? Math.round(latest.week52_high * 1.05 / 1000) * 1000
      : Math.round(entry * 1.20 / 1000) * 1000
    setRRInput({ entry, stop, target })
  }, [fundamentals])

  // 최종 판정 갱신
  useEffect(() => {
    if (!gateAResult || !gateBResult || !rrInput) return
    const latest = fundamentals?.metrics_by_year.at(-1)
    const step1Pass =
      (latest?.debt_ratio ?? Infinity) <= 200 &&
      (latest?.fcf ?? 0) > 0

    const rr = checkRR(rrInput)
    const result = getFinalVerdict(
      gateAResult.verdict,
      gateBResult.verdict,
      step1Pass,
      rr,
      rrInput.entry,
      rrInput.stop,
      rrInput.target,
      stockType,
    )
    setFinal(result)
  }, [gateAResult, gateBResult, rrInput, fundamentals, stockType])

  const gateABlocked = gateAResult?.verdict === 'BLOCK'
  const gateBBlocked = gateABlocked || gateBResult?.verdict === 'BLOCK'
  const rr = rrInput ? checkRR(rrInput) : null
  const latest = fundamentals?.metrics_by_year.at(-1)
  const timeStop = getTimeStop(new Date(), stockType)

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {fundamentals?.name ? `${fundamentals.name} (${ticker})` : ticker}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          스윙 트레이딩 진입 판정 — Minervini SEPA 파이프라인
        </p>
      </div>

      {/* Gate A */}
      <GateAPanel onResult={setGateAResult} />
      <Arrow />

      {/* Gate B */}
      <div className="relative">
        {gateABlocked && <BlockedOverlay />}
        <GateBPanel onResult={setGateBResult} />
      </div>
      <Arrow />

      {/* Step 1 체력필터 — 스윙 적합도 */}
      <div className={`relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden ${gateBBlocked ? 'opacity-40' : ''}`}>
        {gateBBlocked && <BlockedOverlay />}
        <div className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Step 1 — 체력 필터</span>
        </div>
        <div className="p-3">
          <SwingScoreDrawer
            metrics={latest ?? null}
            quarterlyInsights={quarterlyInsights}
            quarterlyLoading={quarterlyLoading}
            market={market}
          />
        </div>
      </div>
      <Arrow />

      {/* R:R 검증 */}
      <div className={`relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden ${gateBBlocked ? 'opacity-40' : ''}`}>
        {gateBBlocked && <BlockedOverlay />}
        <div className="flex items-center justify-between bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Step 5 — R:R 검증</span>
          {rr && (
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ring-1 ${
              rr.verdict === 'PASS'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:ring-emerald-800'
                : rr.verdict === 'CAUTION'
                ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:ring-amber-800'
                : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/20 dark:text-red-400 dark:ring-red-800'
            }`}>
              {rr.verdict === 'PASS' ? '✅ PASS' : rr.verdict === 'CAUTION' ? '⚠️ CAUTION' : '🚫 BLOCK'}
            </span>
          )}
        </div>
        {rrInput && (
          <div className="grid grid-cols-3 gap-3 p-4">
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">진입가 (현재가)</div>
              <div className="font-bold">{fmtKR(rrInput.entry)}원</div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">손절선</div>
              <div className="font-bold text-red-500 dark:text-red-400">{fmtKR(rrInput.stop)}원</div>
              <input
                type="number"
                step="1000"
                value={rrInput.stop}
                onChange={e => setRRInput(p => p ? { ...p, stop: parseFloat(e.target.value) || p.stop } : p)}
                className="mt-1 w-full border-b border-zinc-200 bg-transparent text-xs text-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-500"
              />
              <div className="mt-0.5 text-[10px] text-zinc-400">{rr?.loss_pct}% 손실</div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">목표가 (52주고가×1.05)</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">{fmtKR(rrInput.target)}원</div>
              <input
                type="number"
                step="1000"
                value={rrInput.target}
                onChange={e => setRRInput(p => p ? { ...p, target: parseFloat(e.target.value) || p.target } : p)}
                className="mt-1 w-full border-b border-zinc-200 bg-transparent text-xs text-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-500"
              />
              <div className="mt-0.5 text-[10px] text-zinc-400">+{rr?.gain_pct}% 수익</div>
            </div>
          </div>
        )}
        {rr && (
          <div className="border-t border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              R:R = {rr.rr} : 1
            </span>
            <span className="ml-3 text-xs text-zinc-400">손익분기 승률 {rr.breakeven_winrate}%</span>
          </div>
        )}
      </div>
      <Arrow />

      {/* 시간 손절 */}
      <div className={`relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden ${gateBBlocked ? 'opacity-40' : ''}`}>
        {gateBBlocked && <BlockedOverlay />}
        <div className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Step 6 — 시간 손절</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">종목 유형</div>
            <div className="flex flex-col gap-1">
              {(['high_beta', 'value', 'small_cap'] as StockType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setStockType(t)}
                  className={[
                    'rounded px-2 py-1 text-left text-xs font-medium transition-colors',
                    stockType === t
                      ? 'bg-indigo-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700',
                  ].join(' ')}
                >
                  {STOCK_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">시간 손절 기한</div>
            <div className="font-bold">{timeStop.deadline}</div>
            <div className="text-xs text-zinc-400">{timeStop.total_days}거래일 기준</div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">상태</div>
            <div className={`font-bold ${
              timeStop.status === 'HOLDING'
                ? 'text-emerald-600 dark:text-emerald-400'
                : timeStop.status === 'PREPARE_EXIT'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}>{timeStop.status}</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500">{timeStop.action}</div>
          </div>
        </div>
      </div>

      {/* 최종 판정 */}
      {final && (
        <>
          <Arrow />
          <div className={`rounded-lg border-2 p-5 text-center ${FINAL_BORDER[final.verdict]}`}>
            <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">최종 판정</div>
            <div className={`text-2xl font-bold ${FINAL_TEXT[final.verdict]}`}>
              {FINAL_LABEL[final.verdict]}
            </div>
            <p className={`mt-2 text-sm ${FINAL_TEXT[final.verdict]}`}>{final.summary_line}</p>
          </div>
        </>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-40 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-60 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  )
}

export default function SwingPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SwingContent />
    </Suspense>
  )
}
