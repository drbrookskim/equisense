---
name: stock-analysis-master
description: >
  종합 주식 분석 스킬. 실시간 OHLCV 데이터 수집(pykrx/yfinance)부터
  캔들 패턴·엘리어트 파동·이치모쿠·SMC 기술적 분석, 팩터/ML 퀀트 전략,
  밸류에이션·실적 예측 펀더멘털 분석, 매크로 리스크까지 한 번에 실행하는
  통합 파이프라인. Claude Code 환경에서 단일 명령으로 전체 분석 리포트를 생성한다.
category: composite-strategy
version: 1.0.0
---

# Stock Analysis Master Skill

## 아키텍처 개요

```
[1] DATA LAYER        pykrx / yfinance → OHLCV + 재무 데이터
        ↓
[2] TECHNICAL LAYER   Candlestick · Elliott Wave · Ichimoku · SMC
        ↓
[3] QUANT LAYER       Multi-Factor · ML Strategy · Factor Research
        ↓
[4] FUNDAMENTAL LAYER Valuation · Earnings Forecast · Dividend · Credit
        ↓
[5] MACRO LAYER       Macro Analysis · Global Macro · ETF Flow
        ↓
[6] SIGNAL FUSION     레이어별 점수 집계 → 종합 매매 시그널 + 진입 가격
        ↓
[7] OUTPUT            콘솔 리포트 · CSV · (선택) HTML 차트
```

---

## 레이어 1 — 데이터 수집

### 의존 패키지
```bash
pip install pykrx yfinance pandas numpy pandas-ta requests
```

### 표준 OHLCV 로더

```python
# data_loader.py
import pandas as pd
from pykrx import stock as krx
import yfinance as yf
from datetime import datetime, timedelta

def load_ohlcv(ticker: str, days: int = 365) -> pd.DataFrame:
    """
    ticker: KRX 6자리(예: '042700') 또는 Yahoo 심볼(예: '005930.KS')
    반환: DatetimeIndex DataFrame with columns [Open, High, Low, Close, Volume]
    """
    end   = datetime.today().strftime("%Y%m%d")
    start = (datetime.today() - timedelta(days=days)).strftime("%Y%m%d")

    # KRX 우선 시도
    if ticker.isdigit() and len(ticker) == 6:
        try:
            df = krx.get_market_ohlcv_by_date(start, end, ticker)
            df.columns = ["Open","High","Low","Close","Volume","Change"]
            df = df[["Open","High","Low","Close","Volume"]].dropna()
            df.index = pd.to_datetime(df.index)
            return df
        except Exception:
            pass

    # Yahoo Finance fallback
    sym = ticker if "." in ticker else ticker + ".KS"
    df  = yf.download(sym, start=start[:4]+"-"+start[4:6]+"-"+start[6:],
                      auto_adjust=True, progress=False)
    df  = df[["Open","High","Low","Close","Volume"]].dropna()
    return df

def load_financials(ticker: str) -> dict:
    """재무제표 (yfinance)"""
    sym = ticker if "." in ticker else ticker + ".KS"
    t   = yf.Ticker(sym)
    return {
        "info"          : t.info,
        "income_stmt"   : t.income_stmt,
        "balance_sheet" : t.balance_sheet,
        "cashflow"      : t.cashflow,
    }
```

---

## 레이어 2 — 기술적 분석

### 2-A. 캔들스틱 패턴 (15종)

