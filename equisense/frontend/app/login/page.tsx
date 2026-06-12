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
      setError(
        msg === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : msg,
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main style={{
      display: 'flex', minHeight: '100vh',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '0 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--line-2)',
        borderRadius: 16, padding: '40px 36px',
        boxShadow: '0 4px 24px -8px rgba(0,0,0,0.10)',
      }}>
        {/* 로고 + 헤더 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <polyline points="1,10 4,6 7,8 10,3 13,5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 16, color: 'var(--ink)', letterSpacing: '-.01em',
            }}>
              EquiSense
            </span>
          </div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600,
            fontSize: 22, color: 'var(--ink)', letterSpacing: '-.02em', lineHeight: 1.2,
          }}>
            로그인
          </h1>
          <p style={{
            margin: '8px 0 0', fontSize: 13.5,
            color: 'var(--ink-3)', fontFamily: 'var(--font-ui)',
          }}>
            이메일과 비밀번호로 접속하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block', fontSize: 12.5, fontWeight: 600,
              color: 'var(--ink-2)', marginBottom: 6, fontFamily: 'var(--font-ui)',
            }}>
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 13px', fontSize: 14,
                background: 'var(--bg)', color: 'var(--ink)',
                border: '1px solid var(--line-2)',
                borderRadius: 8, outline: 'none',
                fontFamily: 'var(--font-ui)',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)' }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{
              display: 'block', fontSize: 12.5, fontWeight: 600,
              color: 'var(--ink-2)', marginBottom: 6, fontFamily: 'var(--font-ui)',
            }}>
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 13px', fontSize: 14,
                background: 'var(--bg)', color: 'var(--ink)',
                border: '1px solid var(--line-2)',
                borderRadius: 8, outline: 'none',
                fontFamily: 'var(--font-ui)',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 13px', borderRadius: 8,
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.20)',
              fontSize: 13, color: '#dc2626',
              fontFamily: 'var(--font-ui)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: 4,
              width: '100%', padding: '11px 0',
              background: isPending ? 'var(--ink-3)' : 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)', letterSpacing: '.01em',
              transition: 'opacity 0.15s',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </main>
  )
}
