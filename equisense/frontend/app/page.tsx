import Header from '@/components/layout/Header'

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-bold tracking-tight">4단계 주식 분석</h1>
        <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
          종목코드를 입력하면 펀더멘털 · 해자 · 정성적 · 기술적 분석 결과를 확인할 수 있습니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
          {MODULES.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="text-2xl">{m.icon}</div>
              <div className="mt-1 text-sm font-medium">{m.label}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{m.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}

const MODULES = [
  { icon: '📊', label: '펀더멘털', desc: '3대 재무제표 · 핵심 지표' },
  { icon: '🏰', label: '해자', desc: '경쟁 우위 · 지속 가능성' },
  { icon: '🔍', label: '정성적 분석', desc: 'AI 기반 경영진 평가' },
  { icon: '📈', label: '기술적 분석', desc: '주가 차트 · 모멘텀' },
]
