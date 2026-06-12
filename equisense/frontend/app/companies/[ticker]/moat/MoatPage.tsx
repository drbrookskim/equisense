'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { getMoatScore, getFundamentals } from '@/lib/api-client'
import type { FundamentalAnalysis, Market, MoatAnalysis, MoatDimension } from '@/types'
import { Card, Eyebrow, MetricBar, Reveal, Stat, TabHead, Term, Verdict } from '@/components/ui'
import { useCompanyScores } from '@/contexts/CompanyScoresContext'

/* ── Fortress rings visualization ── */
function MoatRings({ grade }: { grade: string }) {
  const fill = grade === 'wide' ? 3 : grade === 'narrow' ? 2 : 1
  const rs = [54, 40, 26]
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" style={{ display: 'block' }}>
      {rs.map((r, i) => (
        <circle
          key={i} cx="64" cy="64" r={r} fill="none"
          stroke={i < 3 - fill ? 'var(--line-2)' : 'var(--accent)'}
          strokeWidth={i < 3 - fill ? 1.5 : 6}
          strokeOpacity={i < 3 - fill ? 1 : 1 - i * 0.18}
          strokeDasharray={i < 3 - fill ? '3 4' : undefined}
        />
      ))}
      <circle cx="64" cy="64" r="12" fill="var(--ink)" />
      <text x="64" y="68" textAnchor="middle"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, fill: 'var(--bg)' }}>
        CO.
      </text>
    </svg>
  )
}

/* ── Custom SVG radar ── */
const DIMENSION_ORDER: MoatDimension[] = [
  'intangible_assets', 'switching_costs', 'network_effects',
  'efficient_scale', 'cost_advantage',
]
const DIMENSION_LABEL: Record<MoatDimension, string> = {
  cost_advantage: '비용 우위',
  intangible_assets: '무형 자산',
  switching_costs: '전환 비용',
  network_effects: '네트워크 효과',
  efficient_scale: '효율적 규모',
}

