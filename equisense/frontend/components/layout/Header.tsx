'use client'

import { useEffect, useRef, useState } from 'react'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const PROXY = process.env.NEXT_PUBLIC_PROXY_URL ?? ''

type Market = 'KR' | 'US'
type Suggestion = { ticker: string; name: string; market: Market }

function isKrTicker(s: string) { return /^\d{5,6}$/.test(s) }
function hasKorean(s: string) { return /[가-힣]/.test(s) }

// Module-level cache — persists for the browser session
let krNamesCache: Record<string, string> | null = null

async function loadKrNames(): Promise<Record<string, string>> {
  if (krNamesCache) return krNamesCache
  const res = await fetch(`${BASE_PATH}/corp-names.json`)
  if (!res.ok) return {}
  krNamesCache = (await res.json()) as Record<string, string>
  return krNamesCache
}

function searchKR(query: string, names: Record<string, string>): Suggestion[] {
  const q = query.toLowerCase()
  const qUp = query.toUpperCase()
  const exact: Suggestion[] = []
  const sw: Suggestion[] = []
  const inc: Suggestion[] = []

  for (const [ticker, name] of Object.entries(names)) {
    const nameLow = name.toLowerCase()
    if (ticker === qUp) {
      exact.push({ ticker, name, market: 'KR' })
    } else if (ticker.startsWith(qUp) || nameLow.startsWith(q)) {
      sw.push({ ticker, name, market: 'KR' })
    } else if (nameLow.includes(q)) {
      inc.push({ ticker, name, market: 'KR' })
    }
  }

  sw.sort((a, b) => a.ticker.localeCompare(b.ticker))
  inc.sort((a, b) => a.ticker.localeCompare(b.ticker))

  return [...exact, ...sw, ...inc].slice(0, 6)
}

async function searchUS(query: string): Promise<Suggestion[]> {
  if (!PROXY || query.length < 1) return []
  try {
    const res = await fetch(`${PROXY}/yahoo/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) return []
    const data = await res.json() as { quotes?: { symbol: string; longname?: string; shortname?: string; quoteType?: string; isYahooFinance?: boolean }[] }
    return (data.quotes ?? [])
      .filter((q) => q.quoteType === 'EQUITY' && q.isYahooFinance)
      .slice(0, 6)
      .map((q) => ({ ticker: q.symbol, name: q.longname || q.shortname || q.symbol, market: 'US' as const }))
  } catch {
    return []
  }
}

export default function Header() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const formRef = useRef<HTMLFormElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  async function runSearch(q: string) {
    const trimmed = q.trim()
    if (trimmed.length < 1) { setSuggestions([]); return }

    const korean = hasKorean(trimmed)
    const krNum = isKrTicker(trimmed)

    const [krResults, usResults] = await Promise.all([
      loadKrNames().then((names) => searchKR(trimmed, names)),
      !korean ? searchUS(trimmed) : Promise.resolve<Suggestion[]>([]),
    ])

    const combined = korean || krNum
      ? [...krResults.slice(0, 6), ...usResults.slice(0, 2)]
      : [...usResults.slice(0, 6), ...krResults.slice(0, 2)]

    setSuggestions(combined)
    setActiveIdx(-1)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => runSearch(val), 250)
  }

  function navigate(s: Suggestion) {
    setOpen(false)
    setQuery(s.ticker)
    const nameParam = s.name ? `&name=${encodeURIComponent(s.name)}` : ''
    window.location.href = `${BASE_PATH}/companies/_/analysis?ticker=${s.ticker}&market=${s.market}${nameParam}`
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      navigate(suggestions[activeIdx])
      return
    }
    // 한글 입력 또는 KR 코드일 때 suggestions 첫 항목으로 이동
    if (suggestions.length > 0 && (hasKorean(query) || isKrTicker(query.trim()))) {
      navigate(suggestions[0])
      return
    }
    const q = query.trim().toUpperCase()
    if (!q) return
    setOpen(false)
    window.location.href = `${BASE_PATH}/companies/_/analysis?ticker=${q}&market=${isKrTicker(q) ? 'KR' : 'US'}`
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

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

        {/* Search */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{ position: 'relative', display: 'flex', flex: 1, maxWidth: 480, gap: 8 }}
        >
          <input
            value={query}
            onChange={handleChange}
            onFocus={() => { if (query.trim()) setOpen(true) }}
            onKeyDown={handleKeyDown}
            placeholder="종목 코드 또는 종목명 (예: AAPL, 삼성전자)"
            autoComplete="off"
            style={{
              flex: 1, minWidth: 0,
              background: 'var(--surface)',
              border: '1px solid var(--line-2)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13.5, color: 'var(--ink)',
              fontFamily: 'var(--font-ui)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--ink)', color: 'var(--bg)',
              border: 'none', borderRadius: 8,
              padding: '0 18px',
              fontFamily: 'var(--font-mono)', fontSize: 12.5,
              fontWeight: 700, letterSpacing: '.05em',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            분석 →
          </button>

          {open && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', left: 0, top: 'calc(100% + 6px)',
              zIndex: 50, width: '100%', maxWidth: 420,
              overflow: 'hidden', borderRadius: 10,
              border: '1px solid var(--line-2)',
              background: 'var(--surface)',
              boxShadow: '0 12px 32px -8px rgba(0,0,0,.18)',
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={`${s.market}-${s.ticker}`}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); navigate(s) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    all: 'unset', boxSizing: 'border-box',
                    display: 'flex', width: '100%',
                    alignItems: 'center', gap: 12,
                    padding: '9px 14px',
                    cursor: 'pointer',
                    background: i === activeIdx ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{s.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11.5,
                    color: 'var(--ink-3)', width: 64, flexShrink: 0,
                  }}>
                    {s.ticker}
                  </span>
                  <span style={{
                    fontSize: 13, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Tag */}
        <div style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)', fontSize: 10.5,
          letterSpacing: '.12em', color: 'var(--ink-3)',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
          display: 'flex',
        }}>
          4-Layer Analysis
        </div>
      </div>
    </header>
  )
}
