'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getFundamentals, getQuarterlyInsights } from '@/lib/api-client'
import type { FundamentalAnalysis, FundamentalMetrics, Market, QuarterlyInsightMap } from '@/types'
import FundamentalsCharts from '@/components/charts/FundamentalsCharts'
import { Card, Eyebrow, MetricBar, Reveal, TabHead, Term } from '@/components/ui'

function fmt(v: number | null, suffix = ''): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}${suffix}`
}

function MetricCard({
  k, label, value, unit, hint, barValue, accent,
}: {
  k: string; label: string; value: string; unit?: string
  hint?: string; barValue?: number; accent?: boolean
}) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 9, padding: '13px 15px', background: 'var(--surface)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.08em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
        {k}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, margin: '7px 0 3px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 9 }}>{label}</div>
      {barValue != null && <MetricBar value={barValue} accent={accent} />}
      {hint && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 7 }}>{hint}</div>}
    </div>
  )
}

function buildMetrics(m: FundamentalMetrics) {
  return [
    { k: 'ROE', label: '자기자본이익률', value: fmt(m.roe, '%'), barValue: Math.min(100, (m.roe ?? 0) * 4), accent: (m.roe ?? 0) >= 15, hint: 'ROE > 15% → 우수' },
    { k: 'ROA', label: '총자산이익률', value: fmt(m.roa, '%'), barValue: Math.min(100, (m.roa ?? 0) * 10), accent: (m.roa ?? 0) >= 8, hint: 'ROA > 8% → 우수' },
    { k: 'OP.MGN', label: '영업이익률', value: fmt(m.operating_margin, '%'), barValue: Math.min(100, (m.operating_margin ?? 0) * 3.3), accent: (m.operating_margin ?? 0) >= 20, hint: 'Op.Mgn > 20% → 우수' },
    { k: 'DEBT', label: '부채비율', value: fmt(m.debt_ratio, '%'), barValue: Math.min(100, m.debt_ratio ?? 0), accent: false, hint: '낮을수록 안정' },
    { k: 'ICR', label: '이자보상배율', value: fmt(m.icr, 'x'), barValue: Math.min(100, ((m.icr ?? 0) / 20) * 100), accent: (m.icr ?? 0) >= 5, hint: 'ICR > 5 → 안전' },
    { k: 'PER', label: '주가수익비율', value: fmt(m.per, 'x'), barValue: m.per != null ? Math.max(0, 100 - Math.min(100, m.per * 2)) : 0, accent: false, hint: '낮을수록 저평가' },
  ]
}

function FundamentalsContent() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market

  const [data, setData] = useState<FundamentalAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quarterlyInsights, setQuarterlyInsights] = useState<QuarterlyInsightMap | null>(null)
  const [quarterlyLoading, setQuarterlyLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setErrorMsg(null)
    getFundamentals(ticker, market)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err: { status?: number }) => {
        if (!cancelled) setErrorMsg(
          err?.status === 404
            ? `${ticker} 종목의 재무 데이터를 찾을 수 없습니다.`
            : '데이터를 불러오는 중 오류가 발생했습니다.',
        )
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
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

  if (isLoading) return <LoadingSkeleton />
  if (errorMsg) return (
    <div style={{ display: 'flex', height: 240, alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: 12 }}>
      <p style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>{errorMsg}</p>
    </div>
  )
  if (!data) return null

  const latest = data.metrics_by_year.at(-1) ?? null
  const metrics = latest ? buildMetrics(latest) : []

  return (
    <div className="eq-tab-body">
      <TabHead
        n={1}
        kicker="Fundamental · 펀더멘털"
        title="기업의 체력"
        lede="재무제표가 말하는 현금창출력과 자본효율. 표면의 한 줄 평가 아래로, 같은 숫자를 점점 더 정밀하게 들여다봅니다."
      />

      {/* Surface — 연도별 차트 */}
      <Card>
        <FundamentalsCharts
          data={data}
          quarterlyInsights={quarterlyInsights}
          quarterlyLoading={quarterlyLoading}
        />
      </Card>

      {/* 핵심 지표 카드 */}
      {metrics.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <Eyebrow n={2}>핵심 지표 · Key Ratios</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12, marginTop: 12 }}>
            {metrics.map((m) => <MetricCard key={m.k} {...m} />)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.6 }}>
            막대 위 세로선은{' '}
            <Term def="비교 기준선. 동종업계 중앙값 또는 자본비용(WACC) 등 '이 선을 넘으면 우월'을 뜻하는 임계값입니다.">벤치마크 임계값</Term>입니다.
          </div>
        </div>
      )}

      {/* Depth 2 — 추세 */}
      {data.trends && (
        <Reveal title="매출 · 이익 추세 상세" hint="성장의 질을 분해" depth={2}>
          <div style={{ paddingTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
              {(['revenue', 'operating_margin', 'roe'] as const).map((key) => {
                const trend = data.trends[key]
                if (!trend) return null
                const vals = trend.values.slice(-5)
                return (
                  <div key={key} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', background: 'var(--surface)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 8 }}>
                      {key === 'revenue' ? '매출' : key === 'operating_margin' ? '영업이익률' : 'ROE'} 추이
                    </div>
                    {vals.map(([year, val]) => (
                      <div key={year} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{year}</span>
                        <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {val != null ? (key === 'revenue' ? (Math.abs(val) >= 1e12 ? `${(val/1e12).toFixed(1)}T` : Math.abs(val) >= 1e9 ? `${(val/1e9).toFixed(1)}B` : Math.abs(val) >= 1e6 ? `${(val/1e6).toFixed(1)}M` : val.toFixed(0)) : `${val.toFixed(1)}%`) : '—'}
                        </span>
                      </div>
                    ))}
                    {trend.cagr != null && (
                      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                        CAGR {trend.cagr.toFixed(1)}% · {trend.direction === 'improving' ? '↑ 개선' : trend.direction === 'deteriorating' ? '↓ 악화' : '→ 안정'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      )}

      {/* Depth 3 — 원자료 */}
      {latest && (
        <Reveal title="연도별 원데이터 · 전체 지표" hint={`${data.metrics_by_year.length}개년`} depth={3}>
          <div style={{ marginTop: 8, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: '1px solid var(--ink-2)', color: 'var(--ink-3)', fontWeight: 600, fontSize: 10, letterSpacing: '.08em' }}>지표</th>
                  {data.metrics_by_year.map((y) => (
                    <th key={y.fiscal_year} style={{ textAlign: 'right', padding: '6px 0 6px 10px', borderBottom: '1px solid var(--ink-2)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 10.5 }}>
                      {y.fiscal_year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['roe','roa','operating_margin','debt_ratio','icr','per','pbr'] as const).map((k) => (
                  <tr key={k}>
                    <td style={{ textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: '1px solid var(--line)', color: 'var(--ink-2)', textTransform: 'uppercase', fontSize: 10.5 }}>{k}</td>
                    {data.metrics_by_year.map((y) => (
                      <td key={y.fiscal_year} style={{ textAlign: 'right', padding: '6px 0 6px 10px', borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}>
                        {y[k] != null ? `${y[k]!.toFixed(1)}` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ height: 32, width: 200, borderRadius: 6, background: 'var(--surface-2)', marginBottom: 16 }} />
      <div style={{ height: 280, borderRadius: 12, background: 'var(--surface-2)' }} />
    </div>
  )
}

export default function FundamentalsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FundamentalsContent />
    </Suspense>
  )
}
