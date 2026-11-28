'use client'

import { useEffect, useId, useRef, useState } from 'react'

// 7시 30분(-135°)에서 4시 30분(+135°)까지 270° 스윕
const SWEEP = 270
const START_ANGLE = -135
const DETENT_PULL = 0.65
const DETENT_STEP = 2.5
const TICK_COUNT = 40
const WAVE_HEIGHT = 8
const WAVE_WIDTH = 12
const STIFFNESS = 190
const DAMPING = 22

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function snap(value: number, min: number, step: number) {
  return Number((Math.round((value - min) / step) * step + min).toFixed(10))
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180
  return {
    x: Math.round((cx + radius * Math.sin(rad)) * 100) / 100,
    y: Math.round((cy - radius * Math.cos(rad)) * 100) / 100,
  }
}

function computeTickLength(i: number, indicatorAngle: number, waveScale: number) {
  const angle = START_ANGLE + (i / TICK_COUNT) * SWEEP
  const anchor = i === 0 || i === TICK_COUNT || i * 2 === TICK_COUNT
  const major = i % 5 === 0
  let base = 5.5
  if (anchor) base = 12.5
  else if (major) base = 9
  const distance = (angle - indicatorAngle) / WAVE_WIDTH
  return (
    Math.round(
      (base + WAVE_HEIGHT * waveScale * Math.exp(-distance * distance)) * 10,
    ) / 10
  )
}

function computeTickGeometry(
  i: number,
  length: number,
  center: number,
  outer: number,
) {
  const angle = START_ANGLE + (i / TICK_COUNT) * SWEEP
  return {
    a: polar(center, center, outer - length, angle),
    b: polar(center, center, outer, angle),
  }
}

export interface DetentDialLoaderProps {
  /** 노브 내부 상단 라벨 (예: 티커 또는 섹션명) */
  label?: string
  /** 다이얼 하단 상태 메시지 */
  message?: string
  /** 다이얼 직경(px) */
  size?: number
  /** 외부에서 제어하는 진행률 (0–100). 미지정 시 자동 점진 디텐트 스윕 */
  progress?: number
  /** 중앙 숫자 포맷터 */
  formatValue?: (value: number) => string
  /** 컴팩트 컨테이너 여백 */
  compact?: boolean
  className?: string
}

/**
 * Kokonut UI Detent Dial을 Equisense 검색·컨텐트 로딩에 맞게 최적화한 컴포넌트.
 * - motion/react 없이 단일 rAF 스프링 물리 + 직접 SVG 속성 갱신으로 프레임당 리렌더 0회
 * - Equisense CSS 토큰(--surface, --ink, --accent, --line) 기반 라이트/다크 자동 대응
 * - prefers-reduced-motion 존중 및 SSR 하이드레이션 안전 좌표 라운딩
 */
