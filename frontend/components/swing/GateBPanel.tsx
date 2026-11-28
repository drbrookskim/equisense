'use client'

import { useState, useEffect, useRef, useId } from 'react'
import type { GateBInput, GateBResult, GateStatus } from '@/types'
import { checkGateB } from '@/lib/adapters/swingPipeline'
import { useRevealState } from '@/contexts/RevealStateContext'

const STATUS_COLOR: Record<GateStatus, string> = {
  GO:   'var(--status-go)',
  WARN: 'var(--status-warn)',
  STOP: 'var(--status-stop)',
}
const STATUS_ICON: Record<GateStatus, string> = { GO: '🟢', WARN: '⚠️', STOP: '🔴' }

function StatusPill({ status }: { status: GateStatus }) {
  const color = STATUS_COLOR[status]
  return (
    <span style={{
      marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color,
      border: `1px solid ${color}`, borderRadius: 4, padding: '1px 6px',
    }}>
      {STATUS_ICON[status]} {status}
    </span>
  )
}

const MATRIX_LABEL: Record<GateBResult['matrix'], string> = {
  STRONG_BUY:          '최강 진입 신호 ✅',
  FIND_ALTERNATIVE:    '섹터 대안 종목 탐색',
  HEADWIND_SHORT_ONLY: '헤드윈드 진입 (2주 이내)',
  NO_ENTRY:            '진입 금지 🚫',
}

const DEFAULT_INPUT: GateBInput = {
  market_foreign_days: 0,
  market_institution: 'neutral',
  sector_etf_days: 0,
  stock_foreign_days: 0,
  stock_institution_weeks: 0,
  short_ratio: 0.02,
  short_trend: 'stable',
}

// ── 힌트 색상 ──────────────────────────────────────────────────

type HintLevel = 'go' | 'warn' | 'stop' | 'neutral'

const HINT_STYLE: Record<HintLevel, React.CSSProperties> = {
  go:      { color: 'var(--status-go)',   fontSize: 11, lineHeight: 1.4, marginTop: 5 },
  warn:    { color: 'var(--status-warn)', fontSize: 11, lineHeight: 1.4, marginTop: 5 },
  stop:    { color: 'var(--status-stop)', fontSize: 11, lineHeight: 1.4, marginTop: 5 },
  neutral: { color: 'var(--ink-3)',       fontSize: 11, lineHeight: 1.4, marginTop: 5 },
}

interface Hint { level: HintLevel; text: string }

// ── 힌트 계산 함수 ─────────────────────────────────────────────

function hintMarketForeign(v: number, inst: GateBInput['market_institution']): Hint {
  if (v >= 3 && inst === 'buy')
    return { level: 'go', text: `외국인 ${v}일 연속 순매수 + 기관 매수 → Layer 1 GO` }
  if (v <= -3 && inst === 'sell')
    return { level: 'stop', text: `외국인 ${v}일 연속 순매도 + 기관 매도 → Layer 1 STOP (진입 차단)` }
  if (v >= 3)
    return { level: 'warn', text: `외국인 조건 충족(≥+3). 기관을 '매수'로 바꾸면 GO` }
  if (v <= -3)
    return { level: 'warn', text: `외국인 약세. 기관이 '매도'면 STOP — 기관 방향 주의` }
  const need = 3 - v
  return { level: 'neutral', text: `+${need}일 더 올리면 GO 조건 진입 가능 (현재: ${v > 0 ? '+' : ''}${v}일)` }
}

function hintMarketInstitution(v: GateBInput['market_institution'], days: number): Hint {
  if (v === 'buy') {
    if (days >= 3) return { level: 'go', text: '외국인+기관 동반 매수 — Layer 1 GO' }
    return { level: 'warn', text: `기관 매수 확인. 외국인 +${3 - days}일 더 필요하면 GO` }
  }
  if (v === 'sell') {
    if (days <= -3) return { level: 'stop', text: '외국인+기관 동반 매도 → Layer 1 STOP (진입 차단)' }
    return { level: 'warn', text: '기관 매도. 외국인도 -3일 이하면 STOP 위험' }
  }
  return { level: 'neutral', text: '기관 중립 — Layer 1 WARN 유지. 매수 전환 시 GO 가능' }
}

