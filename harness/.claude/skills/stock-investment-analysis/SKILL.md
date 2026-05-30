---
name: stock-investment-analysis
description: |
  주식 종목 투자 분석 오케스트레이터. 재무제표, CEO/경영진 성향, 산업 트렌드를 종합 분석하여
  매수 시점·매도 시점·보유 기간·목표 주가를 포함한 투자 전략 리포트를 생성한다.
  
  다음 요청이 들어오면 반드시 이 스킬을 사용하라:
  - "종목 분석", "주식 분석", "기업 분석", "투자 분석"
  - "매수 시점", "매도 시점", "매수 타이밍", "매도 타이밍", "언제 사야"
  - "보유 기간", "얼마나 들고 있어야"
  - "재무제표 분석", "CEO 분석", "경영진 분석", "산업 분석", "섹터 분석"
  - "투자 리포트", "종목 리포트", "투자 의견", "종목 추천"
  - "삼성전자 분석해줘", "AAPL 투자 어떻게 생각해" 같은 특정 종목 언급 + 분석/투자 요청
  - 기존 분석 재실행: "다시 분석", "업데이트", "최신 데이터로", "이전 결과 개선"
---

# 주식 종목 투자 분석 오케스트레이터

## 실행 모드
**하이브리드**: Phase 2는 병렬 서브 에이전트, Phase 3은 순차 서브 에이전트

---

## Phase 0: 컨텍스트 확인

작업 시작 전 기존 산출물 존재 여부를 확인하여 실행 모드를 결정한다.

1. `_workspace/` 디렉토리 존재 여부 확인
2. 분기:
   - `_workspace/` 없음 → **초기 실행** (Phase 1부터 전체 실행)
   - `_workspace/` 있음 + 사용자가 "다시", "업데이트", "최신", "개선" 요청 → **부분 재실행** (변경 필요 에이전트만 재호출)
   - `_workspace/` 있음 + 새 종목 요청 → **새 실행** (기존 `_workspace/`를 `_workspace_prev/`로 이동 후 새 실행)

---

## Phase 1: 분석 대상 파악

사용자에게 다음 정보를 확인한다. 이미 요청에 포함된 정보는 재질문하지 않는다.

**필수 정보:**
- 종목명 또는 티커 코드
- 시장 구분: 한국(KR) / 미국(US)

**선택 정보 (없으면 스스로 조회):**
- 산업/섹터
- CEO 이름

정보 확인 후 다음을 출력한다:
```
분석 대상: {회사명} ({ticker}) — {시장}
분석 항목: 재무제표 · 경영진 · 산업 트렌드 · 투자 전략
예상 소요 시간: 약 3~5분
```

---

## Phase 2: 병렬 데이터 수집 (서브 에이전트 모드)

**실행 모드: 병렬 서브 에이전트 (run_in_background: true)**

재무분석가, 경영진분석가, 산업분석가를 동시에 실행한다. 세 에이전트는 독립적이며 서로 의존하지 않는다.

### 에이전트 실행 방법

각 에이전트를 `Agent` 도구로 호출한다. `subagent_type`은 `general-purpose`, `model`은 `opus`로 설정한다. 세 호출을 **단일 메시지에서 동시에** 실행한다.

**financial-analyst 프롬프트 템플릿:**
```
당신은 financial-analyst 에이전트입니다. 에이전트 정의는 .claude/agents/financial-analyst.md를 참조하라.

분석 대상:
- 회사명: {company_name}
- 티커: {ticker}
- 시장: {market} (KR 또는 US)
- 분석 기간: 최근 3년

한국 주식이면 opendart MCP 도구를 사용하고, 미국 주식이면 UsStockInfo MCP 도구를 사용한다.
산출물을 _workspace/01_financial_report.md에 저장하고, 완료 시 종합 재무 점수를 보고하라.
```

**leadership-analyst 프롬프트 템플릿:**
```
당신은 leadership-analyst 에이전트입니다. 에이전트 정의는 .claude/agents/leadership-analyst.md를 참조하라.

분석 대상:
- 회사명: {company_name}
- 티커: {ticker}
- 시장: {market}
- CEO명: {ceo_name} (모르면 직접 검색)

한국 주식이면 NaverSearch + opendart를 사용하고, 미국 주식이면 WebSearch + UsStockInfo를 사용한다.
산출물을 _workspace/02_leadership_report.md에 저장하고, 완료 시 리더십 품질 점수를 보고하라.
```

