/**
 * Amplify 설정 — 반드시 앱 최초 진입 시 한 번만 호출해야 합니다 (AuthProvider에서 처리).
 *
 * NEXT_PUBLIC_ 환경변수는 빌드 시 인라인되므로 클라이언트에 안전하게 노출됩니다.
 * User Pool ID / Client ID는 공개 정보이며 비밀이 아닙니다.
 */

import { Amplify } from 'aws-amplify'

let configured = false

export function configureAmplify() {
  if (configured) return
  configured = true

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID!,
      },
    },
  })
}