```python
# technical/candlestick.py
import pandas as pd
import numpy as np

def detect_candlestick(df: pd.DataFrame,
                        body_pct: float = 0.1,
                        shadow_ratio: float = 2.0) -> pd.DataFrame:
    o, h, l, c = df.Open, df.High, df.Low, df.Close
    body   = (c - o).abs()
    rng    = (h - l).replace(0, np.nan)
    upper  = h - pd.concat([o, c], axis=1).max(axis=1)
    lower  = pd.concat([o, c], axis=1).min(axis=1) - l

    sig = pd.Series(0, index=df.index)
    patterns = pd.DataFrame(index=df.index)

    # Single-candle
    patterns["Doji"]            = (body / rng) < body_pct
    patterns["Hammer"]          = (lower > body * shadow_ratio) & (upper < body * 0.3) & (c > o)
    patterns["InvertedHammer"]  = (upper > body * shadow_ratio) & (lower < body * 0.3) & (c > o)
    patterns["ShootingStar"]    = (upper > body * shadow_ratio) & (lower < body * 0.3) & (c < o)
    patterns["SpinningTop"]     = (body / rng < 0.3) & (upper > body * 0.5) & (lower > body * 0.5)

    # Double-candle
    pb, pc = o.shift(1), c.shift(1)
    po, ph, pl = o.shift(1), h.shift(1), l.shift(1)
    prev_bull = pc > pb

    patterns["BullishEngulfing"] = ~prev_bull & (c > o) & (o < pc) & (c > pb)
    patterns["BearishEngulfing"] =  prev_bull & (c < o) & (o > pc) & (c < pb)
    patterns["BullishHarami"]    = ~prev_bull & (c > o) & (o > pc) & (c < pb)
    patterns["BearishHarami"]    =  prev_bull & (c < o) & (o < pc) & (c > pb)
    patterns["PiercingLine"]     = ~prev_bull & (c > o) & (o < pl) & (c > (pb + pc) / 2)
    patterns["DarkCloudCover"]   =  prev_bull & (c < o) & (o > ph) & (c < (pb + pc) / 2)

    # Triple-candle
    ppb, ppc = o.shift(2), c.shift(2)
    pp_bull = ppc > ppb
    p_doji  = ((c.shift(1) - o.shift(1)).abs() / (h.shift(1) - l.shift(1)).replace(0,np.nan)) < body_pct

    patterns["MorningStar"]        = pp_bull  & p_doji & (c > o) & (c > (ppb + ppc) / 2)
    patterns["EveningStar"]        = ~pp_bull & p_doji & (c < o) & (c < (ppb + ppc) / 2)
    patterns["ThreeWhiteSoldiers"] = (c>o) & (c.shift(1)>o.shift(1)) & (c.shift(2)>o.shift(2)) & (c>c.shift(1)) & (c.shift(1)>c.shift(2))
    patterns["ThreeBlackCrows"]    = (c<o) & (c.shift(1)<o.shift(1)) & (c.shift(2)<o.shift(2)) & (c<c.shift(1)) & (c.shift(1)<c.shift(2))

    BULLISH = ["Hammer","InvertedHammer","BullishEngulfing","BullishHarami",
               "PiercingLine","MorningStar","ThreeWhiteSoldiers"]
    BEARISH = ["ShootingStar","BearishEngulfing","BearishHarami",
               "DarkCloudCover","EveningStar","ThreeBlackCrows"]

    score = patterns[BULLISH].sum(axis=1) - patterns[BEARISH].sum(axis=1)
    signal = score.apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))

    result = patterns.copy()
    result["cs_score"]  = score
    result["cs_signal"] = signal
    return result
```

### 2-B. 엘리어트 파동 + 피보나치

```python
# technical/elliott_wave.py
import pandas as pd
import numpy as np

def detect_swing_points(close: pd.Series, window: int = 10):
    highs, lows = [], []
    for i in range(window, len(close) - window):
        w = close.iloc[i - window: i + window + 1]
        if close.iloc[i] == w.max():
            highs.append((close.index[i], close.iloc[i]))
        if close.iloc[i] == w.min():
            lows.append((close.index[i], close.iloc[i]))
    return highs, lows

FIB = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.618]

def fib_levels(high: float, low: float) -> dict:
    diff = high - low
    return {f"fib_{r}": round(high - diff * r, 0) for r in FIB}

def detect_elliott(df: pd.DataFrame,
                   swing_window: int = 10,
                   fib_tol: float = 0.15,
                   min_bars: int = 5) -> dict:
    close  = df["Close"]
    highs, lows = detect_swing_points(close, swing_window)

    # 최근 5개 스윙포인트로 임펄스 파동 감지 시도
    swings = sorted(highs + lows, key=lambda x: x[0])[-10:]
    signal = 0
    wave_label = "N/A"
    entry_zone = {}
    pivot_high = close.rolling(swing_window * 2).max().iloc[-1]
    pivot_low  = close.rolling(swing_window * 2).min().iloc[-1]
    fibs       = fib_levels(pivot_high, pivot_low)

    if len(swings) >= 5:
        pts = [s[1] for s in swings[-5:]]
        w1 = pts[1] - pts[0]
        w3 = pts[3] - pts[2]
        w2_retrace = (pts[1] - pts[2]) / (pts[1] - pts[0]) if w1 != 0 else 0
        w4_retrace = (pts[3] - pts[4]) / (pts[3] - pts[2]) if w3 != 0 else 0

        impulse_up = (pts[1] > pts[0] and pts[3] > pts[2] and
                      pts[4] < pts[3] and
                      0.382 <= w2_retrace <= 0.786 and
                      0.236 <= w4_retrace <= 0.5)

        if impulse_up:
            wave_label = "5파 완성 → 조정 예상"
            signal = -1
            entry_zone = {k: v for k, v in fibs.items()
                          if k in ["fib_0.382", "fib_0.5", "fib_0.618"]}
        elif w2_retrace >= 0.382:
            wave_label = "ABC 조정 완료 → 매수 구간"
            signal = 1
            entry_zone = {k: v for k, v in fibs.items()
                          if k in ["fib_0.5", "fib_0.618"]}

    return {
        "ew_signal"  : signal,
        "wave_label" : wave_label,
        "entry_zone" : entry_zone,
        "fib_levels" : fibs,
        "pivot_high" : pivot_high,
        "pivot_low"  : pivot_low,
    }
```

