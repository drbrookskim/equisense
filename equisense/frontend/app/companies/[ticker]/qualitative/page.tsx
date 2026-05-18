export default async function QualitativePage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params

  return (
    <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-500">{ticker} — 정성적 분석</p>
        <p className="mt-1 text-xs text-zinc-400">Phase 3에서 구현 예정 (RAG 파이프라인)</p>
      </div>
    </div>
  )
}
