# design-docs/db-schema.md — Neon PostgreSQL 전체 스키마

> 이 문서는 Alembic 마이그레이션(`001_initial_schema.py`)에 정의된 실제 스키마를 기준으로 합니다.
> 스키마 변경 시 반드시 Alembic 마이그레이션 스크립트와 이 문서를 함께 업데이트합니다.

---

## 1. 테이블 목록

| 테이블 | 담당 모듈 | 설명 |
|--------|----------|------|
| `users` | 공통 | 사용자 계정 |
| `companies` | 공통 | 종목 기준 정보 |
| `moat_scores` | Module 2 | 경제적 해자 차원별 점수 |
| `analysis_jobs` | Module 3 | 비동기 RAG 분석 작업 상태 |
| `qualitative_results` | Module 3 | RAG 분석 최종 결과 |

---

## 2. 테이블 상세

### users

```sql
CREATE TABLE users (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### companies

```sql
CREATE TABLE companies (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker     VARCHAR(10)  NOT NULL,
    market     VARCHAR(5)   NOT NULL CHECK (market IN ('KR', 'US')),
    name       VARCHAR(255),
    sector     VARCHAR(100),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (ticker, market)
);
```

### moat_scores

```sql
CREATE TABLE moat_scores (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker            VARCHAR(10)  NOT NULL,
    market            VARCHAR(5)   NOT NULL CHECK (market IN ('KR', 'US')),
    fiscal_year       SMALLINT     NOT NULL,
    cost_advantage    NUMERIC(4,2) NOT NULL CHECK (cost_advantage    BETWEEN 0 AND 10),
    intangible_assets NUMERIC(4,2) NOT NULL CHECK (intangible_assets BETWEEN 0 AND 10),
    switching_costs   NUMERIC(4,2) NOT NULL CHECK (switching_costs   BETWEEN 0 AND 10),
    network_effects   NUMERIC(4,2) NOT NULL CHECK (network_effects   BETWEEN 0 AND 10),
    composite_score   NUMERIC(4,2) NOT NULL,
    grade             VARCHAR(10)  NOT NULL CHECK (grade IN ('wide', 'narrow', 'none')),
    analyst_note      TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (ticker, market, fiscal_year)
);
```

**등급 기준:**
- `wide`: composite_score ≥ 7.0
- `narrow`: 4.0 ≤ composite_score < 7.0
- `none`: composite_score < 4.0

### analysis_jobs

```sql
CREATE TABLE analysis_jobs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id),
    ticker        VARCHAR(10) NOT NULL,
    market        VARCHAR(5)  NOT NULL CHECK (market IN ('KR', 'US')),
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    retry_count   SMALLINT    NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**상태 전이:** `PENDING` → `PROCESSING` → `COMPLETED` | `FAILED`

### qualitative_results

```sql
CREATE TABLE qualitative_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID        NOT NULL REFERENCES analysis_jobs(id),
    ticker          VARCHAR(10) NOT NULL,
    fiscal_period   VARCHAR(10) NOT NULL,
    integrity_score SMALLINT    CHECK (integrity_score BETWEEN 0 AND 100),
    summary_ko      TEXT,
    risk_factors    JSONB,
    growth_drivers  JSONB,
    noise_filter    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**JSONB 필드 구조 (예시):**
```json
{
  "risk_factors":   [{"title": "...", "severity": "high|medium|low", "evidence": "..."}],
  "growth_drivers": [{"title": "...", "confidence": "high|medium|low", "evidence": "..."}],
  "noise_filter":   [{"claim": "...", "verdict": "grounded|ungrounded", "basis": "..."}]
}
```

---

## 3. 인덱스

| 인덱스명 | 테이블 | 컬럼 | 용도 |
|---------|--------|------|------|
| `idx_moat_scores_ticker_market` | `moat_scores` | `(ticker, market)` | 종목별 해자 점수 조회 |
| `idx_analysis_jobs_user_status` | `analysis_jobs` | `(user_id, status)` | 사용자별 작업 상태 조회 |
| `idx_analysis_jobs_ticker_market` | `analysis_jobs` | `(ticker, market)` | 종목별 분석 이력 조회 |
| `idx_qualitative_results_ticker` | `qualitative_results` | `(ticker)` | 종목별 정성 분석 결과 조회 |

---

## 4. 재무 데이터 저장 정책

펀더멘털 지표(Module 1)는 Neon DB에 **영구 저장하지 않습니다.**
FMP API에서 조회한 원본 데이터는 Upstash Redis에 TTL 24시간으로 캐싱되며, TTL 만료 후 재요청 시 FMP에서 재조회합니다.
이는 FMP가 정기적으로 데이터를 업데이트하므로 DB를 별도로 동기화하는 복잡도를 피하기 위함입니다.
