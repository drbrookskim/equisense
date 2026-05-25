'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * GitHub Pages SPA 라우팅 복원.
 * 404.html이 sessionStorage에 저장한 경로를 읽어 클라이언트 라우터로 복원합니다.
 */
export default function SpaRedirectScript() {
  const router = useRouter()

  useEffect(() => {
    const redirect = sessionStorage.getItem('spa_redirect')
    if (redirect) {
      sessionStorage.removeItem('spa_redirect')
      router.replace(redirect)
    }
  }, [router])

  return null
}