function hintSectorEtf(v: number): Hint {
  if (v >= 5)  return { level: 'go',  text: `섹터 ETF ${v}일 연속 순유입 → Layer 2 GO (섹터 강세)` }
  if (v <= -3) return { level: 'stop', text: `섹터 ETF ${v}일 연속 순유출 → Layer 2 STOP (섹터 이탈)` }
  if (v >= 0) {
    const need = 5 - v
    return { level: 'neutral', text: `+${need}일 더 오르면 GO. -3일 이하면 STOP` }
  }
  return { level: 'warn', text: `약한 이탈 신호. -3일 이하면 STOP, +5일 이상이면 GO` }
}

function hintStockForeign(v: number, instWeeks: number): Hint {
  if (v >= 5 && instWeeks >= 3)
    return { level: 'go', text: `외국인 ${v}일 + 기관 ${instWeeks}주 누적 → 종목 수급 GO 조건 충족` }
  if (v <= -3)
    return { level: 'stop', text: `외국인 ${v}일 연속 순매도 → Layer 3 STOP (진입 차단)` }
  if (v >= 5)
    return { level: 'warn', text: `외국인 조건 충족. 기관 누적 +3주 이상 필요 (현재 ${instWeeks}주)` }
  const need = 5 - v
  return { level: 'neutral', text: `+${need}일 더 올리면 GO 조건 진입 가능 (현재 ${v}일)` }
}

function hintStockInstitution(v: number, foreignDays: number): Hint {
  if (v <= -2)
    return { level: 'stop', text: `기관 ${v}주 연속 순매도 → Layer 3 STOP (진입 차단)` }
  if (v >= 3 && foreignDays >= 5)
    return { level: 'go', text: `기관 ${v}주 누적 순매수 + 외국인 조건 충족 → GO 조건 달성` }
  if (v >= 3)
    return { level: 'warn', text: `기관 조건 충족. 외국인 +${5 - foreignDays}일 더 필요` }
  if (v < 0)
    return { level: 'warn', text: `기관 순매도 구간. -2주 이하면 STOP, +3주 이상이면 GO` }
  const need = 3 - v
  return { level: 'neutral', text: `+${need}주 더 올리면 GO 조건 진입 가능 (현재 ${v}주)` }
}

function hintShortRatio(v: number, trend: GateBInput['short_trend']): Hint {
  const pct = (v * 100).toFixed(1)
  if (v < 0.03 && trend === 'decrease')
    return { level: 'go', text: `대차잔고 ${pct}% + 감소 추세 → 공매도 압력 낮음 (GO 기여)` }
  if (v >= 0.03)
    return { level: 'stop', text: `대차잔고 ${pct}% ≥ 3% → 공매도 과다, GO 불가` }
  return { level: 'warn', text: `대차잔고 ${pct}% (3% 미만). 추세를 '감소'로 바꾸면 GO 기여` }
}

function hintShortTrend(v: GateBInput['short_trend'], ratio: number): Hint {
  if (v === 'decrease') {
    if (ratio < 0.03) return { level: 'go', text: '공매도 감소 + 잔고 3% 미만 → GO 기여' }
    return { level: 'warn', text: `감소 추세지만 대차잔고 ${(ratio * 100).toFixed(1)}% ≥ 3% — 비율도 낮춰야 GO` }
  }
  if (v === 'increase')
    return { level: 'stop', text: '공매도 증가 — 세력 하락 베팅 신호, GO 불가' }
  return { level: 'neutral', text: '안정 추세 — 대차잔고 3% 미만 + 감소로 전환해야 GO 기여' }
}

// ── 범례 ──────────────────────────────────────────────────────

const LEGEND_KEY = 'gateB-legend'

