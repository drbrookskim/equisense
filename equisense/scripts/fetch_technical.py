"""
FMP API로 주가 이력 데이터를 가져와 JSON으로 저장합니다.
출력: frontend/public/data/technical/{ticker}_{market}_{period}.json
"""

import json
import os
import time
from datetime import date, timedelta
from pathlib import Path

import requests

FMP_API_KEY = os.environ["FMP_API_KEY"]
BASE_URL = "https://financialmodelingprep.com/api/v3"
OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data" / "technical"
WATCHLIST_PATH = Path(__file__).parent.parent / "frontend" / "public" / "data" / "watchlist.json"

PERIODS: dict[str, int] = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 1095,
}


def _get(path: str, params: dict | None = None) -> list | None:
    params = params or {}
    params["apikey"] = FMP_API_KEY
    for attempt in range(3):
        try:
            r = requests.get(f"{BASE_URL}{path}", params=params, timeout=20)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            if attempt == 2:
                print(f"  [ERR] {path}: {e}")
                return None
            time.sleep(2 ** attempt)
    return None


def fetch(ticker: str, market: str, period: str) -> dict | None:
    fmp_ticker = ticker if market == "US" else f"{ticker}.KS"
    days = PERIODS[period]
    from_date = (date.today() - timedelta(days=days)).isoformat()

    raw = _get(f"/historical-price-full/{fmp_ticker}", {"from": from_date, "serietype": "line"})
    if not raw or "historical" not in raw:
        return None

    historical = sorted(raw["historical"], key=lambda x: x["date"])

    data_points = [
        {
            "date": d["date"],
            "open": d.get("open"),
            "high": d.get("high"),
            "low": d.get("low"),
            "close": d.get("close"),
            "volume": d.get("volume"),
            "change_pct": round(d.get("changePercent", 0), 4),
        }
        for d in historical
    ]

    if not data_points:
        return None

    closes = [p["close"] for p in data_points if p["close"]]
    volumes = [p["volume"] for p in data_points if p["volume"]]

    summary = {
        "start_price": data_points[0]["close"],
        "end_price": data_points[-1]["close"],
        "period_return_pct": (
            round((data_points[-1]["close"] / data_points[0]["close"] - 1) * 100, 2)
            if data_points[0]["close"]
            else None
        ),
        "high_period": max(closes) if closes else None,
        "low_period": min(closes) if closes else None,
        "avg_volume": round(sum(volumes) / len(volumes)) if volumes else None,
    }

    return {
        "ticker": ticker,
        "market": market,
        "period": period,
        "data_points": data_points,
        "summary": summary,
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    watchlist = json.loads(WATCHLIST_PATH.read_text())

    for company in watchlist["companies"]:
        ticker, market = company["ticker"], company["market"]
        for period in PERIODS:
            print(f"Fetching technical: {ticker} ({market}) {period}")
            data = fetch(ticker, market, period)
            if data:
                out = OUT_DIR / f"{ticker}_{market}_{period}.json"
                out.write_text(json.dumps(data, ensure_ascii=False, indent=2))
                print(f"  -> saved {out.name}")
            else:
                print(f"  -> FAILED")
            time.sleep(0.5)


if __name__ == "__main__":
    main()
