import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import TabNav from '@/components/layout/TabNav'

// 실제 ticker는 빌드 시 알 수 없으므로 placeholder로 라우트 등록.
// 실제 라우팅은 클라이언트 JS + 404.html SPA 폴백이 처리.
export async function generateStaticParams() {
  return [{ ticker: '_' }]
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
        <TabNav ticker={ticker.toUpperCase()} />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </>
  )
}
