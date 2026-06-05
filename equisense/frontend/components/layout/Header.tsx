'use client'

import { usePathname } from 'next/navigation'
import SearchBox from './SearchBox'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export default function Header() {
  const pathname = usePathname()
  const isLanding = pathname === '/' || pathname === ''

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'color-mix(in srgb, var(--bg) 86%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', gap: 24,
      }}>
        {/* Logo */}
        <a
          href={`${BASE_PATH || '/'}`}
          style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
          }}
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
          <div style={{ flex: 1, maxWidth: 480 }}>
            <SearchBox variant="compact" />
          </div>
        )}

        {/* Tag */}
        <div style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)', fontSize: 10.5,
          letterSpacing: '.12em', color: 'var(--ink-3)',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          4-Layer Analysis
        </div>
      </div>
    </header>
  )
}
