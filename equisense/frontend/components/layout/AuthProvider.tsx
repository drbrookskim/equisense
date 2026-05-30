'use client'

/**
 * AuthProvider — Amplify 초기화 + 인증 상태 컨텍스트.
 *
 * 서버 사이드 미들웨어 없음. 클라이언트에서 직접 Cognito 세션을 확인하고,
 * 미인증 상태이면 /login으로 리다이렉트합니다.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { configureAmplify } from '@/lib/auth-config'
import { isAuthenticated, login as doLogin, logout as doLogout } from '@/lib/auth'

configureAmplify()

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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // TODO: 인증 활성화 시 아래 주석 해제
    // isAuthenticated().then((authed) => {
    //   setIsLoggedIn(authed)
    //   setIsLoading(false)
    //   if (!authed && !PUBLIC_PATHS.includes(pathname)) {
    //     router.replace(`/login`)
    //   }
    // })
    setIsLoading(false)
  }, [pathname, router])

  const login = useCallback(async (email: string, password: string) => {
    await doLogin(email, password)
    setIsLoggedIn(true)
  }, [])

  const logout = useCallback(async () => {
    await doLogout()
    setIsLoggedIn(false)
    router.replace('/login')
  }, [router])

  // 인증 확인 중에는 보호된 경로 렌더링 차단
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-zinc-400">로딩 중…</span>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
