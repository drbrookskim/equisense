'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { login as doLogin, logout as doLogout } from '@/lib/auth'

const PUBLIC_PATHS = ['/login']

interface AuthState {
  isLoggedIn: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!session && !PUBLIC_PATHS.includes(pathname)) {
      router.replace('/login')
    }
    if (session && pathname === '/login') {
      router.replace('/')
    }
  }, [session, isLoading, pathname, router])

  const login = useCallback(async (email: string, password: string) => {
    await doLogin(email, password)
  }, [])

  const logout = useCallback(async () => {
    await doLogout()
    router.replace('/login')
  }, [router])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', minHeight: '100vh',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>로딩 중…</span>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
