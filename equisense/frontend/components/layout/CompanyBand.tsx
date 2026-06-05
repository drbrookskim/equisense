'use client'

import { useSearchParams } from 'next/navigation'

export default function CompanyBand() {
  const searchParams = useSearchParams()
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase()
  const market = searchParams.get('market') ?? 'US'
  const name = searchParams.get('name')

  if (!ticker) return null

  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto',
      padding: '26px 32px 0',
    }}>
      <h1 style={{
        margin: 0,
        fontFamily: 'var(--font-display)', fontWeight: 600,
        fontSize: 32, color: 'var(--ink)',
        letterSpacing: '-.01em', lineHeight: 1.08,
      }}>
        {name ?? ticker}
      </h1>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--ink-3)', marginTop: 7,
      }}>
        {ticker} · {market === 'KR' ? 'KRX' : 'US'}
      </div>
    </div>
  )
}
