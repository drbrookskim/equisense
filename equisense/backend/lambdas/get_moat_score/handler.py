"""GET /companies/{ticker}/moat Lambda 핸들러.

흐름: 입력 검증 → Redis 캐시 조회 → Neon DB 쿼리(캐시 미스 시) → 응답
해자 점수는 분석가가 관리하므로 캐시 TTL을 1시간으로 설정합니다.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any

from pydantic import BaseModel, ValidationError, model_validator

from core.cache import cache_get, cache_set
from core.moat.repository import get_latest_moat_score

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_KR_TICKER_RE = re.compile(r"^\d{6}$")
_US_TICKER_RE = re.compile(r"^[A-Z]{1,5}$")

MOAT_SCORE_TTL = 3_600  # 1시간 (분석가 업데이트 반영 주기)


# ---------------------------------------------------------------------------
# 요청 검증 모델
# ---------------------------------------------------------------------------


class MoatRequest(BaseModel):
    """GET /companies/{ticker}/moat 파라미터 검증 모델."""

    ticker: str
    market: str

    @model_validator(mode="after")
    def validate_ticker_format(self) -> MoatRequest:
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
# 헬퍼 함수
# ---------------------------------------------------------------------------


def _parse_request(event: dict) -> MoatRequest:
    """API Gateway 이벤트에서 파라미터를 추출하고 검증합니다."""
    path_params = event.get("pathParameters") or {}
    query_params = event.get("queryStringParameters") or {}
    return MoatRequest(
        ticker=(path_params.get("ticker") or "").strip().upper(),
        market=(query_params.get("market") or "").strip().upper(),
    )


def _ok(body: Any) -> dict:
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=str),
    }


def _error(status: int, code: str, message: str, request_id: str) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": {"code": code, "message": message, "request_id": request_id}}),
    }


# ---------------------------------------------------------------------------
# Lambda 핸들러
# ---------------------------------------------------------------------------


def lambda_handler(event: dict, context: Any) -> dict:
    """GET /companies/{ticker}/moat 요청을 처리합니다.

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

    logger.info("Moat score request: ticker=%s market=%s", params.ticker, params.market)

    # 2. 캐시 조회
    cache_key = f"moat:{params.market}:{params.ticker}"
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info("Cache hit: %s", cache_key)
        return _ok(cached)

    # 3. Neon DB 조회
    try:
        analysis = get_latest_moat_score(params.ticker, params.market)
    except Exception as e:
        logger.error("DB error for moat score %s: %s", params.ticker, e)
        return _error(503, "DB_ERROR", "Service temporarily unavailable", request_id)

    # 4. 데이터 없음
    if analysis is None:
        return _error(
            404,
            "MOAT_SCORE_NOT_FOUND",
            f"No moat score found for {params.ticker}. An analyst must submit scores first.",
            request_id,
        )

    # 5. 캐시 저장 및 응답
    payload = analysis.model_dump()
    cache_set(cache_key, payload, MOAT_SCORE_TTL)
    return _ok(payload)
