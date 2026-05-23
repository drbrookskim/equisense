import { Suspense } from 'react'
import { readWatchlist } from '@/lib/watchlist'
import Header from '@/components/layout/Header'
import TabNav from '@/components/layout/TabNav'

export function generateStaticParams() {
  return readWatchlist().companies.map((c) => ({ ticker: c.ticker }))
}

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params

  return (
    <>
      <Header />
      <Suspense
        fallback={
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto h-12 max-w-6xl px-6" />
          </div>
        }
      >
        <TabNav ticker={ticker} />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </>
  )
}
