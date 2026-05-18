export default async function TechnicalPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params

  return (
    <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-500">{ticker} — 기술적 분석</p>
        <p className="mt-1 text-xs text-zinc-400">Phase 2 Week 4에서 구현 예정</p>
      </div>
    </div>
  )
}
