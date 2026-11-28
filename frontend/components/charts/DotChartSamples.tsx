'use client'

import { useState } from 'react'

export type DotShape = 'circle' | 'square'

interface DotStyleProps {
  shape?: DotShape
}

// ── Sample 1: 도트 매트릭스 바 차트 ──────────────────────────────────────────

interface QuarterBarDatum {
  label: string
  revenue: number // 조원
  opProfit: number // 조원
}

const BAR_DATA: QuarterBarDatum[] = [
  { label: '24.Q1', revenue: 71.9, opProfit: 6.6 },
  { label: '24.Q2', revenue: 74.1, opProfit: 10.4 },
  { label: '24.Q3', revenue: 79.1, opProfit: 9.2 },
  { label: '24.Q4', revenue: 75.8, opProfit: 6.5 },
  { label: '25.Q1', revenue: 79.1, opProfit: 6.7 },
  { label: '25.Q2', revenue: 81.4, opProfit: 8.9 },
  { label: '25.Q3', revenue: 84.6, opProfit: 11.2 },
  { label: '25.Q4', revenue: 88.2, opProfit: 12.8 },
]

export function DotMatrixBarChart({ shape = 'circle' }: DotStyleProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const rows = 16
  const cols = 3
  const dotSize = 6
  const dotGap = 3.5
  const colWidth = cols * dotSize + (cols - 1) * dotGap
  const barGroupGap = 24
  const padLeft = 36
  const padRight = 16
  const padTop = 16
  const padBottom = 28

  const matrixHeight = rows * dotSize + (rows - 1) * dotGap
  const width = padLeft + BAR_DATA.length * colWidth + (BAR_DATA.length - 1) * barGroupGap + padRight
  const height = padTop + matrixHeight + padBottom

  const maxRevenue = 96
  const activeIdx = hoveredIdx ?? BAR_DATA.length - 1
  const active = BAR_DATA[activeIdx]
  const opMargin = ((active.opProfit / active.revenue) * 100).toFixed(1)

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>SAMPLE 01 · DOT-MATRIX BAR</div>
          <h3 style={titleStyle}>분기별 매출 · 영업이익 LED 스택</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
            {active.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            {active.revenue.toFixed(1)}조{' '}
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
              (이익 {active.opProfit.toFixed(1)}조 · {opMargin}%)
            </span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: 360, display: 'block' }}
          role="img"
          aria-label="분기별 매출 및 영업이익 도트 매트릭스 바 차트"
        >
          {/* Y축 가이드 라벨 */}
          {[0, 0.5, 1].map((t) => {
            const y = padTop + matrixHeight * (1 - t)
            const val = Math.round(maxRevenue * t)
            return (
              <g key={t}>
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--ink-3)"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                >
                  {val}조
                </text>
              </g>
            )
          })}

          {BAR_DATA.map((d, idx) => {
            const groupX = padLeft + idx * (colWidth + barGroupGap)
            const filledRevRows = Math.max(1, Math.round((d.revenue / maxRevenue) * rows))
            const filledOpRows = Math.max(1, Math.round((d.opProfit / maxRevenue) * rows))
            const isActive = hoveredIdx === idx

            return (
              <g
                key={d.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* 호버 히트박스 */}
                <rect
                  x={groupX - 6}
                  y={padTop - 4}
                  width={colWidth + 12}
                  height={matrixHeight + 26}
                  fill="transparent"
                />

                {Array.from({ length: rows }).map((_, r) => {
                  const rowFromBottom = rows - 1 - r
                  const cy = padTop + r * (dotSize + dotGap) + dotSize / 2
                  const isRevLit = rowFromBottom < filledRevRows
                  const isOpLit = rowFromBottom < filledOpRows

                  let fill = 'var(--line-2)'
                  let opacity = isActive ? 0.45 : 0.28

                  if (isOpLit) {
                    fill = 'var(--accent)'
                    opacity = hoveredIdx === null || isActive ? 1 : 0.45
                  } else if (isRevLit) {
                    fill = 'var(--status-info)'
                    opacity = hoveredIdx === null || isActive ? 0.88 : 0.35
                  }

                  return Array.from({ length: cols }).map((__, c) => {
                    const cx = groupX + c * (dotSize + dotGap) + dotSize / 2
                    return shape === 'circle' ? (
                      <circle
                        key={`${r}-${c}`}
                        cx={cx}
                        cy={cy}
                        r={dotSize / 2}
                        fill={fill}
                        opacity={opacity}
                        style={{ transition: 'opacity 140ms ease, fill 140ms ease' }}
                      />
                    ) : (
                      <rect
                        key={`${r}-${c}`}
                        x={cx - dotSize / 2}
                        y={cy - dotSize / 2}
                        width={dotSize}
                        height={dotSize}
                        rx={1}
                        fill={fill}
                        opacity={opacity}
                        style={{ transition: 'opacity 140ms ease, fill 140ms ease' }}
                      />
                    )
                  })
                })}

                <text
                  x={groupX + colWidth / 2}
                  y={padTop + matrixHeight + 18}
                  textAnchor="middle"
                  fill={isActive ? 'var(--ink)' : 'var(--ink-3)'}
                  fontWeight={isActive ? 600 : 400}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={legendRowStyle}>
        <LegendDot color="var(--accent)" label="영업이익" shape={shape} />
        <LegendDot color="var(--status-info)" label="매출액" shape={shape} />
        <LegendDot color="var(--line-2)" label="최대 눈금 (96조)" shape={shape} />
      </div>
    </div>
  )
}

// ── Sample 2: 도트 하프톤 영역 차트 ──────────────────────────────────────────

interface TrendDatum {
  day: string
  price: number
  ma5: number
}

const TREND_DATA: TrendDatum[] = [
  { day: 'D-19', price: 68200, ma5: 67900 },
  { day: 'D-18', price: 69100, ma5: 68200 },
  { day: 'D-17', price: 68700, ma5: 68400 },
  { day: 'D-16', price: 70400, ma5: 68900 },
  { day: 'D-15', price: 71800, ma5: 69640 },
  { day: 'D-14', price: 71200, ma5: 70240 },
  { day: 'D-13', price: 72600, ma5: 70940 },
  { day: 'D-12', price: 74100, ma5: 72020 },
  { day: 'D-11', price: 73400, ma5: 72620 },
  { day: 'D-10', price: 72900, ma5: 72840 },
  { day: 'D-09', price: 74800, ma5: 73560 },
  { day: 'D-08', price: 76200, ma5: 74280 },
  { day: 'D-07', price: 75900, ma5: 74640 },
  { day: 'D-06', price: 77400, ma5: 75440 },
  { day: 'D-05', price: 78800, ma5: 76620 },
  { day: 'D-04', price: 78100, ma5: 77280 },
  { day: 'D-03', price: 79600, ma5: 77960 },
  { day: 'D-02', price: 81200, ma5: 79020 },
  { day: 'D-01', price: 80500, ma5: 79640 },
  { day: 'Today', price: 82400, ma5: 80360 },
]

export function DotHalftoneAreaChart({ shape = 'circle' }: DotStyleProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const width = 460
  const height = 220
  const padLeft = 46
  const padRight = 16
  const padTop = 18
  const padBottom = 28
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const minP = 66000
  const maxP = 85000

  const toX = (i: number) => padLeft + (i / (TREND_DATA.length - 1)) * plotW
  const toY = (p: number) => padTop + ((maxP - p) / (maxP - minP)) * plotH

  const linePoints = TREND_DATA.map((d, i) => `${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`).join(' ')
  const maPoints = TREND_DATA.map((d, i) => `${toX(i).toFixed(1)},${toY(d.ma5).toFixed(1)}`).join(' ')
  const areaPath = [
    `M ${toX(0).toFixed(1)} ${(padTop + plotH).toFixed(1)}`,
    ...TREND_DATA.map((d, i) => `L ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`),
    `L ${toX(TREND_DATA.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(1)}`,
    'Z',
  ].join(' ')

  const activeIdx = hoveredIdx ?? TREND_DATA.length - 1
  const active = TREND_DATA[activeIdx]
  const basePrice = TREND_DATA[0].price
  const diffPct = (((active.price - basePrice) / basePrice) * 100).toFixed(1)
  const isUp = active.price >= basePrice

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>SAMPLE 02 · HALFTONE DOT TREND</div>
          <h3 style={titleStyle}>20일 주가 모멘텀 &amp; 도트 영역</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
            {active.day}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            {active.price.toLocaleString()}원{' '}
            <span style={{ fontSize: 12, color: isUp ? 'var(--accent)' : 'var(--status-stop)' }}>
              ({isUp ? '+' : ''}
              {diffPct}%)
            </span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label="20일 주가 도트 하프톤 영역 차트"
        >
          <defs>
            {/* 배경 미세 도트 그리드 */}
            <pattern id="dot-bg-grid" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="0.9" fill="var(--line-2)" opacity="0.5" />
            </pattern>
            {/* 영역 채우기용 하프톤 도트 패턴 */}
            <pattern id="dot-area-fill" width="7" height="7" patternUnits="userSpaceOnUse">
              {shape === 'circle' ? (
                <circle cx="3.5" cy="3.5" r="1.45" fill="var(--accent)" opacity="0.48" />
              ) : (
                <rect x="2.2" y="2.2" width="2.6" height="2.6" rx="0.5" fill="var(--accent)" opacity="0.48" />
              )}
            </pattern>
            <linearGradient id="dot-fade-mask" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0.15" />
            </linearGradient>
            <mask id="dot-area-mask">
              <rect x={padLeft} y={padTop} width={plotW} height={plotH} fill="url(#dot-fade-mask)" />
            </mask>
          </defs>

          {/* 배경 도트 캔버스 */}
          <rect x={padLeft} y={padTop} width={plotW} height={plotH} fill="url(#dot-bg-grid)" rx={6} />

          {/* Y축 눈금 */}
          {[68000, 74000, 80000].map((val) => {
            const y = toY(val)
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotW}
                  y2={y}
                  stroke="var(--line)"
                  strokeDasharray="2 4"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--ink-3)"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                >
                  {(val / 1000).toFixed(0)}k
                </text>
              </g>
            )
          })}

          {/* 하프톤 도트 영역 */}
          <path d={areaPath} fill="url(#dot-area-fill)" mask="url(#dot-area-mask)" />

          {/* 5일 이동평균 도트 점선 */}
          <polyline
            fill="none"
            stroke="var(--status-warn)"
            strokeWidth={1.5}
            strokeDasharray="2 4"
            strokeLinecap="round"
            points={maPoints}
            opacity={0.85}
          />

          {/* 메인 라인 */}
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            points={linePoints}
          />

          {/* 호버 수직 도트 가이드라인 */}
          {hoveredIdx !== null && (
            <line
              x1={toX(hoveredIdx)}
              y1={padTop}
              x2={toX(hoveredIdx)}
              y2={padTop + plotH}
              stroke="var(--ink-2)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          )}

          {/* 데이터 도트 노드 */}
          {TREND_DATA.map((d, i) => {
            const cx = toX(i)
            const cy = toY(d.price)
            const isSelected = activeIdx === i
            const r = isSelected ? 4.5 : 2.6

            return (
              <g
                key={d.day}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={cx - plotW / TREND_DATA.length / 2}
                  y={padTop}
                  width={plotW / TREND_DATA.length}
                  height={plotH + 20}
                  fill="transparent"
                />
                {isSelected && (
                  <circle cx={cx} cy={cy} r={8.5} fill="var(--accent)" opacity={0.18} />
                )}
                {shape === 'circle' ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={isSelected ? 'var(--surface)' : 'var(--accent)'}
                    stroke="var(--accent)"
                    strokeWidth={isSelected ? 2.2 : 0}
                  />
                ) : (
                  <rect
                    x={cx - r}
                    y={cy - r}
                    width={r * 2}
                    height={r * 2}
                    rx={1}
                    fill={isSelected ? 'var(--surface)' : 'var(--accent)'}
                    stroke="var(--accent)"
                    strokeWidth={isSelected ? 2 : 0}
                  />
                )}
              </g>
            )
          })}

          {/* X축 주요 라벨 */}
          {[0, 5, 10, 15, 19].map((idx) => (
            <text
              key={idx}
              x={toX(idx)}
              y={padTop + plotH + 18}
              textAnchor="middle"
              fill={activeIdx === idx ? 'var(--ink)' : 'var(--ink-3)'}
              fontSize={9.5}
              fontFamily="var(--font-mono)"
            >
              {TREND_DATA[idx].day}
            </text>
          ))}
        </svg>
      </div>

      <div style={legendRowStyle}>
        <LegendDot color="var(--accent)" label="종가 (Halftone Fill)" shape={shape} />
        <LegendDot color="var(--status-warn)" label="5일 이동평균" shape={shape} />
      </div>
    </div>
  )
}

