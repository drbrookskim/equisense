"""GET /companies/{ticker}/fundamentals Lambda 핸들러.

흐름: 입력 검증 → Redis 캐시 조회 → FMP API 호출(캐시 미스 시) → 지표 계산 → 캐시 저장 → 응답
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError, model_validator

from core.cache import FINANCIAL_DATA_TTL, cache_get, cache_set
from core.external.fmp import (
    ExternalAPIError,
    fetch_balance_sheets,
    fetch_cash_flow_statements,
    fetch_income_statements,
)
from core.external.normalizer import normalize_all
from core.fundamental import analyze_fundamentals
from core.fundamental.models import BalanceSheet, CashFlowStatement, IncomeStatement

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_KR_TICKER_RE = re.compile(r"^\d{6}$")
_US_TICKER_RE = re.compile(r"^[A-Z]{1,5}$")

STATEMENTS_LIMIT = 5  # 최근 5개 회계연도


# ---------------------------------------------------------------------------
# 요청 검증 모델
# ---------------------------------------------------------------------------


class FundamentalsRequest(BaseModel):
    """API Gateway 경로/쿼리 파라미터 입력 검증 모델."""

    ticker: str
    market: str  # 'KR' | 'US'

    @model_validator(mode="after")
    def validate_ticker_format(self) -> FundamentalsRequest:
        """시장 유형에 맞는 티커 형식을 검증합니다."""
        if self.market == "KR":
            if not _KR_TICKER_RE.match(self.ticker):
                raise ValueError("KR 종목코드는 6자리 숫자여야 합니다 (예: 005930)")
        elif self.market == "US":
            if not _US_TICKER_RE.match(self.ticker):
                raise ValueError("US 티커는 1~5자리 대문자 영문이어야 합니다 (예: AAPL)")
        else:
            raise ValueError("market은 'KR' 또는 'US'여야 합니다")
        return self


# ---------------------------------------------------------------------------
# 내부 데이터 컨테이너
# ---------------------------------------------------------------------------


@dataclass
class RawStatements:
    """FMP에서 가져온 정규화 완료된 3대 재무제표."""

    income_statements: list[IncomeStatement]
    balance_sheets: list[BalanceSheet]
    cash_flow_statements: list[CashFlowStatement]


# ---------------------------------------------------------------------------
# 헬퍼 함수
# ---------------------------------------------------------------------------


def _parse_request(event: dict) -> FundamentalsRequest:
    """API Gateway 이벤트에서 파라미터를 추출하고 Pydantic으로 검증합니다.

    Raises:
        ValidationError: 입력값이 유효하지 않을 때
    """
    path_params = event.get("pathParameters") or {}
    query_params = event.get("queryStringParameters") or {}
    return FundamentalsRequest(
        ticker=(path_params.get("ticker") or "").strip().upper(),
        market=(query_params.get("market") or "").strip().upper(),
    )


def _fetch_and_normalize(ticker: str, market: str) -> RawStatements:
    """FMP에서 3대 재무제표를 조회하고 내부 모델로 정규화합니다.

    Raises:
        ExternalAPIError: FMP 호출이 재시도 횟수 초과 후에도 실패하면 발생
    """
    raw_incomes = fetch_income_statements(ticker, market, limit=STATEMENTS_LIMIT)
    raw_balances = fetch_balance_sheets(ticker, market, limit=STATEMENTS_LIMIT)
    raw_cfs = fetch_cash_flow_statements(ticker, market, limit=STATEMENTS_LIMIT)
    incomes, balances, cfs = normalize_all(raw_incomes, raw_balances, raw_cfs)
    return RawStatements(
        income_statements=incomes, balance_sheets=balances, cash_flow_statements=cfs
    )


def _ok(body: Any) -> dict:
    """200 OK API Gateway 응답을 생성합니다."""
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=str),
    }


def _error(status: int, code: str, message: str, request_id: str) -> dict:
    """표준 에러 스키마로 API Gateway 응답을 생성합니다."""
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": {"code": code, "message": message, "request_id": request_id}}),
    }


# ---------------------------------------------------------------------------
# Lambda 핸들러
# ---------------------------------------------------------------------------


def lambda_handler(event: dict, context: Any) -> dict:
    """GET /companies/{ticker}/fundamentals 요청을 처리합니다.

    Args:
        event: API Gateway 프록시 이벤트
        context: Lambda 실행 컨텍스트

    Returns:
        API Gateway 프록시 응답 (statusCode, headers, body)
    """
    request_id = getattr(context, "aws_request_id", str(uuid.uuid4()))

    # 1. 입력 검증
    try:
        params = _parse_request(event)
    except (ValidationError, Exception) as e:
        return _error(400, "INVALID_PARAMS", str(e), request_id)

    logger.info("Fundamentals request: ticker=%s market=%s", params.ticker, params.market)

    # 2. 캐시 조회
    cache_key = f"fundamentals:{params.market}:{params.ticker}"
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info("Cache hit: %s", cache_key)
        return _ok(cached)

    # 3. 외부 API 호출 (지수 백오프 재시도는 fmp.py 내부에서 처리)
    try:
        raw = _fetch_and_normalize(params.ticker, params.market)
    except ExternalAPIError as e:
        logger.error("FMP API error for %s: %s", params.ticker, e)
        return _error(503, "EXTERNAL_API_ERROR", "Service temporarily unavailable", request_id)

    # 4. 데이터 존재 확인 (알 수 없는 티커)
    if not raw.income_statements:
        return _error(
            404, "TICKER_NOT_FOUND", f"No financial data found for {params.ticker}", request_id
        )

    # 5. 핵심 지표 계산
    analysis = analyze_fundamentals(
        income_statements=raw.income_statements,
        balance_sheets=raw.balance_sheets,
        cash_flow_statements=raw.cash_flow_statements,
        ticker=params.ticker,
        market=params.market,
    )

    # 6. 캐시 저장 및 응답
    payload = analysis.model_dump()
    cache_set(cache_key, payload, FINANCIAL_DATA_TTL)
    return _ok(payload)