### 2-C. 이치모쿠 균형표

```python
# technical/ichimoku.py
import pandas as pd

def ichimoku(df: pd.DataFrame,
             tenkan: int = 9, kijun: int = 26,
             senkou_b: int = 52, disp: int = 26) -> pd.DataFrame:
    h, l, c = df.High, df.Low, df.Close

    def mid(n): return (h.rolling(n).max() + l.rolling(n).min()) / 2

    ic = pd.DataFrame(index=df.index)
    ic["tenkan"]   = mid(tenkan)
    ic["kijun"]    = mid(kijun)
    ic["senkou_a"] = ((ic.tenkan + ic.kijun) / 2).shift(disp)
    ic["senkou_b"] = mid(senkou_b).shift(disp)
    ic["chikou"]   = c.shift(-disp)

    above_cloud = (c > ic.senkou_a) & (c > ic.senkou_b)
    tk_cross_up = (ic.tenkan > ic.kijun) & (ic.tenkan.shift(1) <= ic.kijun.shift(1))
    tk_cross_dn = (ic.tenkan < ic.kijun) & (ic.tenkan.shift(1) >= ic.kijun.shift(1))

    ic["ichi_signal"] = 0
    ic.loc[above_cloud & tk_cross_up, "ichi_signal"] = 1
    ic.loc[~above_cloud & tk_cross_dn, "ichi_signal"] = -1

    return ic
```

### 2-D. SMC (Smart Money Concepts)

```python
# technical/smc.py
import pandas as pd
import numpy as np

def detect_smc(df: pd.DataFrame, swing_len: int = 10) -> pd.DataFrame:
    h, l, c, o = df.High, df.Low, df.Close, df.Open

    # Swing highs/lows
    swing_hi = h[(h == h.rolling(swing_len * 2 + 1, center=True).max())]
    swing_lo = l[(l == l.rolling(swing_len * 2 + 1, center=True).min())]

    smc = pd.DataFrame(index=df.index)

    # Break of Structure (BOS)
    prev_hi = h.rolling(swing_len).max().shift(1)
    prev_lo = l.rolling(swing_len).min().shift(1)
    smc["bos_bullish"] = (c > prev_hi) & (c.shift(1) <= prev_hi.shift(1))
    smc["bos_bearish"] = (c < prev_lo) & (c.shift(1) >= prev_lo.shift(1))

    # Fair Value Gap (FVG)
    smc["fvg_bull"] = l > h.shift(2)   # 상승 갭
    smc["fvg_bear"] = h < l.shift(2)   # 하락 갭

    # Order Block (마지막 하락봉 전 상승 → 수요 블록)
    bearish = c < o
    smc["ob_demand"] = bearish.shift(1) & (c > h.shift(1))
    smc["ob_supply"] = (~bearish).shift(1) & (c < l.shift(1))

    # 종합 시그널
    smc["smc_signal"] = 0
    smc.loc[smc.bos_bullish | smc.fvg_bull | smc.ob_demand, "smc_signal"] = 1
    smc.loc[smc.bos_bearish | smc.fvg_bear | smc.ob_supply, "smc_signal"] = -1

    return smc
```

