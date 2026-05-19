"""Module 4 기술적 분석 Pydantic 모델."""

from __future__ import annotations

from pydantic import BaseModel


class TechnicalDataPoint(BaseModel):
    """일별 주가 데이터 포인트."""

    date: str
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: int | None = None
    change_pct: float | None = None  # 전일 대비 등락률 (%)


class TechnicalSummary(BaseModel):
    """요청 기간 전체에 대한 요약 통계."""

    start_price: float | None = None
    end_price: float | None = None
    period_return_pct: float | None = None  # (종가 - 시작가) / 시작가 * 100
    high_period: float | None = None  # 기간 내 일중 고가 최대값
    low_period: float | None = None  # 기간 내 일중 저가 최소값
    avg_volume: int | None = None  # 기간 평균 거래량


class TechnicalAnalysis(BaseModel):
    """GET /companies/{ticker}/technical 최종 응답 모델."""

    ticker: str
    market: str
    period: str
    data_points: list[TechnicalDataPoint]
    summary: TechnicalSummary
