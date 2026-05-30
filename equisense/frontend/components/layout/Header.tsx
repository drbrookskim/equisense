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
    // router.push는 같은 경로의 query param 변경 시 useSearchParams()를 갱신하지 않음
    // (Next.js 16 static export 제약) → window.location으로 강제 전체 로드
    window.location.href = `${BASE_PATH}/companies/_/fundamentals?ticker=${s.ticker}&market=${s.market}`
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
    window.location.href = `${BASE_PATH}/companies/_/fundamentals?ticker=${q}&market=${isKrTicker(q) ? 'KR' : 'US'}`
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center gap-6">
        <a
          href={`${BASE_PATH || '/'}`}
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          EquiSense
        </a>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="relative flex flex-1 items-center gap-2"
        >
          <input
            value={query}
            onChange={handleChange}
            onFocus={() => { if (query.trim()) setOpen(true) }}
            onKeyDown={handleKeyDown}
            placeholder="종목 코드 또는 종목명 (예: AAPL, 삼성전자)"
            autoComplete="off"
            className="h-9 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            분석
          </button>

          {open && suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full max-w-md overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.market}-${s.ticker}`}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); navigate(s) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                    i === activeIdx ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="w-5 shrink-0 text-base">{s.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
                  <span className="w-16 shrink-0 font-mono text-xs text-zinc-500">{s.ticker}</span>
                  <span className="truncate text-zinc-800 dark:text-zinc-200">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </header>
  )
}
