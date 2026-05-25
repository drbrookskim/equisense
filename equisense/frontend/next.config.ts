import type { NextConfig } from 'next'

// GitHub Pages 배포 시 NEXT_PUBLIC_BASE_PATH=/equisense 처럼 설정
// 커스텀 도메인 사용 시 빈 문자열로 유지
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const config: NextConfig = {
  output: 'export',       // 순수 정적 파일 생성 — 서버 실행 환경 불필요
  trailingSlash: true,    // /login → /login/index.html (GitHub Pages 친화적)
  basePath,
  assetPrefix: basePath,
  reactCompiler: true,
  images: {
    unoptimized: true,    // export 모드에서는 Next.js 이미지 최적화 서버 없음
  },
}

export default config
