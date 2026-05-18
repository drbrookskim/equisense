import Link from 'next/link'
import Header from '@/components/layout/Header'

const TABS = [
  { label: '펀더멘털', href: 'fundamentals' },
  { label: '해자', href: 'moat' },
  { label: '정성적 분석', href: 'qualitative' },
  { label: '기술적 분석', href: 'technical' },
]

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
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={`/companies/${ticker}/${tab.href}`}
              className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 data-[active]:border-zinc-900 data-[active]:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 dark:data-[active]:border-zinc-50 dark:data-[active]:text-zinc-50"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </>
  )
}