export default function DetentDialLoader({
  label = 'LOADING',
  message = '데이터 불러오는 중…',
  size = 200,
  progress,
  formatValue = (v) => `${Math.round(v)}%`,
  compact = false,
  className,
}: DetentDialLoaderProps) {
  const labelId = useId()
  const indicatorRef = useRef<HTMLDivElement>(null)
  const tickRefs = useRef<(SVGLineElement | null)[]>([])
  const tickLengths = useRef<number[]>([])

  const initialValue = progress !== undefined ? clamp(progress, 0, 100) : 8
  const [displayValue, setDisplayValue] = useState(Math.round(initialValue))
  const committedRef = useRef(Math.round(initialValue))
  const physicsRef = useRef({
    pos: initialValue,
    vel: 0,
    target: initialValue,
  })

  const center = size / 2
  const outer = size / 2 - 6
  const knobSize = Math.round(size * 0.64)
  const waveScale = size / 240

  // 외부 progress prop 동기화
  useEffect(() => {
    if (progress === undefined) return
    physicsRef.current.target = clamp(progress, 0, 100)
  }, [progress])

  // 비제어 모드: 디텐트 노치 단위로 점진적 로딩 진행 (0 → ~95%)
  useEffect(() => {
    if (progress !== undefined) return
    let timer: ReturnType<typeof setTimeout>
    const stepForward = () => {
      const p = physicsRef.current
      const remaining = 95 - p.target
      if (remaining > 0.8) {
        const jump = Math.max(2.5, remaining * (0.14 + Math.random() * 0.14))
        p.target = clamp(
          snap(p.target + jump, 0, DETENT_STEP),
          0,
          95,
        )
      }
      const delay = 240 + Math.random() * 240
      timer = setTimeout(stepForward, delay)
    }
    timer = setTimeout(stepForward, 140)
    return () => clearTimeout(timer)
  }, [progress])

  // 단일 rAF 스프링 루프: 인디케이터 회전 & 틱 웨이브 DOM 직접 갱신
  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let rafId = 0
    let last = performance.now()

    // 초기 틱 길이 캐시 시드
    const initAngle = START_ANGLE + (physicsRef.current.pos / 100) * SWEEP
    for (let i = 0; i <= TICK_COUNT; i++) {
      tickLengths.current[i] = computeTickLength(i, initAngle, waveScale)
    }

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const p = physicsRef.current

      if (reduceMotion) {
        p.pos = p.target
        p.vel = 0
      } else {
        const sub = 4
        const h = dt / sub
        for (let s = 0; s < sub; s++) {
          const acc = -STIFFNESS * (p.pos - p.target) - DAMPING * p.vel
          p.vel += acc * h
          p.pos += p.vel * h
        }
      }

      const clamped = clamp(p.pos, 0, 100)
      const notch = snap(clamped, 0, DETENT_STEP)
      const pulled = notch + (clamped - notch) * (1 - DETENT_PULL)
      const indicatorAngle = START_ANGLE + (pulled / 100) * SWEEP

      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `rotate(${indicatorAngle.toFixed(2)}deg)`
      }

      for (let i = 0; i <= TICK_COUNT; i++) {
        const line = tickRefs.current[i]
        const length = computeTickLength(i, indicatorAngle, waveScale)
        if (!line || tickLengths.current[i] === length) continue
        tickLengths.current[i] = length
        const { a } = computeTickGeometry(i, length, center, outer)
        line.setAttribute('x1', String(a.x))
        line.setAttribute('y1', String(a.y))
      }

      const nextDisplay = Math.round(clamped)
      if (nextDisplay !== committedRef.current) {
        committedRef.current = nextDisplay
        setDisplayValue(nextDisplay)
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [center, outer, waveScale])

  const activeTick = Math.round((displayValue / 100) * TICK_COUNT)
  const initialAngle = START_ANGLE + (initialValue / 100) * SWEEP
  const minLabel = polar(center, center, outer + 2, START_ANGLE - 12)
  const maxLabel = polar(center, center, outer + 2, START_ANGLE + SWEEP + 12)
  const formatted = formatValue(displayValue)

  return (
    <div
      className={className}
      role="progressbar"
      aria-labelledby={labelId}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayValue}
      aria-valuetext={formatted}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '28px 16px' : '44px 20px',
        borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          aria-hidden="true"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          {Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
            const lit = i <= activeTick
            const current = i === activeTick
            const length = computeTickLength(i, initialAngle, waveScale)
            const { a, b } = computeTickGeometry(i, length, center, outer)
            return (
              <line
                key={i}
                ref={(node) => {
                  tickRefs.current[i] = node
                }}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeLinecap="round"
                strokeWidth={current ? 2.2 : 1.5}
                style={{
                  stroke: current
                    ? 'var(--accent)'
                    : lit
                      ? 'var(--ink)'
                      : 'var(--line-2)',
                  transition: 'stroke 150ms ease',
                }}
              />
            )
          })}
        </svg>

        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: minLabel.x,
            top: minLabel.y,
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          0%
        </span>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: maxLabel.x,
            top: maxLabel.y,
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          100%
        </span>

        {/* 중앙 노브 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: knobSize,
            height: knobSize,
            transform: 'translate(-50%, -50%)',
            borderRadius: '9999px',
            background: 'var(--surface)',
            border: '1px solid var(--line-2)',
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.06), 0 12px 28px -12px rgba(0,0,0,0.22)',
          }}
        >
          {/* 회전 인디케이터 바늘 */}
          <div
            ref={indicatorRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              transform: `rotate(${initialAngle.toFixed(2)}deg)`,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: Math.max(7, Math.round(size * 0.042)),
                left: '50%',
                width: 3,
                height: Math.max(9, Math.round(size * 0.05)),
                transform: 'translateX(-50%)',
                borderRadius: 9999,
                background: 'var(--accent)',
              }}
            />
          </div>

          {/* 중앙 라벨 + 롤링 숫자 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              gap: 2,
            }}
          >
            <span
              id={labelId}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: Math.max(9.5, Math.round(size * 0.052)),
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                maxWidth: knobSize - 24,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
            <RollingValue text={formatted} size={size} />
          </div>
        </div>
      </div>

      {message && (
        <p
          aria-live="polite"
          style={{
            margin: '14px 0 0',
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            color: 'var(--ink-2)',
            letterSpacing: '-0.01em',
          }}
        >
          {message}
        </p>
      )}
    </div>
  )
}

function RollingValue({ text, size }: { text: string; size: number }) {
  const fontSize = Math.max(20, Math.round(size * 0.135))
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        color: 'var(--ink)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {text.split('').map((char, index) => (
        <span
          key={index}
          style={{
            position: 'relative',
            display: 'inline-flex',
            overflow: 'hidden',
          }}
        >
          <span key={char} className="eq-dial-roll-char">
            {char}
          </span>
        </span>
      ))}
    </span>
  )
}
