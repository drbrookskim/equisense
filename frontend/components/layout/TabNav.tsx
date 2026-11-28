'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCompanyScores, type TabHref } from '@/contexts/CompanyScoresContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const TABS = [
  {
    href: 'analysis',
    ko: '분석',
    en: 'Fundamental',
    glyph: (
      <g>
        <rect x="6" y="22" width="6" height="12" />
        <rect x="17" y="13" width="6" height="21" />
        <rect x="28" y="18" width="6" height="16" />
        <line x1="4" y1="34" x2="36" y2="34" />
      </g>
    ),
  },
  {
    href: 'moat',
    ko: '해자',
    en: 'Moat',
    glyph: (
      <g>
        <circle cx="20" cy="22" r="14" />
        <circle cx="20" cy="22" r="8.5" />
        <circle cx="20" cy="22" r="3" />
      </g>
    ),
  },
  {
    href: 'qualitative',
    ko: '센티먼트',
    en: 'Qualitative',
    glyph: (
      <g>
        <path d="M8 14h24v14H22l-6 6v-6H8z" />
        <line x1="14" y1="21" x2="26" y2="21" />
      </g>
    ),
  },
  {
    href: 'swing',
    ko: '스윙 투자',
    en: 'Technical',
    glyph: (
      <g>
        <line x1="12" y1="10" x2="12" y2="34" />
        <rect x="9" y="16" width="6" height="11" />
        <line x1="26" y1="12" x2="26" y2="34" />
        <rect x="23" y="20" width="6" height="9" />
      </g>
    ),
  },
] as const

const BADGE_COLOR: Record<string, string> = {
  strong: 'var(--accent)',
  neutral: '#b45309',
  weak: '#dc2626',
}

interface Spring {
  x: number
  v: number
  t: number
  k: number
  c: number
}

function makeSpring(x: number, k = 300, c = 20): Spring {
  return { x, v: 0, t: x, k, c }
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

function badgeText(label: string, score?: number): string {
  if (score != null) return `${score}/100 · ${label}`
  return label
}

export default function TabNav({ ticker: _tickerProp }: { ticker: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const market = searchParams.get('market') ?? 'US'
  const ticker = searchParams.get('ticker') ?? _tickerProp
  const name = searchParams.get('name')
  const nameParam = name ? `&name=${encodeURIComponent(name)}` : ''
  const { badges } = useCompanyScores()
  const isMobile = useIsMobile()

  const activeIdx = Math.max(
    0,
    TABS.findIndex((tab) => pathname === `/companies/_/${tab.href}`),
  )

  const segRef = useRef<HTMLDivElement | null>(null)
  const hlRef = useRef<HTMLSpanElement | null>(null)
  const cwRef = useRef<HTMLSpanElement | null>(null)
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])

  const activeIdxRef = useRef(activeIdx)
  activeIdxRef.current = activeIdx

  const [captionIdx, setCaptionIdx] = useState(activeIdx)
  const firstMountRef = useRef(true)

  const springsRef = useRef({
    X: makeSpring(0, 300, 20),
    W: makeSpring(0, 300, 20),
    C: makeSpring(1, 300, 26),
  })
  const initPosRef = useRef(true)

  // 탭 전환 시 캡션 블러 아웃 -> 라이즈 인
  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false
      setCaptionIdx(activeIdx)
      return
    }
    const { C } = springsRef.current
    C.t = 0
    const timer = setTimeout(() => {
      setCaptionIdx(activeIdx)
      C.x = -0.4
      C.t = 1
    }, 140)
    return () => clearTimeout(timer)
  }, [activeIdx])

  // 리사이즈 시 하이라이트 목표 위치 즉시 동기화
  useEffect(() => {
    const seg = segRef.current
    if (!seg || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const btn = tabRefs.current[activeIdxRef.current]
      if (!btn) return
      const { X, W } = springsRef.current
      X.t = btn.offsetLeft
      W.t = btn.offsetWidth
    })
    ro.observe(seg)
    return () => ro.disconnect()
  }, [])

  // Segmented Control 스프링 루프 (위치 + 속도 기반 스쿼시/스트레치 + 캡션 블러/라이즈)
  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now

      const { X, W, C } = springsRef.current
      const btn = tabRefs.current[activeIdxRef.current]

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
        stepSpring(C, dt / sub, reduceMotion)
      }

      const hl = hlRef.current
      if (hl && W.x > 0) {
        const sp = reduceMotion ? 0 : clamp(Math.abs(X.v) / 1400, 0, 0.22)
        hl.style.width = `${W.x.toFixed(2)}px`
        hl.style.transform = `translateX(${X.x.toFixed(2)}px) scale(${(1 + sp).toFixed(4)},${(1 - sp * 0.5).toFixed(4)})`
      }

      const cw = cwRef.current
      if (cw) {
        const c = C.x
        cw.style.opacity = clamp(c, 0, 1).toFixed(3)
        cw.style.transform = `translateY(${(c < 0 ? -c * 10 : (1 - clamp(c, 0, 1)) * -6).toFixed(2)}px)`
        cw.style.filter = reduceMotion
          ? 'none'
          : `blur(${((1 - clamp(c, 0, 1)) * 4).toFixed(2)}px)`
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const captionTab = TABS[captionIdx] ?? TABS[0]
  const captionBadge = badges[captionTab.href as TabHref]

  return (
    <nav
      className="eq-tabnav-glass"
      style={{ paddingBottom: isMobile ? 12 : 16 }}
    >
      <div
        style={{
          maxWidth: 1300,
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 32px',
        }}
      >
        <div
          style={{
            width: isMobile ? '100%' : 'min(540px, 100%)',
            margin: '0 auto',
          }}
        >
          <div
            ref={segRef}
            role="tablist"
            aria-label="기업 분석 탭"
            style={{
              position: 'relative',
              display: 'flex',
              padding: 4,
              borderRadius: 16,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
            }}
          >
            <span
              ref={hlRef}
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: 4,
                height: 38,
                borderRadius: 12,
                background: 'var(--ink)',
                willChange: 'transform',
                pointerEvents: 'none',
              }}
            />
            {TABS.map((tab, i) => {
              const isActive = i === activeIdx
              const badge = badges[tab.href as TabHref]
              return (
                <Link
                  key={tab.href}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  role="tab"
                  aria-selected={isActive}
                  href={`/companies/_/${tab.href}?ticker=${ticker}&market=${market}${nameParam}`}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? 4 : 6,
                    textDecoration: 'none',
                    borderRadius: 12,
                    fontSize: isMobile ? 12.5 : 13.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--bg)' : 'var(--ink-3)',
                    transition: 'color .25s',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <svg
                    width={isMobile ? 14 : 15}
                    height={isMobile ? 14 : 15}
                    viewBox="0 0 40 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    {tab.glyph}
                  </svg>
                  <span>{tab.ko}</span>
                  {badge && (
                    <span
                      aria-hidden
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: BADGE_COLOR[badge.tone],
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div
            style={{
              position: 'relative',
              height: 20,
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            <span
              ref={cwRef}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                fontSize: 12.5,
                color: 'var(--ink-3)',
                willChange: 'transform, opacity, filter',
                whiteSpace: 'nowrap',
              }}
            >
              <b style={{ color: 'var(--ink)', fontWeight: 600 }}>
                {captionTab.ko}
              </b>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginLeft: 6,
                }}
              >
                {captionTab.en}
              </span>
              {captionBadge && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: BADGE_COLOR[captionBadge.tone],
                    marginLeft: 8,
                  }}
                >
                  {badgeText(captionBadge.label, captionBadge.score)}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
