"""
Streamlit Dashboard — Dark UI (inspired by modern home-dashboard aesthetics)
"""
import streamlit as st
import httpx
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots

API_URL = "http://localhost:8000"

st.set_page_config(
    page_title="Stock Analyzer",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Global CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* Base */
html, body, [data-testid="stAppViewContainer"] {
    background-color: #0a0e1a !important;
    color: #e2e8f0;
    font-family: 'Inter', 'SF Pro Display', sans-serif;
}
[data-testid="stSidebar"] {
    background-color: #0f1320 !important;
    border-right: 1px solid #1e2a40;
}
[data-testid="block-container"] { padding: 1.2rem 1.5rem; }

/* Cards */
.card {
    background: #111827;
    border: 1px solid #1e2a40;
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 12px;
}
.card-sm {
    background: #111827;
    border: 1px solid #1e2a40;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 8px;
}
.card-header {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
}
.card-header .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    display: inline-block;
}

/* Signal badge */
.signal-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 0.05em;
}
.badge-buy  { background: rgba(0,212,170,0.12); color: #00d4aa; border: 1px solid rgba(0,212,170,0.3); }
.badge-sell { background: rgba(255,75,110,0.12); color: #ff4b6e; border: 1px solid rgba(255,75,110,0.3); }
.badge-hold { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }

/* Big number */
.big-num {
    font-size: 2rem;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.1;
}
.big-num-sm {
    font-size: 1.4rem;
    font-weight: 700;
    color: #f1f5f9;
}
.label {
    font-size: 0.72rem;
    color: #64748b;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.delta-up   { color: #00d4aa; font-size: 0.8rem; font-weight: 600; }
.delta-down { color: #ff4b6e; font-size: 0.8rem; font-weight: 600; }
.delta-neu  { color: #94a3b8; font-size: 0.8rem; }

/* Progress bar */
.progress-wrap { background: #1e2a40; border-radius: 4px; height: 6px; margin-top: 6px; overflow:hidden; }
.progress-fill { height: 6px; border-radius: 4px; }

/* Ticker chip */
.ticker-chip {
    display: inline-flex; align-items: center;
    background: #1e2a40;
    border: 1px solid #2d3f5a;
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 0.8rem;
    color: #94a3b8;
    cursor: pointer;
    margin: 3px;
    transition: all 0.15s;
}
.ticker-chip:hover { background: #253351; color: #e2e8f0; }

/* Reasoning row */
.reason-row {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid #1e2a40;
    font-size: 0.85rem;
    color: #94a3b8;
}
.reason-row:last-child { border-bottom: none; }

/* Sector pill */
.sector-pill {
    background: #1e2a40;
    border-radius: 20px;
    padding: 2px 10px;
    font-size: 0.72rem;
    color: #64748b;
}

/* Metric row */
.metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 0;
    border-bottom: 1px solid #1a2235;
    font-size: 0.84rem;
}
.metric-row:last-child { border-bottom: none; }
.metric-val { color: #cbd5e1; font-weight: 600; }

/* Hide Streamlit chrome */
#MainMenu, footer, header { visibility: hidden; }
[data-testid="stToolbar"] { display: none; }
</style>
""", unsafe_allow_html=True)

# ── Session state ──────────────────────────────────────────────────────────────
if "selected_ticker" not in st.session_state:
    st.session_state.selected_ticker = "AAPL"
if "result" not in st.session_state:
    st.session_state.result = None

# ── Helpers ────────────────────────────────────────────────────────────────────
def card(content, header=None, dot_color="#00d4aa"):
    dot = f'<span class="dot" style="background:{dot_color}"></span>' if dot_color else ""
    hdr = f'<div class="card-header">{dot}{header}</div>' if header else ""
    return f'<div class="card">{hdr}{content}</div>'

def fmt_p(price, is_kr):
    return f"{price:,.0f}" if is_kr else f"{price:,.2f}"

def delta_html(pct, inverse=False):
    good = pct > 0
    if inverse: good = not good
    cls  = "delta-up" if good else "delta-down"
    arrow = "↑" if pct > 0 else "↓"
    return f'<span class="{cls}">{arrow} {abs(pct):.1f}%</span>'

def gauge_fig(value, title, color="#00d4aa"):
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=value,
        number={"valueformat": ".2f", "font": {"size": 22, "color": "#f1f5f9"}},
        title={"text": title, "font": {"size": 11, "color": "#64748b"}},
        gauge={
            "axis": {"range": [-1, 1], "tickcolor": "#1e2a40",
                     "tickfont": {"size": 9, "color": "#475569"}},
            "bar":  {"color": color, "thickness": 0.25},
            "bgcolor": "#111827",
            "bordercolor": "#1e2a40",
            "steps": [
                {"range": [-1, -0.2], "color": "rgba(255,75,110,0.15)"},
                {"range": [-0.2, 0.2], "color": "rgba(100,116,139,0.1)"},
                {"range": [0.2, 1],   "color": "rgba(0,212,170,0.15)"},
            ],
        },
    ))
    fig.update_layout(
        height=170, margin=dict(l=16, r=16, t=40, b=8),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
    )
    return fig

# ══════════════════════════════════════════════════════════════════════════════
# TOP BAR
# ══════════════════════════════════════════════════════════════════════════════
top_l, top_m, top_r = st.columns([2, 3, 2])
with top_l:
    st.markdown('<div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;padding:4px 0;">📈 Stock Analyzer</div>', unsafe_allow_html=True)
    st.markdown('<div style="font-size:0.72rem;color:#475569;">기술 + 기본 분석 통합 엔진</div>', unsafe_allow_html=True)

with top_m:
    # Quick ticker input
    q_col1, q_col2, q_col3 = st.columns([3, 1, 1])
    with q_col1:
        manual = st.text_input("", placeholder="티커 입력  예) AAPL · 005930.KS · NVDA",
                               label_visibility="collapsed", key="manual_input")
    with q_col2:
        period = st.selectbox("", ["1mo","3mo","6mo","1y","2y"],
                              index=2, label_visibility="collapsed")
    with q_col3:
        style = st.selectbox("", ["balanced","short_term","long_term"],
                             label_visibility="collapsed",
                             format_func=lambda x: {"balanced":"균형","short_term":"단기","long_term":"장기"}[x])

with top_r:
    run_btn = st.button("▶  분석 시작", type="primary", use_container_width=True)

st.markdown('<hr style="border:none;border-top:1px solid #1e2a40;margin:10px 0 14px 0;">', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# MARKET BROWSER  (3-column sidebar-like panel)
# ══════════════════════════════════════════════════════════════════════════════
with st.expander("🗂  종목 브라우저  (클릭하여 펼치기)", expanded=False):
    try:
        pop  = httpx.get(f"{API_URL}/tickers/popular", timeout=3).json()
        kr   = httpx.get(f"{API_URL}/tickers/kr",      timeout=3).json()
    except Exception:
        pop = {"us":["AAPL","MSFT","NVDA","TSLA","META","GOOGL","AMZN"],"etf":["SPY","QQQ","ARKK","VTI"]}
        kr  = {}

    bc1, bc2, bc3 = st.columns(3)
    with bc1:
        st.markdown('<div class="card-header"><span class="dot" style="background:#3b82f6"></span>🇺🇸 미국 주요주</div>', unsafe_allow_html=True)
        for t in pop.get("us", []):
            if st.button(t, key=f"b_us_{t}", use_container_width=True):
                st.session_state.selected_ticker = t
        st.markdown('<div class="card-header" style="margin-top:10px"><span class="dot" style="background:#8b5cf6"></span>ETF</div>', unsafe_allow_html=True)
        for t in pop.get("etf", []):
            if st.button(t, key=f"b_etf_{t}", use_container_width=True):
                st.session_state.selected_ticker = t

    with bc2:
        st.markdown('<div class="card-header"><span class="dot" style="background:#ef4444"></span>🇰🇷 KOSPI</div>', unsafe_allow_html=True)
        for sector, stocks in kr.get("KOSPI", {}).items():
            st.markdown(f'<div class="sector-pill">{sector}</div>', unsafe_allow_html=True)
            for s in stocks:
                if st.button(s["name"], key=f"b_ks_{s['ticker']}", use_container_width=True):
                    st.session_state.selected_ticker = s["ticker"]

    with bc3:
        st.markdown('<div class="card-header"><span class="dot" style="background:#f59e0b"></span>🇰🇷 KOSDAQ</div>', unsafe_allow_html=True)
        # search
        sq = st.text_input("종목명 검색", placeholder="삼성, 에코프로 ...", key="kr_search")
        if sq:
            try:
                res = httpx.get(f"{API_URL}/search/kr", params={"q": sq}, timeout=3).json().get("results", [])
                for item in res[:6]:
                    if st.button(f"{item['name']} ({item['ticker']})", key=f"b_sr_{item['ticker']}", use_container_width=True):
                        st.session_state.selected_ticker = item["ticker"]
            except Exception:
                pass
        for sector, stocks in kr.get("KOSDAQ", {}).items():
            st.markdown(f'<div class="sector-pill">{sector}</div>', unsafe_allow_html=True)
            for s in stocks:
                if st.button(s["name"], key=f"b_kq_{s['ticker']}", use_container_width=True):
                    st.session_state.selected_ticker = s["ticker"]

# Apply manual input
if manual:
    st.session_state.selected_ticker = manual.upper().strip()

ticker = st.session_state.selected_ticker

# ══════════════════════════════════════════════════════════════════════════════
# RUN ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════
if run_btn and ticker:
    with st.spinner(f"  {ticker}  분석 중 ..."):
        try:
            resp = httpx.post(f"{API_URL}/analyze",
                              json={"ticker": ticker, "period": period, "style": style},
                              timeout=40)
            if resp.status_code == 200:
                st.session_state.result = resp.json()
            else:
                try:    detail = resp.json().get("detail", "Unknown")
                except: detail = resp.text or f"HTTP {resp.status_code}"
                st.error(f"API 오류: {detail}")
        except httpx.ConnectError:
            st.error("FastAPI 서버에 연결할 수 없습니다.")

data = st.session_state.result

# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD BODY
# ══════════════════════════════════════════════════════════════════════════════
if not data:
    # ── Welcome screen ────────────────────────────────────────────────────────
    st.markdown("""
    <div style="text-align:center; padding: 60px 0 40px 0;">
      <div style="font-size:3rem">📈</div>
      <div style="font-size:1.4rem; font-weight:700; color:#e2e8f0; margin:12px 0 6px 0;">
        Stock Analyzer
      </div>
      <div style="color:#475569; font-size:0.9rem;">
        위 검색창에서 종목을 입력하거나 브라우저에서 선택 후 <b style="color:#00d4aa">▶ 분석 시작</b>을 누르세요
      </div>
    </div>
    """, unsafe_allow_html=True)

    wc1, wc2, wc3 = st.columns(3)
    for col, icon, title, desc in [
        (wc1, "🔬", "기술적 분석", "RSI · MACD · Bollinger Band · Stochastic · ATR · 거래량"),
        (wc2, "📊", "기본적 분석", "PER · PBR · ROE · 순이익률 · 매출성장률 · 재무건전성"),
        (wc3, "🎯", "통합 의사결정", "BUY / SELL / HOLD · 목표가 · 지지선 · RR비율 · 신뢰도"),
    ]:
        col.markdown(f"""
        <div class="card" style="text-align:center; padding:24px 16px;">
          <div style="font-size:1.8rem; margin-bottom:10px;">{icon}</div>
          <div style="font-weight:700; color:#e2e8f0; margin-bottom:6px;">{title}</div>
          <div style="font-size:0.78rem; color:#64748b; line-height:1.6;">{desc}</div>
        </div>""", unsafe_allow_html=True)
    st.stop()

# ── Data extraction ────────────────────────────────────────────────────────────
d    = data["decision"]
tec  = data["technical"]
fun  = data["fundamental"]
is_kr = data["currency"] == "KRW"
fp   = lambda p: fmt_p(p, is_kr)
cur  = data["currency"]
cp   = data["current_price"]
mkt_flag = "🇰🇷" if is_kr else "🇺🇸"
action   = d["action"]
badge_cls= {"BUY":"badge-buy","SELL":"badge-sell","HOLD":"badge-hold"}.get(action,"badge-hold")
badge_lbl= {"BUY":"● 매수","SELL":"● 매도","HOLD":"● 관망"}.get(action,"관망")
is_sell  = action == "SELL"

tgt_pct = (d["target_price"] / cp - 1) * 100
stp_pct = (d["stop_loss"]    / cp - 1) * 100

# ══════════════════════════════════════════════════════════════════════════════
# ROW 1 — Header + Key metrics + Gauges
# ══════════════════════════════════════════════════════════════════════════════
r1c1, r1c2, r1c3 = st.columns([2.2, 3.2, 2.6])

with r1c1:
    st.markdown(f"""
    <div class="card">
      <div class="card-header">
        <span class="dot" style="background:#3b82f6"></span>
        current-state
      </div>
      <div style="margin-bottom:10px;">
        <div style="font-size:1rem; font-weight:700; color:#f1f5f9;">{mkt_flag} {data['company_name']}</div>
        <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">{data['ticker']}
          <span class="sector-pill" style="margin-left:6px;">{data['sector']}</span>
        </div>
      </div>
      <div class="signal-badge {badge_cls}" style="margin-bottom:14px;">{badge_lbl}</div>
      <div style="margin-top:12px;">
        <div class="label">현재가</div>
        <div class="big-num">{fp(cp)} <span style="font-size:0.9rem;color:#64748b;">{cur}</span></div>
      </div>
      <div style="margin-top:10px;">
        <div class="label">신뢰도</div>
        <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;">{d['confidence']:.1%}</div>
        <div class="progress-wrap">
          <div class="progress-fill" style="width:{d['confidence']*100:.0f}%; background:{'#00d4aa' if d['confidence']>0.5 else '#fbbf24'};"></div>
        </div>
      </div>
    </div>
    """, unsafe_allow_html=True)

with r1c2:
    tgt_label = "목표가 (익절)" if is_sell else ("목표가 (저항)" if action=="HOLD" else "목표가")
    stp_label = "손절가 (손절)" if is_sell else ("지지선" if action=="HOLD" else "손절가")

    mc1, mc2, mc3 = st.columns(3)
    mc1.markdown(f"""
    <div class="card-sm">
      <div class="label">{tgt_label}</div>
      <div class="big-num-sm">{fp(d['target_price'])}</div>
      <div style="margin-top:4px;">{delta_html(tgt_pct, inverse=is_sell)}</div>
    </div>""", unsafe_allow_html=True)
    mc2.markdown(f"""
    <div class="card-sm">
      <div class="label">{stp_label}</div>
      <div class="big-num-sm">{fp(d['stop_loss'])}</div>
      <div style="margin-top:4px;">{delta_html(stp_pct, inverse=not is_sell)}</div>
    </div>""", unsafe_allow_html=True)
    mc3.markdown(f"""
    <div class="card-sm">
      <div class="label">RR 비율</div>
      <div class="big-num-sm">{d['risk_reward_ratio']:.1f}<span style="font-size:1rem;color:#64748b;">:1</span></div>
      <div style="margin-top:4px;"><span class="{'delta-up' if d['risk_reward_ratio']>=2 else 'delta-down'} ">{('✓ 양호' if d['risk_reward_ratio']>=2 else '△ 주의')}</span></div>
    </div>""", unsafe_allow_html=True)

    # Reasoning
    st.markdown('<div class="card" style="padding:14px 16px;">', unsafe_allow_html=True)
    st.markdown('<div class="card-header"><span class="dot" style="background:#8b5cf6"></span>판단 근거</div>', unsafe_allow_html=True)
    for r in d["reasoning"]:
        icon = "✅" if any(k in r for k in ["상승","저평가","초과","일치"]) else "⚠️"
        st.markdown(f'<div class="reason-row"><span>{icon}</span><span>{r}</span></div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

with r1c3:
    gc_color = {"BUY":"#00d4aa","SELL":"#ff4b6e","HOLD":"#fbbf24"}.get(action,"#94a3b8")
    st.plotly_chart(gauge_fig(d["tech_score"],  "기술적 점수", gc_color), use_container_width=True)
    st.plotly_chart(gauge_fig(d["fund_score"],  "기본적 점수", gc_color), use_container_width=True)
    st.plotly_chart(gauge_fig(d["combined_score"], "통합 점수", gc_color), use_container_width=True)

st.markdown('<hr style="border:none;border-top:1px solid #1e2a40;margin:4px 0 12px 0;">', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# ROW 2 — Chart + Indicators
# ══════════════════════════════════════════════════════════════════════════════
r2c1, r2c2 = st.columns([3.5, 1.5])

with r2c1:
    ohlcv = pd.DataFrame(data["ohlcv"])
    ohlcv["Datetime"] = pd.to_datetime(ohlcv["Datetime"], utc=True)
    c = ohlcv["Close"]

    fig = make_subplots(rows=3, cols=1, shared_xaxes=True,
                        row_heights=[0.58, 0.22, 0.20],
                        vertical_spacing=0.02,
                        subplot_titles=("캔들  ·  Bollinger Band", "RSI (14)", "MACD"))

    # Candlestick
    fig.add_trace(go.Candlestick(
        x=ohlcv["Datetime"], open=ohlcv["Open"], high=ohlcv["High"],
        low=ohlcv["Low"], close=ohlcv["Close"], name="OHLC",
        increasing_line_color="#00d4aa", increasing_fillcolor="#00d4aa",
        decreasing_line_color="#ff4b6e", decreasing_fillcolor="#ff4b6e",
    ), row=1, col=1)

    sma = c.rolling(20).mean()
    std = c.rolling(20).std()
    fig.add_trace(go.Scatter(x=ohlcv["Datetime"], y=sma+2*std, name="BB上",
        line=dict(color="rgba(148,163,184,0.35)", dash="dot", width=1), showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=ohlcv["Datetime"], y=sma-2*std, name="BB下",
        fill="tonexty", fillcolor="rgba(148,163,184,0.05)",
        line=dict(color="rgba(148,163,184,0.35)", dash="dot", width=1), showlegend=False), row=1, col=1)
    fig.add_trace(go.Scatter(x=ohlcv["Datetime"], y=sma, name="SMA20",
        line=dict(color="#f59e0b", width=1.2), showlegend=False), row=1, col=1)

    fig.add_hline(y=d["target_price"], line=dict(color="#00d4aa", dash="dash", width=1.2),
                  annotation_text=f"{'목표가' if not is_sell else '익절'} {fp(d['target_price'])}",
                  annotation_font_color="#00d4aa", annotation_font_size=10, row=1, col=1)
    fig.add_hline(y=d["stop_loss"],    line=dict(color="#ff4b6e", dash="dash", width=1.2),
                  annotation_text=f"{'지지선' if action=='HOLD' else '손절'} {fp(d['stop_loss'])}",
                  annotation_font_color="#ff4b6e", annotation_font_size=10, row=1, col=1)

    # RSI
    delta = c.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rsi   = 100 - (100 / (1 + gain / loss.replace(0, float("nan"))))
    rsi_color = ["#ff4b6e" if v > 70 else "#00d4aa" if v < 30 else "#a78bfa" for v in rsi.fillna(50)]
    fig.add_trace(go.Scatter(x=ohlcv["Datetime"], y=rsi, name="RSI",
        line=dict(color="#a78bfa", width=1.5)), row=2, col=1)
    fig.add_hline(y=70, line=dict(color="#ff4b6e", dash="dot", width=0.8), row=2, col=1)
    fig.add_hline(y=30, line=dict(color="#00d4aa", dash="dot", width=0.8), row=2, col=1)
    fig.add_hrect(y0=70, y1=100, fillcolor="rgba(255,75,110,0.05)", line_width=0, row=2, col=1)
    fig.add_hrect(y0=0,  y1=30,  fillcolor="rgba(0,212,170,0.05)",  line_width=0, row=2, col=1)

    # MACD
    ema12 = c.ewm(span=12).mean()
    ema26 = c.ewm(span=26).mean()
    macd  = ema12 - ema26
    sig   = macd.ewm(span=9).mean()
    hist  = macd - sig
    fig.add_trace(go.Bar(x=ohlcv["Datetime"], y=hist, name="Hist",
        marker_color=["#00d4aa" if v >= 0 else "#ff4b6e" for v in hist.fillna(0)],
        opacity=0.8), row=3, col=1)
    fig.add_trace(go.Scatter(x=ohlcv["Datetime"], y=macd, name="MACD",
        line=dict(color="#60a5fa", width=1.2)), row=3, col=1)
    fig.add_trace(go.Scatter(x=ohlcv["Datetime"], y=sig, name="Signal",
        line=dict(color="#f97316", width=1.2)), row=3, col=1)

    fig.update_layout(
        height=560,
        paper_bgcolor="#111827", plot_bgcolor="#111827",
        font=dict(color="#94a3b8", size=10),
        xaxis_rangeslider_visible=False,
        legend=dict(orientation="h", y=1.03, font=dict(size=10), bgcolor="rgba(0,0,0,0)"),
        margin=dict(l=0, r=0, t=30, b=0),
        hovermode="x unified",
        hoverlabel=dict(bgcolor="#1e2a40", font_color="#e2e8f0", font_size=11),
    )
    for i in range(1, 4):
        fig.update_yaxes(gridcolor="#1a2235", zerolinecolor="#1a2235",
                         tickfont=dict(size=9), row=i, col=1)
        fig.update_xaxes(gridcolor="#1a2235", tickfont=dict(size=9), row=i, col=1)

    st.plotly_chart(fig, use_container_width=True)

with r2c2:
    ind = tec["indicators"]
    met = fun["metrics"]

    # Technical indicators card
    st.markdown(f"""
    <div class="card">
      <div class="card-header"><span class="dot" style="background:#a78bfa"></span>기술적 지표</div>
      <div class="metric-row"><span>RSI (14)</span>
        <span class="metric-val {'delta-up' if (ind['rsi'] or 50)<30 else 'delta-down' if (ind['rsi'] or 50)>70 else ''}">{ind['rsi'] or '-'}</span></div>
      <div class="metric-row"><span>Stoch %K</span><span class="metric-val">{ind['stoch_k'] or '-'}</span></div>
      <div class="metric-row"><span>Stoch %D</span><span class="metric-val">{ind['stoch_d'] or '-'}</span></div>
      <div class="metric-row"><span>MACD</span><span class="metric-val">{ind['macd'] or '-'}</span></div>
      <div class="metric-row"><span>MACD Hist</span>
        <span class="metric-val {'delta-up' if (ind['macd_hist'] or 0)>0 else 'delta-down'}">{ind['macd_hist'] or '-'}</span></div>
      <div class="metric-row"><span>BB %</span><span class="metric-val">{f"{ind['bb_pct']:.1%}" if ind['bb_pct'] else '-'}</span></div>
      <div class="metric-row"><span>ATR</span><span class="metric-val">{fp(ind['atr']) if ind['atr'] else '-'}</span></div>
      <div class="metric-row"><span>거래량 비율</span>
        <span class="metric-val {'delta-up' if (ind['vol_ratio'] or 1)>1 else 'delta-down'}">{f"{ind['vol_ratio']:.2f}x" if ind['vol_ratio'] else '-'}</span></div>
    </div>
    """, unsafe_allow_html=True)

    # Fundamental indicators card
    st.markdown(f"""
    <div class="card">
      <div class="card-header"><span class="dot" style="background:#f59e0b"></span>기본적 지표</div>
      <div class="metric-row"><span>PER</span><span class="metric-val">{met['per']:.1f}x</span></div>
      <div class="metric-row"><span>PBR</span><span class="metric-val">{met['pbr']:.2f}x</span></div>
      <div class="metric-row"><span>ROE</span>
        <span class="metric-val {'delta-up' if met['roe']>10 else 'delta-down'}">{met['roe']:.1f}%</span></div>
      <div class="metric-row"><span>순이익률</span><span class="metric-val">{met['net_margin']:.1f}%</span></div>
      <div class="metric-row"><span>매출성장률</span>
        <span class="metric-val {'delta-up' if met['rev_growth']>0 else 'delta-down'}">{met['rev_growth']:+.1f}%</span></div>
      <div class="metric-row"><span>이익성장률</span>
        <span class="metric-val {'delta-up' if met['earn_growth']>0 else 'delta-down'}">{met['earn_growth']:+.1f}%</span></div>
      <div class="metric-row"><span>부채비율</span><span class="metric-val">{met['debt_equity']:.0f}%</span></div>
      <div class="metric-row"><span>배당수익률</span><span class="metric-val">{met['div_yield']:.2f}%</span></div>
      <div class="metric-row"><span>추정 내재가치</span>
        <span class="metric-val {'delta-up' if fun['intrinsic_value']>cp else 'delta-down'}">{fp(fun['intrinsic_value'])} {cur}</span></div>
    </div>
    """, unsafe_allow_html=True)
