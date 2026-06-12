'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/layout/AuthProvider'
import { signUp } from '@/lib/auth'

type Mode = 'login' | 'signup'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 13px', fontSize: 14,
  background: 'var(--bg)', color: 'var(--ink)',
  border: '1px solid var(--line-2)',
  borderRadius: 8, outline: 'none',
  fontFamily: 'var(--font-ui)',
  transition: 'border-color 0.15s',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 600,
  color: 'var(--ink-2)', marginBottom: 6,
  fontFamily: 'var(--font-ui)',
}

function Field({
  id, label, type, value, onChange, autoComplete,
}: {
  id: string; label: string; type: string
  value: string; onChange: (v: string) => void; autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
      <input
        id={id} type={type} autoComplete={autoComplete} required
        value={value} onChange={(e) => onChange(e.target.value)}
        style={INPUT_STYLE}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)' }}
      />
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirmPassword('')
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    if (msg.includes('Email not confirmed')) return '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인하세요.'
    if (msg.includes('User already registered')) return '이미 가입된 이메일입니다. 로그인해 주세요.'
    if (msg.includes('Password should be at least')) return '비밀번호는 최소 6자 이상이어야 합니다.'
    return msg
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsPending(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        router.replace('/')
      } else {
        await signUp(email, password)
        setSuccess('가입 확인 이메일을 발송했습니다. 받은 편지함을 확인하고 링크를 클릭해 주세요.')
      }
    } catch (err: unknown) {
      setError(translateError(err instanceof Error ? err.message : '오류가 발생했습니다.'))
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
        {/* 로고 */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polyline points="1,10 4,6 7,8 10,3 13,5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 16, color: 'var(--ink)', letterSpacing: '-.01em',
          }}>EquiSense</span>
        </div>

        {/* 탭 */}
        <div style={{
          display: 'flex', gap: 0,
          background: 'var(--surface-2)',
          borderRadius: 9, padding: 3, marginBottom: 28,
        }}>
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                all: 'unset', flex: 1, textAlign: 'center',
                padding: '8px 0', borderRadius: 7, cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 성공 메시지 */}
        {success && (
          <div style={{
            padding: '12px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(28,110,74,0.08)',
            border: '1px solid rgba(28,110,74,0.20)',
            fontSize: 13, lineHeight: 1.6, color: 'var(--accent)',
            fontFamily: 'var(--font-ui)',
          }}>
            {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field id="email" label="이메일" type="email"
              value={email} onChange={setEmail} autoComplete="email" />

            <Field id="password" label="비밀번호" type="password"
              value={password} onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

            {mode === 'signup' && (
              <Field id="confirmPassword" label="비밀번호 확인" type="password"
                value={confirmPassword} onChange={setConfirmPassword}
                autoComplete="new-password" />
            )}

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
                marginTop: 4, width: '100%', padding: '11px 0',
                background: 'var(--accent)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-ui)', letterSpacing: '.01em',
                opacity: isPending ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {isPending
                ? (mode === 'login' ? '로그인 중…' : '가입 처리 중…')
                : (mode === 'login' ? '로그인' : '가입하기')}
            </button>
          </form>
        )}

        {success && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box',
              padding: '11px 0', textAlign: 'center',
              background: 'var(--surface-2)', borderRadius: 8,
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', color: 'var(--ink-2)',
            }}
          >
            로그인으로 돌아가기
          </button>
        )}
      </div>
    </main>
  )
}
