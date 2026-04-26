"""
Core analysis engine: Technical + Fundamental signals
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class Signal(Enum):
    STRONG_BUY  = 2
    BUY         = 1
    NEUTRAL     = 0
    SELL        = -1
    STRONG_SELL = -2


@dataclass
class TechnicalSignal:
    signal: Signal
    score: float
    confidence: float
    target_price: float
    stop_loss: float
    indicators: dict


@dataclass
class FundamentalSignal:
    signal: Signal
    score: float
    confidence: float
    intrinsic_value: float
    metrics: dict


@dataclass
class TradeDecision:
    action: str
    confidence: float
    entry_price: float
    target_price: float
    stop_loss: float
    risk_reward_ratio: float
    tech_score: float
    fund_score: float
    combined_score: float
    reasoning: list[str]


# ─────────────────────────────────────────────
# Technical Analyzer
# ─────────────────────────────────────────────
class TechnicalAnalyzer:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self._compute_indicators()

    def _compute_indicators(self):
        c, h, l, v = self.df['Close'], self.df['High'], self.df['Low'], self.df['Volume']

        self.df['ema12'] = c.ewm(span=12).mean()
        self.df['ema26'] = c.ewm(span=26).mean()
        self.df['macd']  = self.df['ema12'] - self.df['ema26']
        self.df['signal_line'] = self.df['macd'].ewm(span=9).mean()
        self.df['macd_hist']   = self.df['macd'] - self.df['signal_line']

        delta = c.diff()
        gain  = delta.clip(lower=0).rolling(14).mean()
        loss  = (-delta.clip(upper=0)).rolling(14).mean()
        rs    = gain / loss.replace(0, np.nan)
        self.df['rsi'] = 100 - (100 / (1 + rs))

        low14  = l.rolling(14).min()
        high14 = h.rolling(14).max()
        self.df['stoch_k'] = 100 * (c - low14) / (high14 - low14 + 1e-9)
        self.df['stoch_d'] = self.df['stoch_k'].rolling(3).mean()

        sma20 = c.rolling(20).mean()
        std20 = c.rolling(20).std()
        self.df['bb_upper'] = sma20 + 2 * std20
        self.df['bb_lower'] = sma20 - 2 * std20
        self.df['bb_mid']   = sma20
        self.df['bb_pct']   = (c - self.df['bb_lower']) / (
            self.df['bb_upper'] - self.df['bb_lower'] + 1e-9)

        tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
        self.df['atr'] = tr.rolling(14).mean()

        self.df['obv'] = (np.sign(c.diff()) * v).cumsum()
        self.df['vol_ma20']  = v.rolling(20).mean()
        self.df['vol_ratio'] = v / self.df['vol_ma20']

    def analyze(self) -> TechnicalSignal:
        row = self.df.iloc[-1]
        scores = []

        macd_score = float(np.tanh(row['macd_hist'] / (row['atr'] + 1e-9)))
        scores.append(('macd', macd_score, 0.25))

        rsi = float(row['rsi'])
        if rsi < 30:
            rsi_score = (30 - rsi) / 30
        elif rsi > 70:
            rsi_score = (70 - rsi) / 30
        else:
            rsi_score = (50 - rsi) / 50 * 0.3
        scores.append(('rsi', float(np.clip(rsi_score, -1, 1)), 0.20))

        bb_score = 1 - 2 * float(row['bb_pct'])
        scores.append(('bb', float(np.clip(bb_score, -1, 1)), 0.20))

        k, d = float(row['stoch_k']), float(row['stoch_d'])
        if k < 20 and k > d:
            stoch_score = 0.8
        elif k > 80 and k < d:
            stoch_score = -0.8
        else:
            stoch_score = (50 - k) / 50 * 0.3
        scores.append(('stoch', stoch_score, 0.15))

        vol_score = float(np.tanh(row['vol_ratio'] - 1)) * float(np.sign(self.df['Close'].diff().iloc[-1]))
        scores.append(('volume', vol_score, 0.20))

        total_score = sum(s * w for _, s, w in scores)
        confidence  = min(abs(total_score) * 1.5, 1.0)

        price  = float(row['Close'])
        atr    = float(row['atr'])
        _sig   = _score_to_signal(total_score)

        if _sig in (Signal.STRONG_BUY, Signal.BUY):
            # 롱: 목표가 위(저항), 손절가 아래(지지)
            target    = price + atr * 2.5
            stop_loss = price - atr * 1.0
        elif _sig in (Signal.STRONG_SELL, Signal.SELL):
            # 매도: 목표가 아래(익절), 손절가 위(손절)
            target    = price - atr * 2.5
            stop_loss = price + atr * 1.0
        else:
            # HOLD/NEUTRAL: 근접 저항(위) vs 근접 지지(아래)
            target    = price + atr * 1.5
            stop_loss = price - atr * 1.0

        def _safe(v, decimals=2):
            try:
                f = float(v)
                return None if (np.isnan(f) or np.isinf(f)) else round(f, decimals)
            except Exception:
                return None

        return TechnicalSignal(
            signal       = _score_to_signal(total_score),
            score        = round(total_score, 4),
            confidence   = round(confidence, 4),
            target_price = round(target, 2),
            stop_loss    = round(stop_loss, 2),
            indicators   = {
                'rsi':       _safe(rsi),
                'macd':      _safe(row['macd'], 4),
                'macd_hist': _safe(row['macd_hist'], 4),
                'stoch_k':   _safe(k),
                'stoch_d':   _safe(d),
                'bb_pct':    _safe(row['bb_pct'], 4),
                'bb_upper':  _safe(row['bb_upper']),
                'bb_lower':  _safe(row['bb_lower']),
                'atr':       _safe(atr),
                'vol_ratio': _safe(row['vol_ratio']),
            }
        )


# ─────────────────────────────────────────────
# Fundamental Analyzer
# ─────────────────────────────────────────────
class FundamentalAnalyzer:
    def __init__(self, ticker_info: dict, current_price: float):
        self.info  = ticker_info
        self.price = current_price

    def analyze(self) -> FundamentalSignal:
        info = self.info
        scores = []

        def get(key, default=None):
            v = info.get(key, default)
            return v if v is not None else default

        per = get('trailingPE', 25)
        pbr = get('priceToBook', 2)
        roe = get('returnOnEquity', 0.1)
        if roe: roe *= 100
        net_margin = get('profitMargins', 0.05)
        if net_margin: net_margin *= 100
        rev_growth = get('revenueGrowth', 0.05)
        if rev_growth: rev_growth *= 100
        earn_growth = get('earningsGrowth', 0.05)
        if earn_growth: earn_growth *= 100
        debt_equity = get('debtToEquity', 100)
        current_ratio = get('currentRatio', 1.5)
        interest_cov  = get('interestCoverage', 3)
        div_yield = get('dividendYield', 0)
        if div_yield: div_yield *= 100

        per_s = _norm_inv(per or 25, 10, 20, 35)
        pbr_s = _norm_inv(pbr or 2,  0.8, 2.0, 4.0)
        scores.append(('valuation', (per_s + pbr_s) / 2, 0.30))

        roe_s    = _norm(roe or 10,        5,  15, 25)
        margin_s = _norm(net_margin or 5,  2,  10, 20)
        scores.append(('profitability', (roe_s + margin_s) / 2, 0.25))

        rg_s  = _norm(rev_growth  or 5,  0, 10, 30)
        eg_s  = _norm(earn_growth or 5,  0, 15, 40)
        scores.append(('growth', (rg_s + eg_s) / 2, 0.25))

        de_s = _norm_inv(debt_equity  or 100, 50,  100, 200)
        cr_s = _norm(current_ratio   or 1.5,  1.0, 1.5, 3.0)
        ic_s = _norm(interest_cov    or 3,    1,   3,   10)
        scores.append(('health', (de_s + cr_s + ic_s) / 3, 0.20))

        total_score = sum(s * w for _, s, w in scores)
        confidence  = min(abs(total_score) * 1.2, 1.0)
        intrinsic   = self.price * (total_score * 0.3 + 1.0)

        return FundamentalSignal(
            signal          = _score_to_signal(total_score),
            score           = round(total_score, 4),
            confidence      = round(confidence, 4),
            intrinsic_value = round(intrinsic, 2),
            metrics={
                'per':          round(per or 0, 2),
                'pbr':          round(pbr or 0, 2),
                'roe':          round(roe or 0, 2),
                'net_margin':   round(net_margin or 0, 2),
                'rev_growth':   round(rev_growth or 0, 2),
                'earn_growth':  round(earn_growth or 0, 2),
                'debt_equity':  round(debt_equity or 0, 2),
                'current_ratio':round(current_ratio or 0, 2),
                'div_yield':    round(div_yield or 0, 2),
            }
        )


# ─────────────────────────────────────────────
# Decision Engine
# ─────────────────────────────────────────────
class DecisionEngine:
    def __init__(self, tech_weight=0.6, fund_weight=0.4):
        self.tw = tech_weight
        self.fw = fund_weight

    def decide(self, tech: TechnicalSignal, fund: FundamentalSignal, current_price: float) -> TradeDecision:
        combined_score = tech.score * self.tw + fund.score * self.fw
        combined_conf  = tech.confidence * self.tw + fund.confidence * self.fw
        reasoning = []

        same_dir = (tech.score > 0 and fund.score > 0) or (tech.score < 0 and fund.score < 0)
        if same_dir:
            combined_conf = min(combined_conf * 1.2, 1.0)
            reasoning.append("기술/기본 신호 방향 일치 → 신뢰도 상승")
        else:
            combined_conf *= 0.8
            reasoning.append("기술/기본 신호 방향 불일치 → 신뢰도 하락")

        if combined_score > 0.25 and combined_conf > 0.5:
            action = 'BUY'
            reasoning.append(f"통합 점수 {combined_score:.2f} (매수 기준 0.25 초과)")
            if fund.intrinsic_value > current_price:
                reasoning.append(f"내재가치({fund.intrinsic_value:,.0f}) > 현재가 → 저평가")
        elif combined_score < -0.25 and combined_conf > 0.5:
            action = 'SELL'
            reasoning.append(f"통합 점수 {combined_score:.2f} (매도 기준 -0.25 미만)")
        else:
            action = 'HOLD'
            reasoning.append(f"신호 강도({combined_score:.2f}) 또는 신뢰도({combined_conf:.1%}) 불충분 → 관망")

        entry  = current_price
        target = tech.target_price
        stop   = tech.stop_loss
        risk   = abs(entry - stop)
        reward = abs(target - entry)
        rr     = round(reward / risk, 2) if risk > 0 else 0

        if rr < 2.0 and action != 'HOLD':
            reasoning.append(f"RR비율({rr:.1f}:1) 불량 → 진입 재검토 권고")

        return TradeDecision(
            action            = action,
            confidence        = round(combined_conf, 3),
            entry_price       = round(entry, 2),
            target_price      = round(target, 2),
            stop_loss         = round(stop, 2),
            risk_reward_ratio = rr,
            tech_score        = tech.score,
            fund_score        = fund.score,
            combined_score    = round(combined_score, 4),
            reasoning         = reasoning,
        )


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _score_to_signal(score: float) -> Signal:
    if   score >  0.6: return Signal.STRONG_BUY
    elif score >  0.2: return Signal.BUY
    elif score < -0.6: return Signal.STRONG_SELL
    elif score < -0.2: return Signal.SELL
    else:              return Signal.NEUTRAL

def _norm(val, low, mid, high) -> float:
    if val <= low:  return -1.0
    if val >= high: return  1.0
    if val < mid:   return (val - low) / (mid - low) - 1.0
    return (val - mid) / (high - mid)

def _norm_inv(val, low, mid, high) -> float:
    return -_norm(val, low, mid, high)