// ── Sample 3: 도트 와플 매트릭스 차트 ────────────────────────────────────────

interface WaffleCategory {
  id: string
  label: string
  score: number // 합계 100
  color: string
}

const WAFFLE_DATA: WaffleCategory[] = [
  { id: 'fundamental', label: '펀더멘털', score: 36, color: 'var(--accent)' },
  { id: 'moat', label: '경제적 해자', score: 26, color: 'var(--status-info)' },
  { id: 'sentiment', label: '시장 센티멘트', score: 20, color: 'var(--status-warn)' },
  { id: 'technical', label: '기술적 모멘텀', score: 12, color: '#a855f7' },
  { id: 'buffer', label: '리스크 버퍼', score: 6, color: 'var(--line-2)' },
]

export function DotWaffleMatrixChart({ shape = 'circle' }: DotStyleProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const cols = 10
  const rows = 10
  const cellSize = 16
  const gap = 5
  const gridW = cols * cellSize + (cols - 1) * gap
  const gridH = rows * cellSize + (rows - 1) * gap

  // 100개의 도트를 순서대로 카테고리 매핑
  const cells: WaffleCategory[] = []
  for (const cat of WAFFLE_DATA) {
    for (let i = 0; i < cat.score; i++) {
      cells.push(cat)
    }
  }

  const focused = WAFFLE_DATA.find((c) => c.id === activeId) ?? WAFFLE_DATA[0]

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>SAMPLE 03 · 10×10 DOT WAFFLE</div>
          <h3 style={titleStyle}>4단계 스코어 구성 매트릭스</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
            {focused.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            {focused.score}
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}> / 100 pts</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          paddingTop: 4,
        }}
      >
        <svg
          width={gridW}
          height={gridH}
          viewBox={`0 0 ${gridW} ${gridH}`}
          style={{ maxWidth: '100%', height: 'auto', flexShrink: 0 }}
          role="img"
          aria-label="10x10 도트 와플 매트릭스 차트"
        >
          {cells.map((cat, idx) => {
            const r = Math.floor(idx / cols)
            const c = idx % cols
            const x = c * (cellSize + gap)
            const y = r * (cellSize + gap)
            const dimmed = activeId !== null && activeId !== cat.id

            return (
              <g
                key={idx}
                onMouseEnter={() => setActiveId(cat.id)}
                onMouseLeave={() => setActiveId(null)}
                style={{ cursor: 'pointer' }}
              >
                {shape === 'circle' ? (
                  <circle
                    cx={x + cellSize / 2}
                    cy={y + cellSize / 2}
                    r={cellSize / 2 - 1}
                    fill={cat.color}
                    opacity={dimmed ? 0.18 : 1}
                    style={{ transition: 'opacity 150ms ease, transform 150ms ease' }}
                  />
                ) : (
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx={2.5}
                    fill={cat.color}
                    opacity={dimmed ? 0.18 : 1}
                    style={{ transition: 'opacity 150ms ease' }}
                  />
                )}
              </g>
            )
          })}
        </svg>

        <div style={{ flex: 1, minWidth: 165, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {WAFFLE_DATA.map((cat) => {
            const isActive = activeId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onMouseEnter={() => setActiveId(cat.id)}
                onMouseLeave={() => setActiveId(null)}
                onClick={() => setActiveId(isActive ? null : cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `1px solid ${isActive ? 'var(--line-2)' : 'var(--line)'}`,
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  fontSize: 12,
                  textAlign: 'left',
                  transition: 'background 140ms ease, border-color 140ms ease',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: shape === 'circle' ? '999px' : '2px',
                      background: cat.color,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ color: 'var(--ink-2)', fontWeight: isActive ? 600 : 400 }}>
                    {cat.label}
                  </span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>
                  {cat.score}%
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 공통 서브 컴포넌트 & 스타일 ──────────────────────────────────────────────

function LegendDot({
  color,
  label,
  shape,
}: {
  color: string
  label: string
  shape: DotShape
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: shape === 'circle' ? '999px' : '2px',
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: '20px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.16em',
  color: 'var(--ink-3)',
  textTransform: 'uppercase',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--ink)',
  margin: '4px 0 0',
}

const legendRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 14,
  paddingTop: 8,
  borderTop: '1px solid var(--line)',
}
