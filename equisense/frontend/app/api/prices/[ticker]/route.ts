/**
 * Vercel Edge Function — Module 4 실시간 주가 서빙.
 *
 * PriceUpdateWorker Lambda가 채운 Upstash Redis 캐시를 읽기 전용 토큰으로 조회합니다.
 * 캐시 미스 시 { data: null, cached: false } 를 반환하여 클라이언트가 재시도합니다.
 * API 키는 서버 사이드에만 존재하며 클라이언트에 노출되지 않습니다.
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// 읽기 전용 토큰 — PriceUpdateWorker가 쓰는 토큰과 분리
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TICKER_RE = /^[A-Z0-9]{1,10}$/

interface PriceData {
  ticker: string
  price: number
  change: number
  change_percent: string
  volume: number
  latest_trading_day: string
  previous_close: number
  week_52_high: number
  week_52_low: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params
  const upperTicker = ticker.toUpperCase()

  if (!TICKER_RE.test(upperTicker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  try {
    const data = await redis.get<PriceData>(`price:${upperTicker}`)

    if (!data) {
      return NextResponse.json(
        { data: null, cached: false, ticker: upperTicker },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        },
      )
    }

    return NextResponse.json(
      { data, cached: true, ticker: upperTicker },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    )
  } catch (err) {
    console.error(`Price fetch error for ${upperTicker}:`, err)
    return NextResponse.json({ error: 'Cache unavailable' }, { status: 503 })
  }
}
