# 📈 Stock Analyzer — 기술/기본 분석 통합 대시보드

기술적 분석(차트)과 기본적 분석(재무지표)을 결합해 **매수·매도·관망** 신호와 목표가·손절가를 자동 산출하는 풀스택 주식 분석 도구입니다.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-1.39-FF4B4B?logo=streamlit&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🖥️ 스크린샷

> 다크 테마 대시보드 — 캔들차트 · RSI · MACD · 기술/기본 지표 통합 뷰

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **기술적 분석** | RSI · MACD · Bollinger Band · Stochastic · ATR · 거래량 비율 |
| **기본적 분석** | PER · PBR · ROE · 순이익률 · 매출성장률 · 부채비율 · 배당수익률 |
| **통합 의사결정** | BUY / SELL / HOLD + 신뢰도 + RR비율 |
| **목표가 / 손절가** | ATR 기반, 신호별 방향 자동 산출 |
| **한국 시장** | KOSPI / KOSDAQ 27개 종목, 섹터별 브라우저, 한글 종목명 검색 |
| **다크 UI** | 카드 기반 레이아웃 · 게이지 · 3단 차트 |

---

## 🏗️ 프로젝트 구조

```
stock_analyzer/
├── analyzer.py       # 핵심 분석 엔진 (기술적 + 기본적)
├── api.py            # FastAPI 백엔드 REST API (port 8000)
├── dashboard.py      # Streamlit 프론트엔드 대시보드 (port 8501)
└── requirements.txt  # 의존성 목록
```

---

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/drbrookskim/stock-analyzer.git
cd stock-analyzer
```

### 2. 의존성 설치

```bash
pip install -r stock_analyzer/requirements.txt
```

### 3. 서버 실행

**터미널 1 — FastAPI 백엔드:**
```bash
cd stock_analyzer
uvicorn api:app --port 8000 --reload
```

**터미널 2 — Streamlit 대시보드:**
```bash
cd stock_analyzer
streamlit run dashboard.py --server.port 8501
```

### 4. 브라우저에서 접속

| 서비스 | URL |
|--------|-----|
| 대시보드 | http://localhost:8501 |
| API 문서 | http://localhost:8000/docs |

---

## 📡 API 엔드포인트

```
POST /analyze          — 종목 분석 (ticker, period, style)
GET  /tickers/popular  — 인기 종목 목록
GET  /tickers/kr       — 한국 섹터별 종목 목록
GET  /search/kr?q=종목명 — 한글 종목명 검색
GET  /health           — 서버 상태 확인
```

### 분석 요청 예시

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"ticker": "005930.KS", "period": "6mo", "style": "balanced"}'
```

---

## ⚙️ 분석 알고리즘

### 기술적 분석 (기본 가중치 60%)

```
신호 점수 = MACD(25%) + RSI(20%) + Bollinger Band(20%)
          + Stochastic(15%) + 거래량(20%)
```

### 기본적 분석 (기본 가중치 40%)

```
신호 점수 = 밸류에이션(30%) + 수익성(25%)
          + 성장성(25%) + 재무건전성(20%)
```

### 투자 스타일별 가중치

| 스타일 | 기술적 | 기본적 |
|--------|--------|--------|
| 단기   | 75%    | 25%    |
| 균형   | 60%    | 40%    |
| 장기   | 35%    | 65%    |

### 목표가 / 손절가 (ATR 기반)

| 신호 | 목표가 | 손절가 |
|------|--------|--------|
| BUY  | 현재가 + ATR × 2.5 | 현재가 − ATR × 1.0 |
| SELL | 현재가 − ATR × 2.5 | 현재가 + ATR × 1.0 |
| HOLD | 현재가 + ATR × 1.5 (저항) | 현재가 − ATR × 1.0 (지지) |

---

## 🇰🇷 지원 한국 종목 (27개)

**KOSPI:** 반도체 · 2차전지 · 자동차 · 바이오 · 금융 · 소비재 · 철강/에너지

**KOSDAQ:** 반도체/장비 · 바이오 · IT/소프트웨어 · 2차전지소재

---

## 📦 주요 의존성

```
fastapi      uvicorn     streamlit
pandas       numpy       plotly
yfinance     httpx       pydantic
```

---

## ⚠️ 면책 조항

이 도구는 **교육 및 참고 목적**으로만 제공됩니다. 실제 투자 결정에 대한 책임은 사용자 본인에게 있으며, 투자 손실에 대해 책임지지 않습니다.

---

## 📄 License

MIT License © 2026 drbrookskim