function Legend() {
  const revealState = useRevealState()
  const [open, setOpenState] = useState(() => revealState?.getOpen(LEGEND_KEY, false) ?? false)
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6,
  }
  const badge = (bg: string, color: string, text: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99,
      background: bg, color, fontFamily: 'var(--font-mono)',
      fontSize: 10, fontWeight: 700, flexShrink: 0, letterSpacing: '.04em',
    }}>{text}</span>
  )
  const desc: React.CSSProperties = {
    fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45,
  }
  const divider: React.CSSProperties = {
    height: 1, background: 'var(--line)', margin: '10px 0',
  }
  const colTitle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8,
  }

  return (
    <details
      className="eq-glass"
      style={{ borderRadius: 9, overflow: 'hidden' }}
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open
        setOpenState(next)
        revealState?.setOpen(LEGEND_KEY, next)
      }}
    >
      <summary style={{
        padding: '9px 13px', cursor: 'pointer', userSelect: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600,
        listStyle: 'none',
      }}>
        <span>📖 용어 범례 — GO / WARN / STOP / PASS / BLOCK</span>
        <span style={{ fontSize: 9, color: 'var(--ink-3)' }}>펼치기 ▾</span>
      </summary>

      <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--line)' }}>

        {/* 레이어 상태 */}
        <p style={colTitle}>레이어 상태 — 각 수급 레이어의 현재 신호</p>
        <div style={row}>
          {badge('var(--status-go-bg)', 'var(--status-go)', '🟢 GO')}
          <p style={desc}>해당 레이어의 수급이 강함. 진입에 유리한 환경.</p>
        </div>
        <div style={row}>
          {badge('var(--status-warn-bg)', 'var(--status-warn)', '⚠️ WARN')}
          <p style={desc}>수급 중립 또는 혼조. 단독으로 진입을 막지는 않음.</p>
        </div>
        <div style={row}>
          {badge('var(--status-stop-bg)', 'var(--status-stop)', '🔴 STOP')}
          <p style={desc}>해당 레이어에서 이탈 신호 감지. STOP이 하나라도 있으면 Gate B 자동 차단.</p>
        </div>

        <div style={divider} />

        {/* Gate 판정 */}
        <p style={colTitle}>Gate 판정 — Gate B 최종 통과 여부</p>
        <div style={row}>
          {badge('var(--status-go-bg)', 'var(--status-go)', '✅ PASS')}
          <p style={desc}>3개 레이어 모두 STOP 없음 → 다음 단계(체력 필터·기술적 진입) 진행 가능.</p>
        </div>
        <div style={row}>
          {badge('var(--status-stop-bg)', 'var(--status-stop)', '🚫 BLOCK')}
          <p style={desc}>레이어 중 하나 이상 STOP → 현시점 진입 불가. WARN만으로는 차단되지 않음.</p>
        </div>

        <div style={divider} />

        {/* 2×2 매트릭스 */}
        <p style={colTitle}>2×2 매트릭스 — 섹터(L2) × 종목(L3) 조합</p>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        }}>
          {([
            { label: '최강 진입 신호', sub: 'L2 GO + L3 GO',    color: 'var(--status-go)',   bg: 'var(--status-go-bg)' },
            { label: '섹터 대안 탐색', sub: 'L2 GO + L3 WARN',  color: 'var(--status-warn)', bg: 'var(--status-warn-bg)' },
            { label: '헤드윈드 진입', sub: 'L2 WARN + L3 GO',   color: 'var(--status-info)', bg: 'var(--status-info-bg)' },
            { label: '진입 금지',     sub: 'L2·L3 모두 GO 아님', color: 'var(--status-stop)', bg: 'var(--status-stop-bg)' },
          ]).map(({ label, sub, color, bg }) => (
            <div key={label} style={{
              borderRadius: 7, padding: '8px 10px', background: bg,
              border: '1px solid var(--line)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color, margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>

      </div>
    </details>
  )
}

// ── 스프링 유틸 (DesignBookmark Motion Studies) ─────────────────

interface Spring {
  x: number
  v: number
  t: number
  k: number
  c: number
}

function makeSpring(x: number, k = 400, c = 30): Spring {
  return { x, v: 0, t: x, k, c }
}

function tuneSpring(s: Spring, k: number, c: number, reduceMotion: boolean) {
  s.k = k
  s.c = reduceMotion ? 2 * Math.sqrt(k) : c
}

function stepSpring(s: Spring, dt: number, reduceMotion: boolean) {
  const c = reduceMotion ? 2 * Math.sqrt(s.k) : s.c
  const a = -s.k * (s.x - s.t) - c * s.v
  s.v += a * dt
  s.x += s.v * dt
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function rubber(x: number, min: number, max: number, d = 18) {
  if (x < min) return min - (1 - 1 / ((min - x) * 0.55 / d + 1)) * d
  if (x > max) return max + (1 - 1 / ((x - max) * 0.55 / d + 1)) * d
  return x
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────

const SLIDER_R = 12
const SLIDER_TR = 14
const SLIDER_D = 18
const SLIDER_OX = 40
const SLIDER_OY = 80
const SLIDER_CY = 16
const SLIDER_RISE = -38
const SLIDER_REST_DROP = 0.5

function SliderField({
  label, value, min, max, step = 1, display, formatValue, hint, onChange,
}: {
  label: string; value: number; min: number; max: number
  step?: number; display?: string; formatValue?: (v: number) => string
  hint?: Hint; onChange: (v: number) => void
}) {
  const rawId = useId()
  const gooId = `goo-${rawId.replace(/:/g, '')}`

  const railRef = useRef<HTMLDivElement | null>(null)
  const fillRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const dropLabelRef = useRef<HTMLDivElement | null>(null)
  const hitRef = useRef<HTMLDivElement | null>(null)
  const markRefs = useRef<(HTMLSpanElement | null)[]>([])
  const numRefs = useRef<(HTMLSpanElement | null)[]>([])

  const onChangeRef = useRef(onChange)
  const formatRef = useRef(formatValue)
  const propsRef = useRef({ min, max, step, value })

  useEffect(() => {
    onChangeRef.current = onChange
    formatRef.current = formatValue
    propsRef.current = { min, max, step, value }
  }, [onChange, formatValue, min, max, step, value])

  const stateRef = useRef({
    Wd: 0,
    ratio: (value - min) / Math.max(max - min, 1),
    dragging: false,
    hover: false,
    lifted: false,
    litRatio: -1,
    lastEmitted: value,
    X: makeSpring(SLIDER_R, 900, 50),
    DX: makeSpring(SLIDER_R, 260, 18),
    DY: makeSpring(SLIDER_CY, 420, 22),
    DS: makeSpring(SLIDER_REST_DROP, 420, 22),
    PS: makeSpring(1, 520, 16),
  })

  // 외부 value 변경 시 스프링 목표 동기화 (드래그 중이 아닐 때)
  useEffect(() => {
    const st = stateRef.current
    if (st.dragging) return
    const nextRatio = clamp((value - min) / Math.max(max - min, 1), 0, 1)
    st.ratio = nextRatio
    st.lastEmitted = value
    if (st.Wd > 2 * SLIDER_R) {
      const span = Math.max(st.Wd - 2 * SLIDER_R, 1)
      const targetX = SLIDER_R + nextRatio * span
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      tuneSpring(st.X, 420, 34, reduceMotion)
      st.X.t = targetX
    }
  }, [value, min, max])

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const st = stateRef.current
    const span = () => Math.max(st.Wd - 2 * SLIDER_R, 1)
    const toX = (r: number) => SLIDER_R + clamp(r, 0, 1) * span()
    const toRatio = (x: number) => clamp((x - SLIDER_R) / span(), 0, 1)
    const snapVal = (r: number) => {
      const { min: lo, max: hi, step: s } = propsRef.current
      const raw = lo + clamp(r, 0, 1) * (hi - lo)
      const stepped = Math.round((raw - lo) / s) * s + lo
      return clamp(Number(stepped.toFixed(6)), lo, hi)
    }

    const syncBubble = () => {
      const up = st.dragging || st.lifted
      st.DY.t = up ? SLIDER_CY + SLIDER_RISE : SLIDER_CY
      st.DS.t = up ? 1 : SLIDER_REST_DROP
      st.PS.t = st.dragging ? 1.16 : st.hover ? 1.08 : 1
    }

    const emitFromX = (x: number) => {
      const r = toRatio(x)
      const next = snapVal(r)
      if (next !== st.lastEmitted) {
        st.lastEmitted = next
        onChangeRef.current(next)
      }
    }

    const localX = (e: PointerEvent) => e.clientX - rail.getBoundingClientRect().left

    const onPointerDown = (e: PointerEvent) => {
      st.dragging = true
      try { rail.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      tuneSpring(st.X, 900, 50, reduceMotion)
      st.X.t = rubber(localX(e), SLIDER_R, st.Wd - SLIDER_R)
      emitFromX(st.X.t)
      syncBubble()
      hitRef.current?.focus({ preventScroll: true })
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!st.dragging) return
      st.X.t = rubber(localX(e), SLIDER_R, st.Wd - SLIDER_R)
      emitFromX(st.X.t)
    }

    const onPointerUp = () => {
      if (!st.dragging) return
      st.dragging = false
      tuneSpring(st.X, 300, 14, reduceMotion)
      st.X.t = clamp(st.X.t, SLIDER_R, Math.max(st.Wd - SLIDER_R, SLIDER_R))
      emitFromX(st.X.t)
      syncBubble()
    }

    const onPointerEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        st.hover = true
        syncBubble()
      }
    }

    const onPointerLeave = () => {
      st.hover = false
      syncBubble()
    }

    const hit = hitRef.current
    const onKeyDown = (e: KeyboardEvent) => {
      const { min: lo, max: hi, step: s } = propsRef.current
      const dMap: Record<string, number> = {
        ArrowRight: s, ArrowUp: s, ArrowLeft: -s, ArrowDown: -s,
        PageUp: s * 5, PageDown: -s * 5,
      }
      const absMap: Record<string, number> = { Home: lo, End: hi }
      const d = dMap[e.key]
      const abs = absMap[e.key]
      if (d === undefined && abs === undefined) return
      e.preventDefault()
      const cur = snapVal(toRatio(st.X.t))
      const next = abs !== undefined ? abs : clamp(cur + d, lo, hi)
      const nextR = (next - lo) / Math.max(hi - lo, 1)
      tuneSpring(st.X, 420, 34, reduceMotion)
      st.X.t = toX(nextR)
      if (next !== st.lastEmitted) {
        st.lastEmitted = next
        onChangeRef.current(next)
      }
      st.lifted = true
      syncBubble()
    }

    const onFocus = () => {
      if (hit?.matches(':focus-visible')) {
        st.lifted = true
        syncBubble()
      }
    }
    const onBlur = () => {
      st.lifted = false
      syncBubble()
    }

    rail.addEventListener('pointerdown', onPointerDown)
    rail.addEventListener('pointermove', onPointerMove)
    rail.addEventListener('pointerup', onPointerUp)
    rail.addEventListener('pointercancel', onPointerUp)
    rail.addEventListener('pointerenter', onPointerEnter)
    rail.addEventListener('pointerleave', onPointerLeave)
    hit?.addEventListener('keydown', onKeyDown)
    hit?.addEventListener('focus', onFocus)
    hit?.addEventListener('blur', onBlur)

    const ro = new ResizeObserver(() => {
      const w = rail.clientWidth
      if (!w || w === st.Wd) return
      st.Wd = w
      const x = toX(st.ratio)
      st.X.x = st.X.t = st.DX.x = st.DX.t = x
      st.X.v = st.DX.v = 0
    })
    ro.observe(rail)

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now

      st.DX.t = st.X.x
      if (st.Wd > 2 * SLIDER_R) st.ratio = toRatio(st.X.t)

      const sub = 4
      for (let k = 0; k < sub; k++) {
        stepSpring(st.X, dt / sub, reduceMotion)
        stepSpring(st.DX, dt / sub, reduceMotion)
        stepSpring(st.DY, dt / sub, reduceMotion)
        stepSpring(st.DS, dt / sub, reduceMotion)
        stepSpring(st.PS, dt / sub, reduceMotion)
      }

      const x = st.X.x
      const r = st.Wd > 2 * SLIDER_R ? toRatio(x) : st.ratio
      const liveVal = snapVal(r)

      if (thumbRef.current) {
        const stretch = reduceMotion ? 1 : 1 + Math.min(Math.abs(st.X.v) / 2400, 0.4)
        thumbRef.current.style.transform =
          `translate(${(x - SLIDER_TR + SLIDER_OX).toFixed(2)}px,${(SLIDER_CY - SLIDER_TR + SLIDER_OY).toFixed(2)}px) scale(${(stretch * st.PS.x).toFixed(4)},${(st.PS.x / stretch).toFixed(4)})`
      }

      const tilt = reduceMotion ? 0 : clamp((st.DX.x - st.X.x) * 0.9, -28, 28)
      const dTr = `translate(${(st.DX.x - SLIDER_D).toFixed(2)}px,${(st.DY.x - SLIDER_D).toFixed(2)}px) rotate(${tilt.toFixed(2)}deg) scale(${st.DS.x.toFixed(4)})`
      if (dropRef.current) {
        dropRef.current.style.transform = `translate(${SLIDER_OX}px,${SLIDER_OY}px) ${dTr}`
      }
      if (dropLabelRef.current) {
        dropLabelRef.current.style.transform = dTr
        dropLabelRef.current.style.opacity = clamp((st.DS.x - 0.7) / 0.25, 0, 1).toFixed(3)
        dropLabelRef.current.textContent = formatRef.current
          ? formatRef.current(liveVal)
          : (liveVal > 0 ? `+${liveVal}` : String(liveVal))
      }

      if (fillRef.current) {
        const fw = clamp(x, 0, Math.max(st.Wd, 0)) * clamp((x - SLIDER_R) / SLIDER_R, 0, 1)
        fillRef.current.style.width = `${fw.toFixed(2)}px`
      }
      if (hitRef.current) {
        hitRef.current.style.left = `${(x - SLIDER_R).toFixed(2)}px`
        hitRef.current.setAttribute('aria-valuenow', String(liveVal))
      }

      const pctInt = Math.round(r * 100)
      if (pctInt !== st.litRatio) {
        st.litRatio = pctInt
        markRefs.current.forEach((m, i) => {
          if (!m) return
          const p = i * 5
          const on = p <= pctInt && pctInt > 0
          const major = p % 25 === 0
          m.style.background = on
            ? (major ? 'var(--ink)' : 'var(--ink-2)')
            : (major ? 'var(--ink-3)' : 'var(--line-2)')
        })
        numRefs.current.forEach((n, i) => {
          if (!n) return
          const on = i * 25 <= pctInt && pctInt > 0
          n.style.color = on ? 'var(--ink-2)' : 'var(--ink-3)'
        })
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      rail.removeEventListener('pointerdown', onPointerDown)
      rail.removeEventListener('pointermove', onPointerMove)
      rail.removeEventListener('pointerup', onPointerUp)
      rail.removeEventListener('pointercancel', onPointerUp)
      rail.removeEventListener('pointerenter', onPointerEnter)
      rail.removeEventListener('pointerleave', onPointerLeave)
      hit?.removeEventListener('keydown', onKeyDown)
      hit?.removeEventListener('focus', onFocus)
      hit?.removeEventListener('blur', onBlur)
    }
  }, [])

  const tickMarks = Array.from({ length: 21 }, (_, i) => i * 5)
  const scaleNums = [0, 25, 50, 75, 100].map((pct) => {
    const v = Math.round(min + (pct / 100) * (max - min))
    return { pct, text: formatValue ? formatValue(v) : (v > 0 ? `+${v}` : String(v)) }
  })

  return (
    <div className="eq-glass" style={{ padding: '12px 14px', borderRadius: 12 }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id={gooId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="g" />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
      </svg>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {display ?? (value > 0 ? `+${value}` : String(value))}
        </span>
      </div>

      <div
        ref={railRef}
        style={{ position: 'relative', height: 32, touchAction: 'none', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, top: 13, height: 6, borderRadius: 999, background: 'var(--line-2)', overflow: 'hidden' }}>
          <div ref={fillRef} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, background: 'var(--ink)', borderRadius: 999 }} />
        </div>
        <div style={{ position: 'absolute', left: -40, right: -40, top: -80, height: 140, filter: `url(#${gooId})`, pointerEvents: 'none' }}>
          <div ref={dropRef} style={{ position: 'absolute', left: 0, top: 0, width: 36, height: 36, background: 'var(--ink)', borderRadius: '50%', willChange: 'transform' }} />
          <div ref={thumbRef} style={{ position: 'absolute', left: 0, top: 0, width: 28, height: 28, background: 'var(--ink)', borderRadius: '50%', willChange: 'transform' }} />
        </div>
        <div
          ref={dropLabelRef}
          style={{
            position: 'absolute', left: 0, top: 0, width: 36, height: 36, display: 'grid', placeItems: 'center',
            fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--bg)',
            pointerEvents: 'none', willChange: 'transform, opacity',
          }}
        >
          {display ?? (value > 0 ? `+${value}` : String(value))}
        </div>
        <div
          ref={hitRef}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          style={{ position: 'absolute', top: 4, width: 24, height: 24, borderRadius: '50%', outline: 'none' }}
        />
      </div>

      <div aria-hidden="true" style={{ marginTop: 4 }}>
        <div style={{ position: 'relative', height: 8 }}>
          {tickMarks.map((p, i) => {
            const major = p % 25 === 0
            return (
              <span
                key={p}
                ref={(el) => { markRefs.current[i] = el }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `calc(12px + (100% - 24px) * ${p / 100})`,
                  width: 1.5,
                  height: major ? 8 : 4,
                  marginLeft: -0.75,
                  borderRadius: 1,
                  background: major ? 'var(--ink-3)' : 'var(--line-2)',
                  transition: 'background .2s ease',
                }}
              />
            )
          })}
        </div>
        <div style={{
          position: 'relative', height: 14, marginTop: 4,
          fontSize: 10, fontWeight: 500, lineHeight: '14px',
          color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums',
        }}>
          {scaleNums.map((item, i) => (
            <span
              key={item.pct}
              ref={(el) => { numRefs.current[i] = el }}
              style={{
                position: 'absolute',
                top: 0,
                left: `calc(12px + (100% - 24px) * ${item.pct / 100})`,
                transform: 'translateX(-50%)',
                transition: 'color .2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {hint && (
        <p style={HINT_STYLE[hint.level]}>{hint.text}</p>
      )}
    </div>
  )
}

function Toggle3Way<T extends string>({
  label, value, options, labels, hint, onChange,
}: {
  label: string; value: T; options: readonly T[]; labels: string[]
  hint?: Hint; onChange: (v: T) => void
}) {
  const activeIdx = Math.max(0, options.indexOf(value))
  const activeIdxRef = useRef(activeIdx)
  useEffect(() => {
    activeIdxRef.current = activeIdx
  }, [activeIdx])

  const segRef = useRef<HTMLDivElement | null>(null)
  const hlRef = useRef<HTMLSpanElement | null>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  const springsRef = useRef({
    X: makeSpring(0, 300, 20),
    W: makeSpring(0, 300, 20),
  })
  const initPosRef = useRef(true)

  useEffect(() => {
    const seg = segRef.current
    if (!seg || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const btn = btnRefs.current[activeIdxRef.current]
      if (!btn) return
      springsRef.current.X.t = btn.offsetLeft
      springsRef.current.W.t = btn.offsetWidth
    })
    ro.observe(seg)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now

      const { X, W } = springsRef.current
      const btn = btnRefs.current[activeIdxRef.current]
      if (btn) {
        X.t = btn.offsetLeft
        W.t = btn.offsetWidth
        if (initPosRef.current) {
          X.x = X.t
          W.x = W.t
          initPosRef.current = false
        }
      }

      const sub = 4
      for (let k = 0; k < sub; k++) {
        stepSpring(X, dt / sub, reduceMotion)
        stepSpring(W, dt / sub, reduceMotion)
      }

      const hl = hlRef.current
      if (hl && W.x > 0) {
        const sp = reduceMotion ? 0 : clamp(Math.abs(X.v) / 1400, 0, 0.22)
        hl.style.width = `${W.x.toFixed(2)}px`
        hl.style.transform = `translateX(${X.x.toFixed(2)}px) scale(${(1 + sp).toFixed(4)},${(1 - sp * 0.5).toFixed(4)})`
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="eq-glass" style={{ padding: '12px 14px', borderRadius: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>{label}</div>
      <div
        ref={segRef}
        role="tablist"
        aria-label={label}
        style={{
          position: 'relative',
          display: 'flex',
          padding: 3,
          borderRadius: 12,
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
        }}
      >
        <span
          ref={hlRef}
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 3,
            height: 32,
            borderRadius: 9,
            background: 'var(--ink)',
            willChange: 'transform',
            pointerEvents: 'none',
          }}
        />
        {options.map((opt, i) => {
          const isActive = value === opt
          return (
            <button
              key={opt}
              ref={(el) => { btnRefs.current[i] = el }}
              type="button"
              data-no-pill
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(opt)}
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                height: 32,
                border: 0,
                background: 'none',
                borderRadius: 9,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--bg)' : 'var(--ink-3)',
                transition: 'color .25s',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {labels[i]}
            </button>
          )
        })}
      </div>
      {hint && (
        <p style={HINT_STYLE[hint.level]}>{hint.text}</p>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────

export default function GateBPanel({
  onResult,
}: {
  onResult: (result: GateBResult) => void
}) {
  const [input, setInput] = useState<GateBInput>(DEFAULT_INPUT)
  const result = checkGateB(input)

  useEffect(() => { onResult(result) }, [input])  // eslint-disable-line react-hooks/exhaustive-deps

  function patch<K extends keyof GateBInput>(key: K, val: GateBInput[K]) {
    setInput(prev => ({ ...prev, [key]: val }))
  }

  const verdictColor = result.verdict === 'PASS' ? 'var(--status-go)' : 'var(--status-stop)'

  // 힌트 계산 (현재 input 기준 실시간)
  const hints = {
    marketForeign:    hintMarketForeign(input.market_foreign_days, input.market_institution),
    marketInstitution: hintMarketInstitution(input.market_institution, input.market_foreign_days),
    sectorEtf:        hintSectorEtf(input.sector_etf_days),
    stockForeign:     hintStockForeign(input.stock_foreign_days, input.stock_institution_weeks),
    stockInstitution: hintStockInstitution(input.stock_institution_weeks, input.stock_foreign_days),
    shortRatio:       hintShortRatio(input.short_ratio, input.short_trend),
    shortTrend:       hintShortTrend(input.short_trend, input.short_ratio),
  }

  const layerTitle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', marginBottom: 10,
    fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.08em',
    textTransform: 'uppercase', fontWeight: 700, color: 'var(--ink-3)',
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Gate B — 수급</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--status-warn)' }}>HTS 확인 후 직접 입력</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: verdictColor,
          border: `1px solid ${verdictColor}`, borderRadius: 999, padding: '2px 10px',
        }}>
          {result.verdict === 'PASS' ? '✅ PASS' : '🚫 BLOCK'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* 범례 */}
        <Legend />

        {/* Layer 1 */}
        <div>
          <h4 style={layerTitle}>
            Layer 1 — 시장 전체
            <StatusPill status={result.layer1} />
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <SliderField
              label="외국인 순매수 연속 (일)"
              value={input.market_foreign_days} min={-10} max={10}
              hint={hints.marketForeign}
              onChange={v => patch('market_foreign_days', v)}
            />
            <Toggle3Way
              label="기관 방향"
              value={input.market_institution}
              options={['buy', 'neutral', 'sell'] as const}
              labels={['매수', '중립', '매도']}
              hint={hints.marketInstitution}
              onChange={v => patch('market_institution', v)}
            />
          </div>
        </div>

        {/* Layer 2 */}
        <div>
          <h4 style={layerTitle}>
            Layer 2 — 섹터
            <StatusPill status={result.layer2} />
          </h4>
          <SliderField
            label="섹터 ETF 순유입 연속 (일)"
            value={input.sector_etf_days} min={-10} max={10}
            hint={hints.sectorEtf}
            onChange={v => patch('sector_etf_days', v)}
          />
        </div>

        {/* Layer 3 */}
        <div>
          <h4 style={layerTitle}>
            Layer 3 — 종목
            <StatusPill status={result.layer3} />
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <SliderField
              label="외국인 순매수 연속 (일)"
              value={input.stock_foreign_days} min={0} max={10}
              hint={hints.stockForeign}
              onChange={v => patch('stock_foreign_days', v)}
            />
            <SliderField
              label="기관 누적 순매수 (주)"
              value={input.stock_institution_weeks} min={-5} max={5}
              hint={hints.stockInstitution}
              onChange={v => patch('stock_institution_weeks', v)}
            />
            <SliderField
              label="대차잔고 / 시총 (%)"
              value={Math.round(input.short_ratio * 100)}
              min={0} max={20}
              display={`${(input.short_ratio * 100).toFixed(1)}%`}
              formatValue={(v) => `${v}%`}
              hint={hints.shortRatio}
              onChange={v => patch('short_ratio', v / 100)}
            />
            <Toggle3Way
              label="대차잔고 추세"
              value={input.short_trend}
              options={['decrease', 'stable', 'increase'] as const}
              labels={['감소', '안정', '증가']}
              hint={hints.shortTrend}
              onChange={v => patch('short_trend', v)}
            />
          </div>
        </div>

        {/* 매트릭스 결과 */}
        <div className="eq-glass" style={{ borderRadius: 8, padding: '10px 14px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>2×2 매트릭스: </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{MATRIX_LABEL[result.matrix]}</span>
        </div>
      </div>
    </div>
  )
}
