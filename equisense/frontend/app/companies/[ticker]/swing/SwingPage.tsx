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
import { Card, Eyebrow, Reveal, Stat, TabHead, Term, Verdict } from '@/components/ui'
import type { VerdictTone } from '@/components/ui'

function fmtKR(n: number) { return n.toLocaleString('ko-KR') }

const STOCK_TYPE_LABEL: Record<StockType, string> = {
  high_beta: '고베타 (10거래일)',
  value: '가치형 (15거래일)',
  small_cap: '소형 (10거래일)',
}

const FINAL_VERDICT_LABEL: Record<SwingFinalResult['verdict'], string> = {
  PASS: 'PASS · 진입 가능',
  CONDITIONAL: 'CONDITIONAL · 조건부',
  BLOCK: 'BLOCK · 진입 불가',
}
const FINAL_VERDICT_TONE: Record<SwingFinalResult['verdict'], VerdictTone> = {
  PASS: 'strong', CONDITIONAL: 'neutral', BLOCK: 'weak',
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
      .then((d) => { if (!cancelled) setQuarterlyInsights(d) })
      .catch(() => { if (!cancelled) setQuarterlyInsights(null) })
      .finally(() => { if (!cancelled) setQuarterlyLoading(false) })
    return () => { cancelled = true }
  }, [ticker, market])

  useEffect(() => {
    const latest = fundamentals?.metrics_by_year.at(-1)
    if (!latest?.current_price) return
    const entry = latest.current_price
    const stop = Math.round(entry * 0.95 / 1000) * 1000
    const target = latest.week52_high
      ? Math.round(latest.week52_high * 1.05 / 1000) * 1000
      : Math.round(entry * 1.20 / 1000) * 1000
    setRRInput({ entry, stop, target })
  }, [fundamentals])

  useEffect(() => {
    if (!gateAResult || !gateBResult || !rrInput) return
    const latest = fundamentals?.metrics_by_year.at(-1)
    const step1Pass = (latest?.debt_ratio ?? Infinity) <= 200 && (latest?.fcf ?? 0) > 0
    const rr = checkRR(rrInput)
    const result = getFinalVerdict(
      gateAResult.verdict, gateBResult.verdict, step1Pass, rr,
      rrInput.entry, rrInput.stop, rrInput.target, stockType,
    )
    setFinal(result)
  }, [gateAResult, gateBResult, rrInput, fundamentals, stockType])

  const gateABlocked = gateAResult?.verdict === 'BLOCK'
  const gateBBlocked = gateABlocked || gateBResult?.verdict === 'BLOCK'
  const rr = rrInput ? checkRR(rrInput) : null
  const latest = fundamentals?.metrics_by_year.at(-1)
  const timeStop = getTimeStop(new Date(), stockType)

  return (
    <div className="eq-tab-body">
      <TabHead
        n={4}
        kicker="Technical · SEPA 스윙"
        title="언제, 얼마에, 어디서 자를 것인가"
        lede="좋은 기업이라도 진입 타이밍은 별개의 규율. Minervini의 SEPA 추세 템플릿으로 추세 정합성을 채점하고, 진입·손절·목표를 한 화면에서 판정합니다."
      />

      {/* Surface — 최종 판정 카드 */}
      {final && (
        <Card style={{ display: 'grid', gridTemplateColumns: 'auto 1px 1fr', gap: 26, alignItems: 'center', marginBottom: 22 }}>
          <div style={{ textAlign: 'center', minWidth: 140 }}>
            <Verdict label={FINAL_VERDICT_LABEL[final.verdict]} tone={FINAL_VERDICT_TONE[final.verdict]} big />
            <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>{final.summary_line}</p>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <Stat
              value={rr ? rr.rr.toFixed(2) : '—'}
              unit=": 1"
              label="손익비 R-Multiple"
              sub={rr ? `손익분기 승률 ${rr.breakeven_winrate}%` : undefined}
            />
            {rrInput && (
              <Stat
                value={market === 'KR' ? fmtKR(rrInput.entry) : `$${rrInput.entry.toFixed(2)}`}
                label="현재가 (진입가)"
                sub={market === 'KR' ? '원' : undefined}
              />
            )}
          </div>
        </Card>
      )}

      {/* Gate A */}
      <Reveal title="Gate A — 거시환경 점검" hint="VIX · KOSPI · 금리" depth={2} defaultOpen>
        <div style={{ paddingTop: 8 }}>
          <GateAPanel onResult={setGateAResult} />
        </div>
      </Reveal>

      {/* Gate B */}
      <Reveal
        title="Gate B — 수급 강도 점검"
        hint="외국인·기관 · 섹터 ETF · 공매도"
        depth={2}
        defaultOpen={!gateABlocked}
      >
        <div style={{ paddingTop: 8, position: 'relative' }}>
          {gateABlocked && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'color-mix(in srgb, var(--surface-2) 80%, transparent)',
              borderRadius: 8, backdropFilter: 'blur(2px)',
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Gate A 통과 후 활성화</span>
            </div>
          )}
          <GateBPanel onResult={setGateBResult} />
        </div>
      </Reveal>

      {/* Step 1 체력 필터 */}
      <Reveal
        title="Step 1 — 체력 필터"
        hint="부채비율 · FCF · 분기 모멘텀"
        depth={2}
        defaultOpen={!gateBBlocked}
      >
        <div style={{ paddingTop: 8, position: 'relative', opacity: gateBBlocked ? 0.4 : 1 }}>
          {gateBBlocked && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'color-mix(in srgb, var(--surface-2) 80%, transparent)',
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>이전 단계 통과 후 활성화</span>
            </div>
          )}
          <SwingScoreDrawer
            metrics={latest ?? null}
            quarterlyInsights={quarterlyInsights}
            quarterlyLoading={quarterlyLoading}
            market={market}
          />
        </div>
      </Reveal>

      {/* R:R 검증 */}
      <Reveal title="Step 5 — R:R 손익비 검증" hint="진입·손절·목표 설정" depth={2} defaultOpen={!gateBBlocked}>
        <div style={{ paddingTop: 8, opacity: gateBBlocked ? 0.4 : 1 }}>
          {rrInput && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: '진입가 (현재가)', value: market === 'KR' ? `${fmtKR(rrInput.entry)}원` : `$${rrInput.entry.toFixed(2)}`, color: 'var(--accent)', editable: false },
                { label: '손절선', value: market === 'KR' ? `${fmtKR(rrInput.stop)}원` : `$${rrInput.stop.toFixed(2)}`, color: 'var(--ink)', editable: true, key: 'stop' as const },
                { label: '목표가', value: market === 'KR' ? `${fmtKR(rrInput.target)}원` : `$${rrInput.target.toFixed(2)}`, color: 'var(--accent)', editable: true, key: 'target' as const },
              ].map((f) => (
                <div key={f.label} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', background: 'var(--surface)', borderLeft: `3px solid ${f.color}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>{f.value}</div>
                  {f.editable && f.key && (
                    <input
                      type="number"
                      step="1000"
                      value={rrInput[f.key]}
                      onChange={(e) => setRRInput((p) => p ? { ...p, [f.key!]: parseFloat(e.target.value) || p[f.key!] } : p)}
                      style={{ marginTop: 6, width: '100%', background: 'transparent', fontSize: 11, color: 'var(--ink-3)', outline: 'none', border: 'none', borderBottom: '1px solid var(--line-2)', padding: '2px 0' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {rr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: rr.verdict === 'PASS' ? 'var(--accent)' : rr.verdict === 'CAUTION' ? '#b45309' : 'var(--ink-2)' }}>
                R:R = {rr.rr} : 1
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>손익분기 승률 {rr.breakeven_winrate}%</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>손실 {rr.loss_pct}% · 수익 {rr.gain_pct}%</span>
            </div>
          )}
        </div>
      </Reveal>

      {/* 시간 손절 */}
      <Reveal title="Step 6 — 시간 손절" hint="보유 기한 · 청산 기준일" depth={3}>
        <div style={{ paddingTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 1fr 1fr', gap: 12 }}>
            {/* 종목 유형 선택 */}
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', background: 'var(--surface)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 8 }}>종목 유형</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(['high_beta', 'value', 'small_cap'] as StockType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStockType(t)}
                    style={{
                      all: 'unset', boxSizing: 'border-box',
                      padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                      fontSize: 12, textAlign: 'left',
                      background: stockType === t ? 'var(--ink)' : 'transparent',
                      color: stockType === t ? 'var(--bg)' : 'var(--ink-2)',
                      border: '1px solid ' + (stockType === t ? 'var(--ink)' : 'var(--line-2)'),
                    }}
                  >
                    {STOCK_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', background: 'var(--surface)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>시간 손절 기한</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>{timeStop.deadline}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{timeStop.total_days}거래일 기준</div>
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', background: 'var(--surface)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>상태</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600,
                color: timeStop.status === 'HOLDING' ? 'var(--accent)' : timeStop.status === 'PREPARE_EXIT' ? '#b45309' : 'var(--ink)',
              }}>
                {timeStop.status}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{timeStop.action}</div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ height: 32, width: 200, borderRadius: 6, background: 'var(--surface-2)', marginBottom: 16 }} />
      <div style={{ height: 120, borderRadius: 12, background: 'var(--surface-2)', marginBottom: 10 }} />
      <div style={{ height: 200, borderRadius: 12, background: 'var(--surface-2)' }} />
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
