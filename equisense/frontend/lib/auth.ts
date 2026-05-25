/**
 * Cognito 인증 유틸리티 — 클라이언트 전용.
 *
 * 토큰은 Amplify 기본 스토리지(localStorage)에 보관됩니다.
 * 서버 사이드 쿠키/미들웨어 없음. 모든 인증 흐름은 브라우저에서 처리합니다.
 */

import {
  fetchAuthSession,
  getCurrentUser,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from 'aws-amplify/auth'

export async function login(email: string, password: string) {
  return amplifySignIn({ username: email, password })
}

export async function logout() {
  return amplifySignOut()
}

/** Cognito ID Token을 반환합니다. 미로그인 시 null. */
export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession({ forceRefresh: false })
    return session.tokens?.idToken?.toString() ?? null
  } catch {
    return null
  }
}

/** API Gateway 호출에 사용할 Authorization 헤더를 반환합니다. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser()
    return true
  } catch {
    return false
  }
}