---

## 레이어 3 — 퀀트 분석

### 3-A. 기술적 팩터 스코어링

```python
# quant/factor_score.py
import pandas as pd
import numpy as np
import pandas_ta as ta

def compute_factors(df: pd.DataFrame) -> pd.DataFrame:
    f = pd.DataFrame(index=df.index)
    c = df.Close

    # 모멘텀
    f["mom_1m"]  = c.pct_change(21)
    f["mom_3m"]  = c.pct_change(63)
    f["mom_6m"]  = c.pct_change(126)

    # 추세
    f["above_ma20"]  = (c > c.rolling(20).mean()).astype(int)
    f["above_ma60"]  = (c > c.rolling(60).mean()).astype(int)
    f["above_ma120"] = (c > c.rolling(120).mean()).astype(int)

    # 변동성 (역팩터 — 낮을수록 좋음)
    f["vol_20d"] = c.pct_change().rolling(20).std() * np.sqrt(252)

    # RSI
    f["rsi_14"] = ta.rsi(c, length=14)

    # MACD
    macd = ta.macd(c)
    if macd is not None:
        f["macd_hist"] = macd.iloc[:, 2]

    # 볼린저 밴드 %B
    bb = ta.bbands(c, length=20)
    if bb is not None:
        f["bb_pct"] = bb.iloc[:, 2]

    # 표준화 Z-score (rolling 252일)
    for col in f.columns:
        mu = f[col].rolling(252, min_periods=60).mean()
        sd = f[col].rolling(252, min_periods=60).std()
        f[col + "_z"] = (f[col] - mu) / sd.replace(0, np.nan)

    # 종합 팩터 스코어 (Z-score 평균)
    z_cols = [c for c in f.columns if c.endswith("_z") and "vol" not in c]
    f["factor_score"] = f[z_cols].mean(axis=1)
    f["quant_signal"] = f["factor_score"].apply(
        lambda x: 1 if x > 0.5 else (-1 if x < -0.5 else 0))

    return f
```

---

## 레이어 4 — 펀더멘털

### 4-A. 간이 밸류에이션

```python
# fundamental/valuation.py

def simple_valuation(info: dict) -> dict:
    """yfinance info dict → 밸류에이션 지표"""
    def safe(key, default=None):
        v = info.get(key)
        return v if v and v == v else default  # NaN 제거

    eps        = safe("trailingEps")
    bvps       = safe("bookValue")
    price      = safe("currentPrice") or safe("regularMarketPrice")
    roe        = safe("returnOnEquity")
    ebitda     = safe("ebitda")
    ev         = safe("enterpriseValue")
    rev        = safe("totalRevenue")
    net_income = safe("netIncomeToCommon")

    result = {"price": price}

    if price and eps and eps > 0:
        result["PER"] = round(price / eps, 1)
    if price and bvps and bvps > 0:
        result["PBR"] = round(price / bvps, 2)
    if roe:
        result["ROE_%"] = round(roe * 100, 1)
    if ev and ebitda and ebitda > 0:
        result["EV_EBITDA"] = round(ev / ebitda, 1)
    if price and rev:
        shares = safe("sharesOutstanding")
        if shares:
            result["PSR"] = round((price * shares) / rev, 2)

    # PEG (간이)
    growth = safe("earningsGrowth") or safe("revenueGrowth")
    if result.get("PER") and growth and growth > 0:
        result["PEG"] = round(result["PER"] / (growth * 100), 2)

    # 내재가치 (Graham)
    if eps and eps > 0 and growth:
        result["graham_value"] = round(eps * (8.5 + 2 * growth * 100), 0)

    return result
```

---

## 레이어 5 — 시그널 통합 엔진

