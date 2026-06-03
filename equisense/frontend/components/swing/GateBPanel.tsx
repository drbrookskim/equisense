'use client'

import { useState, useEffect } from 'react'
import type { GateBInput, GateBResult, GateStatus } from '@/types'
import { checkGateB } from '@/lib/adapters/swingPipeline'

const STATUS_COLOR: Record<GateStatus, string> = {
  GO:   'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20',
  WARN: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20',
  STOP: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20',
}
const STATUS_ICON: Record<GateStatus, string> = { GO: '🟢', WARN: '⚠️', STOP: '🔴' }

const MATRIX_LABEL: Record<GateBResult['matrix'], string> = {
  STRONG_BUY:          '최강 진입 신호 ✅',
  FIND_ALTERNATIVE:    '섹터 대안 종목 탐색',
  HEADWIND_SHORT_ONLY: '헤드윈드 진입 (2주 이내)',
  NO_ENTRY:            '진입 금지 🚫',
}

const DEFAULT_INPUT: GateBInput = {
  market_foreign_days: 0,
  market_institution: 'neutral',
  sector_etf_days: 0,
  stock_foreign_days: 0,
  stock_institution_weeks: 0,
  short_ratio: 0.02,
  short_trend: 'stable',
}

function SliderField({
  label, value, min, max, step = 1, display, onChange,
}: {
  label: string; value: number; min: number; max: number
  step?: number; display?: string; onChange: (v: number) => void
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
        <span className="min-w-[40px] text-right text-sm font-bold">
          {display ?? (value > 0 ? `+${value}` : String(value))}
        </span>
      </div>
    </div>
  )
}

function Toggle3Way<T extends string>({
  label, value, options, labels, onChange,
}: {
  label: string; value: T; options: readonly T[]; labels: string[]
  onChange: (v: T) => void
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="flex gap-1">
        {options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={[
              'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              value === opt
                ? 'bg-indigo-500 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700',
            ].join(' ')}
          >
            {labels[i]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function GateBPanel({
  onResult,
}: {
  onResult: (result: GateBResult) => void
}) {
  const [input, setInput] = useState<GateBInput>(DEFAULT_INPUT)
  const result = checkGateB(input)

  useEffect(() => { onResult(result) }, [input])  // eslint-disable-line react-hooks/exhaustive-deps

  function patch<K extends keyof GateBInput>(key: K, val: GateBInput[K]) {
    setInput(prev => ({ ...prev, [key]: val }))
  }

  const verdictCls =
    result.verdict === 'PASS'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:ring-emerald-800'
      : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/20 dark:text-red-400 dark:ring-red-800'

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Gate B — 수급
          </span>
          <span className="text-xs text-amber-500">HTS 확인 후 직접 입력</span>
        </div>
        <span className={`rounded-full px-3 py-0.5 text-xs font-bold ring-1 ${verdictCls}`}>
          {result.verdict === 'PASS' ? '✅ PASS' : '🚫 BLOCK'}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Layer 1 */}
        <div>
          <h4 className="mb-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Layer 1 — 시장 전체
            <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLOR[result.layer1]}`}>
              {STATUS_ICON[result.layer1]} {result.layer1}
            </span>
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SliderField
              label="외국인 순매수 연속 (일)"
              value={input.market_foreign_days} min={-10} max={10}
              onChange={v => patch('market_foreign_days', v)}
            />
            <Toggle3Way
              label="기관 방향"
              value={input.market_institution}
              options={['buy', 'neutral', 'sell'] as const}
              labels={['매수', '중립', '매도']}
              onChange={v => patch('market_institution', v)}
            />
          </div>
        </div>

        {/* Layer 2 */}
        <div>
          <h4 className="mb-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Layer 2 — 섹터
            <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLOR[result.layer2]}`}>
              {STATUS_ICON[result.layer2]} {result.layer2}
            </span>
          </h4>
          <SliderField
            label="섹터 ETF 순유입 연속 (일)"
            value={input.sector_etf_days} min={-10} max={10}
            onChange={v => patch('sector_etf_days', v)}
          />
        </div>

        {/* Layer 3 */}
        <div>
          <h4 className="mb-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Layer 3 — 종목
            <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLOR[result.layer3]}`}>
              {STATUS_ICON[result.layer3]} {result.layer3}
            </span>
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SliderField
              label="외국인 순매수 연속 (일)"
              value={input.stock_foreign_days} min={0} max={10}
              onChange={v => patch('stock_foreign_days', v)}
            />
            <SliderField
              label="기관 누적 순매수 (주)"
              value={input.stock_institution_weeks} min={-5} max={5}
              onChange={v => patch('stock_institution_weeks', v)}
            />
            <SliderField
              label="대차잔고 / 시총 (%)"
              value={Math.round(input.short_ratio * 100)}
              min={0} max={20}
              display={`${(input.short_ratio * 100).toFixed(1)}%`}
              onChange={v => patch('short_ratio', v / 100)}
            />
            <Toggle3Way
              label="대차잔고 추세"
              value={input.short_trend}
              options={['decrease', 'stable', 'increase'] as const}
              labels={['감소', '안정', '증가']}
              onChange={v => patch('short_trend', v)}
            />
          </div>
        </div>

        {/* 매트릭스 결과 */}
        <div className="rounded-lg bg-zinc-50 px-4 py-2.5 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">2×2 매트릭스: </span>
          <span className="text-sm font-medium">{MATRIX_LABEL[result.matrix]}</span>
        </div>
      </div>
    </div>
  )
}
