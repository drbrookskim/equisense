"""
FMP API로 재무제표 데이터를 가져와 JSON으로 저장합니다.
출력: frontend/public/data/fundamentals/{ticker}_{market}.json
"""

import json
import os
import time
from pathlib import Path

import requests

FMP_API_KEY = os.environ["FMP_API_KEY"]
BASE_URL = "https://financialmodelingprep.com/api/v3"
OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data" / "fundamentals"
WATCHLIST_PATH = Path(__file__).parent.parent / "frontend" / "public" / "data" / "watchlist.json"
YEARS = 5


def _get(path: str, params: dict | None = None) -> dict | list | None:
    params = params or {}
    params["apikey"] = FMP_API_KEY
    for attempt in range(3):
        try:
            r = requests.get(f"{BASE_URL}{path}", params=params, timeout=15)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            if attempt == 2:
                print(f"  [ERR] {path}: {e}")
                return None
            time.sleep(2 ** attempt)
    return None


def _safe_div(a, b) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return round(a / b * 100, 2)


def _cagr(start, end, years) -> float | None:
    if not start or not end or start <= 0 or years <= 0:
        return None
    return round(((end / start) ** (1 / years) - 1) * 100, 2)


def fetch(ticker: str, market: str) -> dict | None:
    fmp_ticker = ticker if market == "US" else f"{ticker}.KS"

    income = _get(f"/income-statement/{fmp_ticker}", {"limit": YEARS})
    balance = _get(f"/balance-sheet-statement/{fmp_ticker}", {"limit": YEARS})
    cashflow = _get(f"/cash-flow-statement/{fmp_ticker}", {"limit": YEARS})
    ratios = _get(f"/ratios/{fmp_ticker}", {"limit": YEARS})

    if not income or not balance or not cashflow:
        return None

    metrics_by_year = []
    for i in range(min(YEARS, len(income))):
        inc = income[i] if i < len(income) else {}
        bal = balance[i] if i < len(balance) else {}
        cf = cashflow[i] if i < len(cashflow) else {}
        rat = ratios[i] if ratios and i < len(ratios) else {}

        net_income = inc.get("netIncome")
        equity = bal.get("totalStockholdersEquity")
        total_assets = bal.get("totalAssets")
        total_debt = bal.get("totalDebt")
        revenue = inc.get("revenue")
        operating_income = inc.get("operatingIncome")
        capex = cf.get("capitalExpenditure", 0) or 0
        op_cf = cf.get("operatingCashFlow")
        fcf = (op_cf + capex) if op_cf is not None else None

        metrics_by_year.append({
            "fiscal_year": int(str(inc.get("date", "0"))[:4]),
            "roe": _safe_div(net_income, equity),
            "roa": _safe_div(net_income, total_assets),
            "debt_ratio": _safe_div(total_debt, equity),
            "operating_margin": _safe_div(operating_income, revenue),
            "fcf": round(fcf / 1_000_000, 1) if fcf else None,
            "per": rat.get("priceEarningsRatio"),
            "pbr": rat.get("priceToBookRatio"),
        })

    metrics_by_year.sort(key=lambda x: x["fiscal_year"])

    def build_trend(metric_name: str, values: list[float | None]) -> dict:
        pairs = [(metrics_by_year[i]["fiscal_year"], v) for i, v in enumerate(values) if v is not None]
        if not pairs:
            return {"metric_name": metric_name, "values": [], "cagr": None, "direction": "stable", "yoy_changes": []}

        yoy = []
        for j in range(len(pairs)):
            yr, val = pairs[j]
            if j == 0:
                yoy.append([yr, None])
            else:
                prev = pairs[j - 1][1]
                chg = round((val - prev) / abs(prev) * 100, 2) if prev else None
                yoy.append([yr, chg])

        direction = "stable"
        if len(pairs) >= 2:
            positives = sum(1 for _, c in yoy if c and c > 0)
            negatives = sum(1 for _, c in yoy if c and c < 0)
            if positives > negatives:
                direction = "improving"
            elif negatives > positives:
                direction = "deteriorating"

        cagr = _cagr(pairs[0][1], pairs[-1][1], len(pairs) - 1) if len(pairs) >= 2 else None

        return {
            "metric_name": metric_name,
            "values": pairs,
            "cagr": cagr,
            "direction": direction,
            "yoy_changes": yoy,
        }

    trend_keys = ["roe", "roa", "debt_ratio", "operating_margin", "fcf"]
    trends = {
        k: build_trend(k, [m[k] for m in metrics_by_year])
        for k in trend_keys
    }

    return {"ticker": ticker, "market": market, "metrics_by_year": metrics_by_year, "trends": trends}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    watchlist = json.loads(WATCHLIST_PATH.read_text())

    for company in watchlist["companies"]:
        ticker, market = company["ticker"], company["market"]
        print(f"Fetching fundamentals: {ticker} ({market})")
        data = fetch(ticker, market)
        if data:
            out = OUT_DIR / f"{ticker}_{market}.json"
            out.write_text(json.dumps(data, ensure_ascii=False, indent=2))
            print(f"  -> saved {out.name}")
        else:
            print(f"  -> FAILED")
        time.sleep(1)


if __name__ == "__main__":
    main()