```python
# signal_fusion.py
import pandas as pd
from typing import Dict, Any

WEIGHTS = {
    "cs_signal"    : 1.5,   # 캔들스틱
    "ew_signal"    : 2.0,   # 엘리어트 파동
    "ichi_signal"  : 1.5,   # 이치모쿠
    "smc_signal"   : 1.5,   # SMC
    "quant_signal" : 2.0,   # 퀀트 팩터
}

def fuse_signals(last_row: pd.Series) -> Dict[str, Any]:
    weighted_sum = 0.0
    total_weight = 0.0
    details = {}

    for key, weight in WEIGHTS.items():
        val = last_row.get(key, 0)
        if pd.isna(val):
            val = 0
        weighted_sum += val * weight
        total_weight += weight
        label = "▲ 매수" if val > 0 else ("▼ 매도" if val < 0 else "— 관망")
        details[key] = {"score": int(val), "label": label, "weight": weight}

    composite = weighted_sum / total_weight if total_weight else 0

    if composite > 0.3:
        final = "LONG"
        strength = min(composite / 1.0 * 100, 100)
    elif composite < -0.3:
        final = "SHORT"
        strength = min(abs(composite) / 1.0 * 100, 100)
    else:
        final = "STAND ASIDE"
        strength = 0

    return {
        "composite_score" : round(composite, 3),
        "signal"          : final,
        "strength_%"      : round(strength, 1),
        "details"         : details,
    }

def compute_entry_price(df: pd.DataFrame, ew_result: dict, signal: str) -> dict:
    """진입/손절/목표 가격 계산"""
    last  = df.Close.iloc[-1]
    atr   = (df.High - df.Low).rolling(14).mean().iloc[-1]

    fibs  = ew_result.get("fib_levels", {})
    entry_zone = ew_result.get("entry_zone", {})

    if signal == "LONG":
        entry  = entry_zone.get("fib_0.618", last - atr)
        stop   = entry - atr * 1.5
        tp1    = last + atr * 2
        tp2    = fibs.get("fib_1.618", last + atr * 3)
    elif signal == "SHORT":
        entry  = entry_zone.get("fib_0.382", last + atr)
        stop   = entry + atr * 1.5
        tp1    = last - atr * 2
        tp2    = fibs.get("fib_0.236", last - atr * 3)
    else:
        entry = stop = tp1 = tp2 = None

    return {
        "entry"          : round(entry, 0) if entry else None,
        "stop_loss"      : round(stop, 0)  if stop  else None,
        "target_1"       : round(tp1, 0)   if tp1   else None,
        "target_2"       : round(tp2, 0)   if tp2   else None,
        "atr_14"         : round(atr, 0),
        "rr_ratio"       : round((tp1 - entry) / (entry - stop), 2)
                           if (entry and stop and entry != stop and signal == "LONG") else None,
        "current_price"  : last,
    }
```

---

## 레이어 6 — 메인 실행 파이프라인

