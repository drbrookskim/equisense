import type { Metadata } from 'next'
import { Geist_Mono, Source_Serif_4 } from 'next/font/google'
import AuthProvider from '@/components/layout/AuthProvider'
import SpaRedirectScript from '@/components/layout/SpaRedirectScript'
import './globals.css'

const sourceSerif4 = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
})
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EquiSense — 4단계 주식 분석',
  description: '펀더멘털 · 해자 · 정성적 · 기술적 분석을 한 곳에서',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${sourceSerif4.variable} ${geistMono.variable} h-full`}>
      <body style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
        <SpaRedirectScript />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