**industry-analyst 프롬프트 템플릿:**
```
당신은 industry-analyst 에이전트입니다. 에이전트 정의는 .claude/agents/industry-analyst.md를 참조하라.

분석 대상:
- 회사명: {company_name}
- 티커: {ticker}
- 시장: {market}
- 산업/섹터: {industry_sector} (모르면 직접 조회)

NaverSearch (datalab), 산업 리포트 WebSearch, UsStockInfo를 활용한다.
산출물을 _workspace/03_industry_report.md에 저장하고, 완료 시 산업 매력도 점수를 보고하라.
```

### Phase 2 완료 기준
세 에이전트 모두 완료 보고 후 다음을 확인한다:
- `_workspace/01_financial_report.md` 존재
- `_workspace/02_leadership_report.md` 존재
- `_workspace/03_industry_report.md` 존재

누락 파일이 있으면 해당 에이전트를 단독으로 재실행한다 (1회).

---

## Phase 3: 투자 전략 종합 (서브 에이전트 모드)

**실행 모드: 단일 순차 서브 에이전트**

모든 분석 리포트가 준비되면 investment-strategist를 실행한다.

**investment-strategist 프롬프트 템플릿:**
```
당신은 investment-strategist 에이전트입니다. 에이전트 정의는 .claude/agents/investment-strategist.md를 참조하라.

분석 대상:
- 회사명: {company_name}
- 티커: {ticker}
- 시장: {market}

_workspace/ 디렉토리의 다음 파일을 모두 읽고 종합 분석을 시작하라:
- 01_financial_report.md
- 02_leadership_report.md
- 03_industry_report.md

UsStockInfo (get_historical_stock_prices) 또는 WebSearch로 최근 1년 가격 데이터를 추가로 수집하라.

최종 투자 전략 리포트를 다음 두 곳에 저장하라:
1. _workspace/04_investment_strategy.md
2. investment_report_{ticker}_{YYYYMMDD}.md (오늘 날짜 사용)

완료 시 종합 투자 의견과 최종 파일 경로를 보고하라.
```

---

## Phase 4: 최종 보고

사용자에게 결과를 요약 보고한다:

```
## 분석 완료: {회사명} ({ticker})

**종합 투자 의견: [Strong Buy / Buy / Hold / Sell / Strong Sell] (XX/100)**

| 분석 영역 | 점수 |
|----------|------|
| 재무 건전성 | XX/100 |
| 경영진 품질 | XX/100 |
| 산업 매력도 | XX/100 |
| **종합** | **XX/100** |

**핵심 요약:** (2~3문장)

**전체 리포트:** `investment_report_{ticker}_{날짜}.md`
```

추가로 사용자에게 피드백을 요청한다:
"특정 분석 영역을 더 깊이 파고들거나, 다른 시나리오를 검토할까요?"

---

## 에러 핸들링

| 상황 | 대응 |
|------|------|
| 에이전트 1개 실패 | 1회 재실행, 재실패 시 "분석 불가" 명시하고 나머지 2개로 진행 |
| 모든 에이전트 실패 | 사용자에게 보고, MCP 연결 상태 점검 요청 |
| 데이터 불일치 | 가장 최신 출처 우선, 출처 병기 |
| 부분 재실행 | 사용자가 요청한 영역의 에이전트만 재실행, 나머지는 기존 파일 사용 |

---

## 테스트 시나리오

**정상 흐름:**
1. 사용자: "삼성전자 분석해줘"
2. Phase 0: _workspace 없음 → 초기 실행
3. Phase 1: 시장=KR, ticker=005930 확인
4. Phase 2: 3개 에이전트 병렬 실행 → _workspace/ 파일 3개 생성
5. Phase 3: investment-strategist 실행 → investment_report_005930_20260531.md 생성
6. Phase 4: 종합 의견 보고

**에러 흐름:**
1. Phase 2에서 leadership-analyst 실패
2. 1회 재실행 → 성공 시 계속, 재실패 시 "경영진 분석 데이터 없음" 명시
3. 나머지 2개 리포트로 investment-strategist 실행 (누락 항목 명시)