function RadarChart({ scores }: { scores: Record<MoatDimension, number> }) {
  const size = 260
  const cx = size / 2, cy = size / 2, r = 100
  const n = DIMENSION_ORDER.length
  const pts = DIMENSION_ORDER.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    return { cos: Math.cos(angle), sin: Math.sin(angle) }
  })

  const gridLevels = [0.25, 0.5, 0.75, 1]

  const valuePath = DIMENSION_ORDER.map((dim, i) => {
    const v = (scores[dim] ?? 0) / 10
    const x = cx + pts[i].cos * r * v
    const y = cy + pts[i].sin * r * v
    return (i === 0 ? 'M' : 'L') + `${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ') + 'Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon key={level}
          points={DIMENSION_ORDER.map((_, i) => {
            const x = cx + pts[i].cos * r * level
            const y = cy + pts[i].sin * r * level
            return `${x.toFixed(1)},${y.toFixed(1)}`
          }).join(' ')}
          fill="none" stroke="var(--line)" strokeWidth="1"
        />
      ))}
      {/* Spokes */}
      {pts.map((p, i) => (
        <line key={i}
          x1={cx} y1={cy}
          x2={(cx + p.cos * r).toFixed(1)}
          y2={(cy + p.sin * r).toFixed(1)}
          stroke="var(--line)" strokeWidth="1"
        />
      ))}
      {/* Value area */}
      <path d={valuePath} fill="var(--accent)" fillOpacity="0.18" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {/* Axis labels */}
      {DIMENSION_ORDER.map((dim, i) => {
        const lx = cx + pts[i].cos * (r + 22)
        const ly = cy + pts[i].sin * (r + 22)
        return (
          <text key={dim} x={lx.toFixed(1)} y={ly.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--ink-2)' }}>
            {DIMENSION_LABEL[dim]}
          </text>
        )
      })}
    </svg>
  )
}

/* ── Grade display helpers ── */
const GRADE_VERDICT_LABEL: Record<string, string> = {
  wide: 'WIDE · 광폭',
  narrow: 'NARROW · 협폭',
  none: 'NONE · 없음',
}
const GRADE_TONE: Record<string, 'strong' | 'positive' | 'weak'> = {
  wide: 'strong',
  narrow: 'positive',
  none: 'weak',
}
const GRADE_DURABILITY: Record<string, string> = {
  wide: '10년+',
  narrow: '5~10년',
  none: '불확실',
}
const COMPOUND_EMOJI: Record<string, string> = {
  lock_in_ring: '🔗',
  value_flywheel: '🔄',
  scale_fortress: '🏰',
}

/* ── ROIC vs WACC Chart ── */
function RoicWaccChart({ fundamentals }: { fundamentals: FundamentalAnalysis }) {
  const rows = fundamentals.metrics_by_year
    .filter((m) => m.roa != null)
    .map((m) => {
      // ROIC ≈ ROA × (1 + D/E × (1 - tax_rate)), approximate with ROA × 1.3
      const roic = m.roa != null ? Math.min(80, m.roa * 1.3) : null
      // WACC: approximate 6-9% based on debt level
      const wacc = m.debt_ratio != null
        ? Math.max(6, Math.min(10, 7 + m.debt_ratio * 0.01))
        : 8
      return { year: String(m.fiscal_year), ROIC: roic, WACC: wacc }
    })

  if (rows.length < 2) return (
    <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>데이터 부족</p>
  )

  const latestSpread = rows.at(-1)
  const spread = latestSpread?.ROIC != null && latestSpread?.WACC != null
    ? (latestSpread.ROIC - latestSpread.WACC).toFixed(1)
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0,280px)', gap: 24, alignItems: 'start' }}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" strokeOpacity={0.5} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}
            axisLine={false} tickLine={false} width={38}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 11 }}
            formatter={(v, name) => [`${Number(v).toFixed(1)}%`, String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
          <ReferenceLine y={0} stroke="var(--line)" strokeDasharray="4 2" />
          <Line type="monotone" dataKey="ROIC" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: 'var(--accent)', r: 3 }} name="ROIC" connectNulls />
          <Line type="monotone" dataKey="WACC" stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="WACC" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ paddingTop: 8 }}>
        {spread != null && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, color: Number(spread) > 0 ? 'var(--accent)' : '#dc2626', lineHeight: 1 }}>
              {Number(spread) > 0 ? '+' : ''}{spread}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-3)', marginLeft: 2 }}>%p</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>초과수익 = 해자의 증거</div>
          </div>
        )}
        <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          해자는 말이 아니라 숫자로 증명됩니다. ROIC가 WACC를 초과하는 스프레드가 여러 해에 걸쳐 양(+)으로 유지된다면, 경쟁자가 그 수익을 침식하지 못하고 있다는 증거입니다.
        </p>
      </div>
    </div>
  )
}

/* ── Main content ── */
function MoatContent() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const market = (searchParams.get('market') === 'KR' ? 'KR' : 'US') as Market
  const name = searchParams.get('name')
  const { setTabBadge } = useCompanyScores()

  const [data, setData] = useState<MoatAnalysis | null>(null)
  const [fundamentals, setFundamentals] = useState<FundamentalAnalysis | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    setErrorMsg(null) // eslint-disable-line react-hooks/set-state-in-effect
    Promise.allSettled([
      getMoatScore(ticker, market),
      getFundamentals(ticker, market),
    ]).then(([moatRes, fundRes]) => {
      if (cancelled) return
      if (moatRes.status === 'fulfilled') setData(moatRes.value)
      else setErrorMsg(
        (moatRes.reason as { status?: number })?.status === 404
          ? `${ticker} 종목의 해자 점수가 아직 입력되지 않았습니다.`
          : '데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      )
      if (fundRes.status === 'fulfilled') setFundamentals(fundRes.value)
    }).finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [ticker, market])

  useEffect(() => {
    if (!data) return
    const tone = data.grade === 'wide' ? 'strong' as const : data.grade === 'narrow' ? 'neutral' as const : 'weak' as const
    const label = data.grade === 'wide' ? 'WIDE' : data.grade === 'narrow' ? 'NARROW' : 'NONE'
    const score = data.grade === 'wide' ? 90 : data.grade === 'narrow' ? 58 : 22
    setTabBadge('moat', { label, tone, score })
  }, [data, setTabBadge])

  if (isLoading) return <LoadingSkeleton />
  if (errorMsg) return (
    <div style={{
      display: 'flex', height: 240, alignItems: 'center', justifyContent: 'center',
      border: '1px solid var(--line)', borderRadius: 12,
    }}>
      <p style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>{errorMsg}</p>
    </div>
  )
  if (!data) return null

  const displayName = name ?? data.ticker // eslint-disable-line @typescript-eslint/no-unused-vars
  const scoreMap = Object.fromEntries(data.dimension_scores.map((d) => [d.dimension, d.score])) as Record<MoatDimension, number>

  return (
    <div className="eq-tab-body">
      <TabHead
        n={2}
        kicker="Economic Moat · 경제적 해자"
        title="경쟁 우위의 폭과 지속성"
        lede="좋은 기업과 위대한 투자처를 가르는 건 '얼마나 오래 초과수익을 지킬 수 있는가'. 다섯 갈래 해자의 너비를 측정하고, 경제적 증거로 검증합니다."
      />

      {/* Surface — verdict card */}
      <Card style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center' }}>
        <MoatRings grade={data.grade} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Verdict
              label={GRADE_VERDICT_LABEL[data.grade] ?? data.grade.toUpperCase()}
              tone={GRADE_TONE[data.grade] ?? 'neutral'}
              big
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
              지속 {GRADE_DURABILITY[data.grade]} · 추세 안정
            </span>
          </div>
          {data.analyst_note && (
            <p style={{ margin: '14px 0 0', fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)', maxWidth: 540 }}>
              {data.analyst_note.split('\n')[0]}
            </p>
          )}
          {/* Compound moats */}
          {data.compound_moats.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {data.compound_moats.map((m) => (
                <span key={m.type} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  letterSpacing: '.04em',
                  border: '1px solid var(--accent)', color: 'var(--accent)',
                  borderRadius: 999, padding: '3px 10px',
                }}>
                  {COMPOUND_EMOJI[m.type]} {m.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', borderLeft: '1px solid var(--line)', paddingLeft: 24 }}>
          <Stat
            value={data.composite_score.toFixed(1)}
            unit="/ 10"
            label="종합 해자 점수"
            sub="복합 보너스 포함"
          />
        </div>
      </Card>

      {/* Depth 1 — radar + dimension bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,320px) 1fr', gap: 28, marginTop: 22, alignItems: 'start' }}>
        <Card>
          <Eyebrow>해자 5원천 · Moat Sources</Eyebrow>
          <div style={{ marginTop: 8 }}>
            <RadarChart scores={scoreMap} />
          </div>
        </Card>
        <div>
          <Eyebrow n={2}>원천별 강도와 근거</Eyebrow>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' }}>
            {data.dimension_scores.map((d, i) => (
              <div key={d.dimension} style={{
                padding: '13px 0',
                borderBottom: i < data.dimension_scores.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                    {DIMENSION_LABEL[d.dimension]}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                    color: d.score >= 7 ? 'var(--accent)' : 'var(--ink-2)',
                  }}>
                    {d.score.toFixed(1)}
                  </span>
                </div>
                <div style={{ margin: '8px 0 7px' }}>
                  <MetricBar value={d.score * 10} color="var(--accent)" />
                </div>
                {d.rationale && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{d.rationale}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Depth 2 — analyst note detail */}
      <Reveal
        title="해자 분석 근거 상세"
        hint="강점 · 개선 필요 항목"
        depth={2}
        defaultOpen={false}
      >
        {data.analyst_note && (
          <div style={{ paddingTop: 4 }}>
            {data.analyst_note.split('\n').map((line, i) => (
              <p key={i} style={{
                fontSize: 13.5, lineHeight: 1.65, margin: '0 0 10px',
                color: line.startsWith('⚡') ? 'var(--accent)'
                  : line.startsWith('✅') ? '#2d6a4f'
                    : line.startsWith('⚠️') ? '#92400e'
                      : 'var(--ink-2)',
              }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </Reveal>

      {/* Depth 2 — ROIC vs WACC */}
      {fundamentals && (
        <Reveal
          title="경제적 해자의 증거 — ROIC vs WACC"
          hint="두 선의 간격 = 초과수익"
          depth={2}
          defaultOpen={false}
        >
          <div style={{ paddingTop: 8 }}>
            <RoicWaccChart fundamentals={fundamentals} />
          </div>
        </Reveal>
      )}

      {/* Depth 3 — methodology */}
      <Reveal
        title="측정 방법론 · 임계값 기준"
        hint="각 해자 원천의 대리 지표와 점수화 논리"
        depth={3}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 4 }}>
          {[
            { name: '비용 우위', proxy: '영업이익률 + 부채비율', bench: '영업이익률 30%↑ = 10점' },
            { name: '무형 자산', proxy: 'ROE (브랜드·IP 초과수익)', bench: 'ROE 25%↑ = 10점' },
            { name: '전환 비용', proxy: '매출 CAGR + 방향성 보정', bench: 'CAGR 12%↑ = 10점' },
            { name: '네트워크 효과', proxy: 'FCF 마진', bench: 'FCF 마진 15%↑ = 10점' },
            { name: '효율적 규모', proxy: 'ROA + 이자보상배율(ICR)', bench: 'ROA 15%↑ · ICR 20배↑ = 10점' },
          ].map((m) => (
            <div key={m.name} style={{
              padding: '12px 14px',
              border: '1px solid var(--line)',
              borderRadius: 8,
              background: 'var(--surface)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 4 }}>
                대리 지표: <Term def="직접 측정이 어려운 해자 원천을 재무 데이터로 근사한 값입니다.">{m.proxy}</Term>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>{m.bench}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ height: 32, width: 256, borderRadius: 6, background: 'var(--surface-2)', marginBottom: 16 }} />
      <div style={{ height: 240, borderRadius: 12, background: 'var(--surface-2)' }} />
    </div>
  )
}

export default function MoatPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MoatContent />
    </Suspense>
  )
}
