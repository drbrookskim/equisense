# 프로젝트 구조

이 저장소에는 **두 개의 독립된 프로젝트**가 공존합니다.

---

## ✅ signnith (루트)

주식 분석 서비스. 루트에 위치한 파일 전체가 signnith에 해당합니다.

| 파일 / 폴더 | 설명 |
|-------------|------|
| `index.html` | 메인 페이지 (종목 분석) |
| `archive.html` | 아카이브 페이지 (저장된 리포트 관리) |
| `report.html` | 리포트 페이지 (분석 결과 상세) |
| `assets/` | 로고 등 정적 에셋 |
| `stock_analyzer/` | 백엔드 Python 분석 모듈 |
| `particle-network/` | 배경 파티클 이펙트 |
| `chart_patterns_analysis_v2.md` | 차트 패턴 분석 문서 |

**배포**: GitHub Pages → `https://drbrookskim.github.io/signnith/`

---

## ❌ equisense (별도 프로젝트)

`equisense/` 폴더는 signnith와 **완전히 별개인 독립 프로젝트**입니다.

- 이 폴더의 파일은 **읽기·수정·push 일절 금지**
- signnith 작업 시 equisense 폴더는 무시할 것
