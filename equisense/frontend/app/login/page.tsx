'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/layout/AuthProvider'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      await login(email, password)
      router.replace('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.'
      setError(msg)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">EquiSense</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">계정에 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-600 dark:border-zinc-700 dark:focus:border-zinc-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-600 dark:border-zinc-700 dark:focus:border-zinc-400"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </main>
  )
}
