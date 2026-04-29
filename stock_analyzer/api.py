"""
FastAPI Backend — Stock Analysis REST API
Run: uvicorn api:app --reload --port 8000
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import math, json
import yfinance as yf
import pandas as pd
try:
    from analyzer import TechnicalAnalyzer, FundamentalAnalyzer, DecisionEngine
except ImportError:
    from stock_analyzer.analyzer import TechnicalAnalyzer, FundamentalAnalyzer, DecisionEngine


def _sanitize(obj):
    """NaN / Inf → None, Timestamp → str 재귀 변환"""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    # pandas Timestamp
    try:
        import pandas as pd
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
    except Exception:
        pass
    return obj

app = FastAPI(title="Stock Analyzer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    ticker: str
    period: str = "6mo"       # 1mo 3mo 6mo 1y 2y
    style:  str = "balanced"  # short_term balanced long_term


STYLE_WEIGHTS = {
    "short_term": (0.75, 0.25),
    "balanced":   (0.60, 0.40),
    "long_term":  (0.35, 0.65),
}


@app.get("/")
def root():
    return {"status": "ok", "message": "Stock Analyzer API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    ticker = req.ticker.upper().strip()
    tw, fw = STYLE_WEIGHTS.get(req.style, (0.6, 0.4))

    try:
        t = yf.Ticker(ticker)
        df = t.history(period=req.period)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for ticker '{ticker}'")

        # 마지막 행이 NaN(장중 미확정)인 경우 제거
        df = df.dropna(subset=['Close', 'Open', 'High', 'Low'])
        if df.empty:
            raise HTTPException(status_code=404, detail=f"유효한 가격 데이터가 없습니다: '{ticker}'")

        info = t.info or {}
        current_price = float(df['Close'].iloc[-1])

        tech = TechnicalAnalyzer(df).analyze()
        fund = FundamentalAnalyzer(info, current_price).analyze()
        decision = DecisionEngine(tw, fw).decide(tech, fund, current_price)

        payload = {
            "ticker":        ticker,
            "current_price": current_price,
            "currency":      info.get("currency", "USD"),
            "company_name":  info.get("longName", ticker),
            "sector":        info.get("sector", "N/A"),
            "decision": {
                "action":             decision.action,
                "confidence":         decision.confidence,
                "entry_price":        decision.entry_price,
                "target_price":       decision.target_price,
                "stop_loss":          decision.stop_loss,
                "risk_reward_ratio":  decision.risk_reward_ratio,
                "tech_score":         decision.tech_score,
                "fund_score":         decision.fund_score,
                "combined_score":     decision.combined_score,
                "reasoning":          decision.reasoning,
            },
            "technical": {
                "signal":       tech.signal.name,
                "score":        tech.score,
                "confidence":   tech.confidence,
                "target_price": tech.target_price,
                "stop_loss":    tech.stop_loss,
                "indicators":   tech.indicators,
            },
            "fundamental": {
                "signal":          fund.signal.name,
                "score":           fund.score,
                "confidence":      fund.confidence,
                "intrinsic_value": fund.intrinsic_value,
                "metrics":         fund.metrics,
            },
            "ohlcv": (
                df[['Open','High','Low','Close','Volume']]
                .tail(120)
                .reset_index()
                .rename(columns={"Date": "Datetime", "index": "Datetime"})
                .to_dict(orient="records")
            ),
        }
        return JSONResponse(content=json.loads(json.dumps(_sanitize(payload), default=str)))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tickers/popular")
def popular_tickers():
    return {
        "us":  ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"],
        "kr":  ["005930.KS", "000660.KS", "035420.KS", "051910.KS"],
        "etf": ["SPY", "QQQ", "ARKK", "VTI"],
    }


# ── 한국 시장 종목 DB ──────────────────────────────────────────────────────────
KR_STOCKS = {
    "KOSPI": {
        "반도체": [
            ("삼성전자",   "005930.KS"),
            ("SK하이닉스", "000660.KS"),
            ("삼성전기",   "009150.KS"),
        ],
        "2차전지": [
            ("LG에너지솔루션", "373220.KS"),
            ("삼성SDI",        "006400.KS"),
            ("LG화학",         "051910.KS"),
            ("포스코퓨처엠",   "003670.KS"),
        ],
        "자동차": [
            ("현대차",   "005380.KS"),
            ("기아",     "000270.KS"),
            ("현대모비스","012330.KS"),
        ],
        "바이오/제약": [
            ("삼성바이오로직스", "207940.KS"),
            ("셀트리온",         "068270.KS"),
        ],
        "금융": [
            ("KB금융",   "105560.KS"),
            ("신한지주", "055550.KS"),
            ("하나금융지주","086790.KS"),
        ],
        "소비재/유통": [
            ("NAVER",    "035420.KS"),
            ("카카오",   "035720.KS"),
            ("LG생활건강","051900.KS"),
        ],
        "철강/에너지": [
            ("POSCO홀딩스","005490.KS"),
            ("한국전력",   "015760.KS"),
        ],
    },
    "KOSDAQ": {
        "반도체/장비": [
            ("에코프로비엠", "247540.KQ"),
            ("에코프로",     "086520.KQ"),
            ("리노공업",     "058470.KQ"),
            ("HPSP",         "403870.KQ"),
        ],
        "바이오": [
            ("알테오젠",   "196170.KQ"),
            ("HLB",        "028300.KQ"),
            ("클래시스",   "214150.KQ"),
        ],
        "IT/소프트웨어": [
            ("카카오게임즈","293490.KQ"),
            ("펄어비스",   "263750.KQ"),
            ("크래프톤",   "259960.KS"),  # 코스피 상장
        ],
        "2차전지소재": [
            ("천보",       "278280.KQ"),
            ("엔켐",       "348370.KQ"),
        ],
    },
}


@app.get("/tickers/kr")
def kr_tickers():
    """코스피/코스닥 섹터별 종목 목록"""
    result = {}
    for market, sectors in KR_STOCKS.items():
        result[market] = {}
        for sector, stocks in sectors.items():
            result[market][sector] = [
                {"name": name, "ticker": ticker} for name, ticker in stocks
            ]
    return result


@app.get("/search/kr")
def search_kr(q: str):
    """한국 종목명으로 티커 검색"""
    q = q.strip()
    matches = []
    for market, sectors in KR_STOCKS.items():
        for sector, stocks in sectors.items():
            for name, ticker in stocks:
                if q in name or q.upper() in ticker.upper():
                    matches.append({
                        "name": name,
                        "ticker": ticker,
                        "market": market,
                        "sector": sector,
                    })
    return {"results": matches}
