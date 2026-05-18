'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Market } from '@/types'

export default function Header() {
  const router = useRouter()
  const [ticker, setTicker] = useState('')
  const [market, setMarket] = useState<Market>('US')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const t = ticker.trim().toUpperCase()
    if (!t) return
    router.push(`/companies/${t}/fundamentals?market=${market}`)
  }

  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center gap-6">
        <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          EquiSense
        </span>

        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="종목코드 입력 (예: AAPL, 005930)"
            className="h-9 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as Market)}
            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="US">US</option>
            <option value="KR">KR</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            분석
          </button>
        </form>
      </div>
    </header>
  )
}
