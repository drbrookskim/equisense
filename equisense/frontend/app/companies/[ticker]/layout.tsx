'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import TabNav from '@/components/layout/TabNav'

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const ticker = (params.ticker as string).toUpperCase()

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

// 정적 export: 빌드 시 ticker를 알 수 없으므로 빈 배열 반환
// 실제 라우팅은 클라이언트 JS + 404.html SPA 폴백이 처리
export async function generateStaticParams() {
  return []
}
