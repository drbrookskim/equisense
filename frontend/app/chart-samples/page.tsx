'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import {
  DotHalftoneAreaChart,
  DotMatrixBarChart,
  DotWaffleMatrixChart,
  type DotShape,
} from '@/components/charts/DotChartSamples'

export default function ChartSamplesPage() {
  const [shape, setShape] = useState<DotShape>('circle')

  return (
    <>
      <Header />
      <main
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '32px 20px 72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.2em',
                color: 'var(--accent)',
                textTransform: 'uppercase',
              }}
            >
              DOT-MATRIX DATA VISUALIZATION
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontWeight: 600,
                color: 'var(--ink)',
                margin: '6px 0 0',
                letterSpacing: '-0.02em',
              }}
            >
              도트 스타일 차트 샘플 3종
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '6px 0 0' }}>
              원형 도트(Dot)와 사각 픽셀(Pixel) 모드를 전환하며 3가지 차트 스타일을 비교할 수 있습니다.
            </p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              padding: 4,
              borderRadius: 999,
              border: '1px solid var(--line-2)',
              background: 'var(--surface)',
              gap: 4,
            }}
          >
            {(['circle', 'square'] as const).map((mode) => {
              const active = shape === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setShape(mode)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? '#061310' : 'var(--ink-2)',
                    transition: 'background 140ms ease, color 140ms ease',
                  }}
                >
                  {mode === 'circle' ? '● 원형 도트' : '■ 사각 픽셀'}
                </button>
              )
            })}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          <DotMatrixBarChart shape={shape} />
          <DotHalftoneAreaChart shape={shape} />
          <DotWaffleMatrixChart shape={shape} />
        </div>
      </main>
    </>
  )
}