```python
# run_analysis.py
"""
사용법:
  python run_analysis.py 042700
  python run_analysis.py 005930 --days 500 --csv
"""
import sys, argparse, json, warnings
import pandas as pd
warnings.filterwarnings("ignore")

from data_loader       import load_ohlcv, load_financials
from technical.candlestick  import detect_candlestick
from technical.elliott_wave import detect_elliott
from technical.ichimoku     import ichimoku
from technical.smc          import detect_smc
from quant.factor_score     import compute_factors
from fundamental.valuation  import simple_valuation
from signal_fusion          import fuse_signals, compute_entry_price

def divider(title=""):
    w = 60
    if title:
        pad = (w - len(title) - 2) // 2
        print("=" * pad + f" {title} " + "=" * pad)
    else:
        print("=" * w)

def run(ticker: str, days: int = 365, export_csv: bool = False):
    divider(f"한미반도체({ticker}) 종합 분석")

    # ── 데이터 로드
    print(f"\n📥 OHLCV 수집 중... ({days}일)")
    df = load_ohlcv(ticker, days)
    print(f"   {df.index[0].date()} ~ {df.index[-1].date()}  ({len(df)}거래일)")

    # ── 기술적 분석
    print("\n🕯  캔들스틱 패턴 분석...")
    cs  = detect_candlestick(df)

    print("〰  엘리어트 파동 분석...")
    ew  = detect_elliott(df)

    print("☁  이치모쿠 분석...")
    ic  = ichimoku(df)

    print("💡 SMC 분석...")
    sm  = detect_smc(df)

    # ── 퀀트 팩터
    print("📊 팩터 스코어 계산...")
    fac = compute_factors(df)

    # ── 데이터 병합
    merged = pd.concat([df, cs, ic, sm, fac], axis=1)
    last   = merged.iloc[-1].copy()
    last["ew_signal"] = ew["ew_signal"]

    # ── 시그널 통합
    fusion = fuse_signals(last)
    prices = compute_entry_price(df, ew, fusion["signal"])

    # ── 출력
    divider("시그널 요약")
    sig_icon = {"LONG": "🟢", "SHORT": "🔴", "STAND ASIDE": "🟡"}
    print(f"\n  종합 시그널 : {sig_icon.get(fusion['signal'],'')} {fusion['signal']}")
    print(f"  복합 스코어 : {fusion['composite_score']:+.3f}")
    print(f"  신호 강도   : {fusion['strength_%']:.1f}%\n")

    for key, v in fusion["details"].items():
        bar = "█" * int(abs(v["score"]) * 5)
        print(f"  {key:<14} [{v['label']}]  w={v['weight']}  {bar}")

    divider("진입 가격 가이드")
    p = prices
    print(f"\n  현재가    : {p['current_price']:>10,.0f} 원")
    print(f"  ATR(14)   : {p['atr_14']:>10,.0f} 원")
    if p["entry"]:
        print(f"  진입 목표 : {p['entry']:>10,.0f} 원")
        print(f"  손절선    : {p['stop_loss']:>10,.0f} 원")
        print(f"  1차 목표  : {p['target_1']:>10,.0f} 원")
        print(f"  2차 목표  : {p['target_2']:>10,.0f} 원")
        if p["rr_ratio"]:
            print(f"  R/R 비율  : {p['rr_ratio']:.2f}x")

    divider("엘리어트 파동")
    print(f"\n  파동 상태 : {ew['wave_label']}")
    print(f"  피봇 고점 : {ew['pivot_high']:,.0f}  /  피봇 저점 : {ew['pivot_low']:,.0f}")
    if ew["entry_zone"]:
        print("  진입 구간 :")
        for k, v in ew["entry_zone"].items():
            print(f"    {k}: {v:,.0f}")

    divider("팩터 / 퀀트")
    print(f"\n  Factor Score  : {last.get('factor_score', float('nan')):.3f}")
    print(f"  RSI(14)       : {last.get('rsi_14', float('nan')):.1f}")
    print(f"  모멘텀 1M     : {last.get('mom_1m', float('nan')):.1%}")
    print(f"  모멘텀 3M     : {last.get('mom_3m', float('nan')):.1%}")
    print(f"  BB %B         : {last.get('bb_pct', float('nan')):.3f}")

    # ── 펀더멘털 (선택)
    try:
        fin   = load_financials(ticker)
        val   = simple_valuation(fin["info"])
        divider("펀더멘털 밸류에이션")
        print()
        for k, v in val.items():
            print(f"  {k:<15}: {v:>12,}" if isinstance(v, (int, float)) else f"  {k:<15}: {v}")
    except Exception as e:
        print(f"\n  ⚠️  펀더멘털 데이터 로드 실패: {e}")

    divider()

    # CSV 내보내기
    if export_csv:
        out = f"{ticker}_analysis.csv"
        merged.to_csv(out)
        print(f"\n📁 분석 데이터 저장: {out}")

    return fusion, prices

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("ticker", help="종목코드 (예: 042700)")
    parser.add_argument("--days",  type=int, default=365)
    parser.add_argument("--csv",   action="store_true")
    args = parser.parse_args()
    run(args.ticker, args.days, args.csv)
```

---

## 신호 규약 (전 레이어 공통)

| 값 | 의미 |
|---|---|
| `+1` | Long (매수) |
| `-1` | Short (매도/관망) |
| `0`  | Stand Aside (중립) |

## 가중치 튜닝 가이드

`signal_fusion.py`의 `WEIGHTS` 딕셔너리를 조정하여 레이어별 비중을 변경한다.
- 단기 트레이딩 → `cs_signal`, `smc_signal` 비중 증가
- 스윙 트레이딩 → `ew_signal`, `ichi_signal` 비중 증가
- 중장기 투자   → `quant_signal` + 펀더멘털 비중 증가

## 파일 구조

```
stock-analysis/
├── run_analysis.py          ← 메인 진입점
├── data_loader.py
├── signal_fusion.py
├── technical/
│   ├── candlestick.py
│   ├── elliott_wave.py
│   ├── ichimoku.py
│   └── smc.py
├── quant/
│   └── factor_score.py
└── fundamental/
    └── valuation.py
```
