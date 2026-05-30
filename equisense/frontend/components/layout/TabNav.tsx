'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const TABS = [
  { label: '펀더멘털', href: 'fundamentals' },
  { label: '해자', href: 'moat' },
  { label: '정성적 분석', href: 'qualitative' },
  { label: '기술적 분석', href: 'technical' },
]

export default function TabNav({ ticker: _tickerProp }: { ticker: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const market = searchParams.get('market') ?? 'US'
  const ticker = searchParams.get('ticker') ?? _tickerProp

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl gap-1 px-6">
        {TABS.map((tab) => {
          const isActive = pathname === `/companies/_/${tab.href}`
          return (
            <Link
              key={tab.href}
              href={`/companies/_/${tab.href}?ticker=${ticker}&market=${market}`}
              className={[
                'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
