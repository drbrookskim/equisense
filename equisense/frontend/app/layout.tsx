import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import AuthProvider from '@/components/layout/AuthProvider'
import SpaRedirectScript from '@/components/layout/SpaRedirectScript'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EquiSense — 4단계 주식 분석',
  description: '펀더멘털 · 해자 · 정성적 · 기술적 분석을 한 곳에서',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <SpaRedirectScript />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
