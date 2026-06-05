'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Market, SentimentData } from '@/types'
import { fetchSentimentData } from '@/lib/api-client'
import { Card, Eyebrow, MetricBar, Reveal, TabHead, Term } from '@/components/ui'
import QualitativeAnalysisView from '@/components/qualitative/QualitativeAnalysisView'

function fmtPrice(n: number | null, market: Market): string {
  if (n == null) return '—'
  return market === 'KR' ? `${n.toLocaleString('ko-KR')}원` : `$${n.toFixed(2)}`
}

function fmtDate(dt: string): string {
  if (!dt || dt.length !== 8) return dt
  return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`
}

/* ── 애널리스트 컨센서스 미니 게이지 ── */
function ConsensusGauge({ data, market }: { data: SentimentData['consensus']; market: Market }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>데이터 없음</p>
  const { strong_buy, buy, hold, sell, strong_sell, total } = data
  const bullish = strong_buy + buy
  const bearish = sell + strong_sell
  const bullPct = total > 0 ? Math.round((bullish / total) * 100) : 0
  const label = bullish > bearish + hold ? '매수 우세' : bearish > bullish + hold ? '매도 우세' : '중립'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>{bullPct}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>% 매수 · {total}개 기관</span>
      </div>
      <MetricBar value={bullPct} accent={bullPct >= 60} />
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: bullish > bearish ? 'var(--accent)' : 'var(--ink-3)' }}>
        {label} · 강매수 {strong_buy} · 매수 {buy} · 중립 {hold} · 매도 {bearish}
      </div>
      {data.target_mean && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 4 }}>목표주가 컨센서스</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <span style={{ color: 'var(--ink-3)' }}>{fmtPrice(data.target_low, market)}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>중앙 {fmtPrice(data.target_mean, market)}</span>
            <span style={{ color: 'var(--ink-3)' }}>{fmtPrice(data.target_high, market)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function QualitativeContent() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market
  const name = searchParams.get('name')

  const [sentiment, setSentiment] = useState<SentimentData | null>(null)
  const [sentimentLoading, setSentimentLoading] = useState(true)

  useEffect(() => {
    if (!ticker) return
    let cancelled = false
    setSentimentLoading(true)
    fetchSentimentData(ticker, market)
      .then((d) => { if (!cancelled) setSentiment(d) })
      .catch(() => { if (!cancelled) setSentiment(null) })
      .finally(() => { if (!cancelled) setSentimentLoading(false) })
    return () => { cancelled = true }
  }, [ticker, market])

  return (
    <div className="eq-tab-body">
      <TabHead
        n={3}
        kicker="Qualitative · 정성·심리"
        title="시장은 무엇을 믿고 있는가"
        lede="숫자가 닿지 못하는 영역 — 경영진의 언어, 뉴스의 결, 군중의 정서. AI가 정성 신호를 읽어 한 편의 메모로 압축하고, 그 근거를 단계적으로 펼칩니다."
      />

      {/* Surface — 컨센서스 + AI 분석 나란히 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,300px) 1fr', gap: 28 }}>
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <Eyebrow>애널리스트 컨센서스 · Consensus</Eyebrow>
          <div style={{ marginTop: 16, flex: 1 }}>
            {sentimentLoading ? (
              <div style={{ height: 80, borderRadius: 6, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ) : (
              <ConsensusGauge data={sentiment?.consensus ?? null} market={market} />
            )}
          </div>
        </Card>

        <Card style={{ background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 26, height: 26, borderRadius: 6, background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--bg)',
            }}>AI</span>
            <Eyebrow>정성 종합 분석 · Generated</Eyebrow>
          </div>
          <QualitativeAnalysisView ticker={ticker} market={market} name={name} />
        </Card>
      </div>

      {/* Depth 2 — 어닝 서프라이즈 + 수급 */}
      <Reveal title="어닝 서프라이즈 · 실적 놀라움 추이" hint="컨센서스 대비 실제 EPS" depth={2}>
        {sentimentLoading ? (
          <div style={{ height: 60, borderRadius: 6, background: 'var(--surface-2)', marginTop: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : sentiment?.earnings_surprises && sentiment.earnings_surprises.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            {sentiment.earnings_surprises.map((s, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr auto auto',
                alignItems: 'center', gap: 16,
                padding: '10px 0', borderBottom: i < sentiment.earnings_surprises.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{s.quarter}</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>예상 {s.eps_estimate != null ? s.eps_estimate.toFixed(2) : '—'}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink)' }}>실제 {s.eps_actual != null ? s.eps_actual.toFixed(2) : '—'}</span>
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                  color: (s.surprise_pct ?? 0) >= 0 ? 'var(--accent)' : 'var(--ink-2)',
                }}>
                  {s.surprise_pct != null ? `${s.surprise_pct > 0 ? '+' : ''}${s.surprise_pct.toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>어닝 서프라이즈 데이터가 없습니다.</p>
        )}
      </Reveal>

      {/* Depth 3 — 내부자 거래 + 기관 보유 */}
      <Reveal title="내부자 거래 · 기관 보유" hint="원신호 · 90일" depth={3}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 8 }}>
          {/* 내부자 */}
          <div>
            <Eyebrow>내부자 거래 · Insider</Eyebrow>
            <div style={{ marginTop: 10 }}>
              {sentimentLoading ? (
                <div style={{ height: 80, borderRadius: 6, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : sentiment?.insider_transactions && sentiment.insider_transactions.length > 0 ? (
                sentiment.insider_transactions.slice(0, 6).map((it, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: i < 5 ? '1px solid var(--line)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{it.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{it.relation} · {it.date}</div>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                      color: it.transaction === 'buy' ? 'var(--accent)' : 'var(--ink-2)',
                    }}>
                      {it.transaction === 'buy' ? '매수' : it.transaction === 'sell' ? '매도' : '기타'}
                      {it.shares != null && ` ${it.shares.toLocaleString()}`}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>데이터 없음</p>
              )}
            </div>
          </div>

          {/* 기관 보유 */}
          <div>
            <Eyebrow>기관 보유 · Institution</Eyebrow>
            <div style={{ marginTop: 10 }}>
              {sentimentLoading ? (
                <div style={{ height: 80, borderRadius: 6, background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ) : sentiment?.institution_holders && sentiment.institution_holders.length > 0 ? (
                sentiment.institution_holders.slice(0, 6).map((ih, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: i < 5 ? '1px solid var(--line)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{ih.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{ih.report_date}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink)', fontWeight: 700 }}>
                      {ih.pct_held != null ? `${ih.pct_held.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>데이터 없음</p>
              )}
            </div>
          </div>
        </div>

        {/* DART 공시 (KR only) */}
        {market === 'KR' && sentiment?.disclosures && sentiment.disclosures.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Eyebrow>DART 주요 공시</Eyebrow>
            <div style={{ marginTop: 10 }}>
              {sentiment.disclosures.slice(0, 5).map((d, i) => (
                <div key={d.rcept_no} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--line)' : 'none', gap: 12,
                }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.report_nm}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
                    {fmtDate(d.rcept_dt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Reveal>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ height: 32, width: 200, borderRadius: 6, background: 'var(--surface-2)', marginBottom: 16 }} />
      <div style={{ height: 200, borderRadius: 12, background: 'var(--surface-2)' }} />
    </div>
  )
}

export default function QualitativePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <QualitativeContent />
    </Suspense>
  )
}
