'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import SearchBox from './SearchBox'
import { useTheme } from '@/lib/hooks/useTheme'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export default function Header() {
  const pathname = usePathname()
  const isLanding = pathname === '/' || pathname === ''
  const { theme, toggle: toggleTheme } = useTheme()
  const { favorites } = useFavorites()
  const [favOpen, setFavOpen] = useState(false)
  const favRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (favRef.current && !favRef.current.contains(e.target as Node)) setFavOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const hasFavs = favorites.length > 0

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        padding: isMobile ? '0 16px' : '0 32px',
        height: 60,
        display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16,
      }}>
        {/* Logo */}
        <a
          href={`${BASE_PATH || '/'}`}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}
        >
          <span style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 40 40" fill="none"
              stroke="var(--bg)" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="20" cy="20" r="13" />
              <circle cx="20" cy="20" r="4.5" />
            </svg>
          </span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600,
            letterSpacing: '-.01em', color: 'var(--ink)', whiteSpace: 'nowrap',
          }}>
            Equity<span style={{ color: 'var(--accent)' }}>Sense</span>
          </span>
        </a>

        {/* Search — 회사 페이지에서만 표시 */}
        {!isLanding && (
          <div style={{ flex: 1, maxWidth: isMobile ? undefined : 480 }}>
            <SearchBox variant="compact" accentSubmit={isMobile} />
          </div>
        )}

        {/* Right controls — 모바일에서 숨김 */}
        {!isMobile && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* Favorites button + dropdown */}
            <div ref={favRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setFavOpen(v => !v)}
                title="즐겨찾기"
                style={{
                  all: 'unset', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, lineHeight: 1,
                  color: hasFavs ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {hasFavs ? '★' : '☆'}
              </button>

              {favOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  zIndex: 60, width: 240,
                  borderRadius: 10, border: '1px solid var(--line-2)',
                  background: 'var(--surface)',
                  boxShadow: '0 12px 32px -8px rgba(0,0,0,.20)',
                  overflow: 'hidden',
                }}>
                  {favorites.length === 0 ? (
                    <div style={{
                      padding: '16px', fontSize: 12,
                      color: 'var(--ink-3)', textAlign: 'center',
                    }}>
                      즐겨찾기한 종목이 없습니다
                    </div>
                  ) : (
                    favorites.map(f => (
                      <a
                        key={f.ticker}
                        href={`${BASE_PATH}/companies/_/analysis?ticker=${f.ticker}&market=${f.market}&name=${encodeURIComponent(f.name)}`}
                        onClick={() => setFavOpen(false)}
                        style={{
                          all: 'unset', boxSizing: 'border-box',
                          display: 'flex', width: '100%',
                          alignItems: 'center', gap: 8,
                          padding: '9px 14px', cursor: 'pointer',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>
                          {f.ticker}
                        </span>
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, lineHeight: 1,
              }}
            >
              {theme === 'dark' ? '☀' : '🌙'}
            </button>

            {/* Tag */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5,
              letterSpacing: '.12em', color: 'var(--ink-3)',
              textTransform: 'uppercase', whiteSpace: 'nowrap',
              paddingLeft: 4,
            }}>
              4-Layer Analysis
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
