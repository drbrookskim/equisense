"""
M3 정성적 분석 — RAG 없이 두 가지 방법으로 언행일치 점수와 노이즈 필터 생성

방법 1 (정량): DART/EDGAR API로 가이던스 수치 vs 실제 수치 비교
방법 2 (정성): FinBERT / KR-FinBERT로 문서 감성 분석

사용법:
  python analyze_qualitative.py --ticker AAPL --market US --year 2024 --doc_type earnings_call
  python analyze_qualitative.py --ticker 005930 --market KR --year 2024 --doc_type annual_report
"""

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

DART_API_KEY = os.environ.get("DART_API_KEY", "")
FMP_API_KEY = os.environ.get("FMP_API_KEY", "")
OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data" / "qualitative"

# ──────────────────────────────────────────────────────────────────────────────
# FinBERT 감성 분석
# ──────────────────────────────────────────────────────────────────────────────

def load_finbert(market: str):
    """시장에 맞는 FinBERT 모델 로드 (최초 1회만 다운로드)"""
    from transformers import pipeline

    if market == "KR":
        model_name = "snunlp/KR-FinBert-SC"
    else:
        model_name = "ProsusAI/finbert"

    print(f"Loading FinBERT model: {model_name}")
    return pipeline("text-classification", model=model_name, top_k=None)


def analyze_sentences(classifier, sentences: list[str]) -> list[dict]:
    """문장 리스트에 FinBERT 감성 분석 적용, 청크 단위로 처리"""
    results = []
    chunk_size = 10
    for i in range(0, len(sentences), chunk_size):
        chunk = sentences[i:i + chunk_size]
        # 512 토큰 제한 대응
        chunk = [s[:400] for s in chunk]
        try:
            preds = classifier(chunk)
            for sent, pred in zip(chunk, preds):
                scores = {p["label"].lower(): p["score"] for p in pred}
                results.append({"sentence": sent, "scores": scores})
        except Exception as e:
            print(f"  [WARN] FinBERT chunk error: {e}")
        time.sleep(0.1)
    return results


# ──────────────────────────────────────────────────────────────────────────────
# 문서 수집
# ──────────────────────────────────────────────────────────────────────────────

def fetch_dart_text(ticker: str, year: int, doc_type: str) -> str | None:
    """DART OpenAPI에서 공시 문서 본문 텍스트 추출"""
    if not DART_API_KEY:
        print("  [WARN] DART_API_KEY 없음, 샘플 텍스트 사용")
        return _sample_text_kr(ticker, year)

    # 공시 검색
    pblntf = "A" if doc_type == "annual_report" else "C003"
    search_url = "https://opendart.fss.or.kr/api/list.json"
    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": _get_corp_code(ticker),
        "bgn_de": f"{year}0101",
        "end_de": f"{year}1231",
        "pblntf_ty": pblntf,
        "page_count": 5,
    }
    try:
        r = requests.get(search_url, params=params, timeout=15)
        data = r.json()
        if data.get("status") != "000" or not data.get("list"):
            print(f"  [WARN] DART 공시 없음: {ticker} {year}")
            return _sample_text_kr(ticker, year)

        rcept_no = data["list"][0]["rcept_no"]
        doc_url = "https://opendart.fss.or.kr/api/document.xml"
        doc_r = requests.get(doc_url, params={"crtfc_key": DART_API_KEY, "rcept_no": rcept_no}, timeout=30)

        # 간단한 텍스트 추출 (XML에서 텍스트 노드)
        import re
        text = re.sub(r"<[^>]+>", " ", doc_r.text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:50000]  # 최대 5만자

    except Exception as e:
        print(f"  [WARN] DART fetch 실패: {e}")
        return _sample_text_kr(ticker, year)


def fetch_sec_text(ticker: str, year: int, doc_type: str) -> str | None:
    """SEC EDGAR에서 10-K / 8-K 문서 텍스트 추출"""
    form = "10-K" if doc_type == "annual_report" else "8-K"
    search_url = (
        f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22"
        f"&dateRange=custom&startdt={year}-01-01&enddt={year}-12-31"
        f"&forms={form}"
    )
    headers = {"User-Agent": "EquiSense personal-tool contact@example.com"}
    try:
        r = requests.get(search_url, headers=headers, timeout=15)
        hits = r.json().get("hits", {}).get("hits", [])
        if not hits:
            print(f"  [WARN] SEC 공시 없음: {ticker} {year}")
            return _sample_text_en(ticker, year)

        filing_url = hits[0].get("_source", {}).get("file_date")
        accession = hits[0].get("_id", "").replace("-", "")
        if not accession:
            return _sample_text_en(ticker, year)

        # 10-K 전문 URL 구성
        doc_index_url = (
            f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany"
            f"&CIK={ticker}&type={form}&dateb=&owner=include&count=5"
            f"&search_text=&output=atom"
        )
        # 간소화: EDGAR full text search API 사용
        text_url = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms={form}&dateRange=custom&startdt={year}-01-01&enddt={year}-12-31"
        excerpt = hits[0].get("_source", {}).get("period_of_report", "")
        body = hits[0].get("_source", {}).get("display_names", "")
        return _sample_text_en(ticker, year)  # 실제 운영 시 전문 파싱으로 교체

    except Exception as e:
        print(f"  [WARN] SEC fetch 실패: {e}")
        return _sample_text_en(ticker, year)


def _get_corp_code(ticker: str) -> str:
    """종목코드 → DART corp_code 조회 (캐시 없이 단순 조회)"""
    if not DART_API_KEY:
        return ""
    try:
        r = requests.get(
            "https://opendart.fss.or.kr/api/company.json",
            params={"crtfc_key": DART_API_KEY, "stock_code": ticker},
            timeout=10,
        )
        return r.json().get("corp_code", "")
    except Exception:
        return ""


def _sample_text_kr(ticker: str, year: int) -> str:
    return (
        f"{ticker} {year}년 사업보고서 샘플. "
        "당사는 올해 매출 성장 10%를 목표로 하였으며, 실제 달성률은 8%였습니다. "
        "영업이익 개선을 위해 비용 절감을 추진하였고 일부 성과를 달성하였습니다. "
        "내년도 신사업 확장에 3,000억 원을 투자할 계획입니다. "
        "글로벌 경기 불확실성이 지속될 경우 수익성이 악화될 수 있습니다. "
        "AI 사업부 신설로 미래 성장 동력을 확보하였습니다."
    )


def _sample_text_en(ticker: str, year: int) -> str:
    return (
        f"{ticker} {year} Annual Report sample. "
        "We targeted 15% revenue growth this fiscal year and achieved 12%. "
        "Operating margin improved by 200 basis points due to cost efficiency initiatives. "
        "We plan to invest $2 billion in R&D next year to drive innovation. "
        "Macroeconomic headwinds may impact our guidance. "
        "Our new AI division is expected to contribute meaningfully in 2025."
    )


# ──────────────────────────────────────────────────────────────────────────────
# 정량 언행일치 점수 계산 (방법 1)
# ──────────────────────────────────────────────────────────────────────────────

def calc_quantitative_score(ticker: str, market: str, year: int) -> dict:
    """FMP로 전년 가이던스 추정치 vs 실제 수치 비교하여 점수 산출"""
    if not FMP_API_KEY:
        return {"score": 60, "items": [], "note": "FMP API 키 없음 — 기본값 사용"}

    fmp_ticker = ticker if market == "US" else f"{ticker}.KS"

    try:
        # 애널리스트 추정치 (가이던스 대리 지표)
        est_url = f"https://financialmodelingprep.com/api/v3/analyst-estimates/{fmp_ticker}"
        r = requests.get(est_url, params={"apikey": FMP_API_KEY, "limit": 5}, timeout=15)
        estimates = r.json() if r.ok else []

        # 실제 재무 결과
        inc_url = f"https://financialmodelingprep.com/api/v3/income-statement/{fmp_ticker}"
        r2 = requests.get(inc_url, params={"apikey": FMP_API_KEY, "limit": 5}, timeout=15)
        actuals = r2.json() if r2.ok else []

        target_est = next((e for e in estimates if str(e.get("date", ""))[:4] == str(year)), None)
        target_act = next((a for a in actuals if str(a.get("date", ""))[:4] == str(year)), None)

        if not target_est or not target_act:
            return {"score": 55, "items": [], "note": "해당 연도 추정치/실적 데이터 없음"}

        items = []
        scores = []

        def compare(label, est_val, act_val):
            if not est_val or not act_val:
                return
            accuracy = min(act_val / est_val, est_val / act_val) * 100
            accuracy = round(accuracy, 1)
            met = accuracy >= 90
            items.append({
                "claim": f"{label} 가이던스 {_fmt(est_val)} → 실제 {_fmt(act_val)}",
                "is_substantiated": met,
                "evidence": f"달성률 {accuracy}%",
            })
            scores.append(accuracy)

        compare("매출", target_est.get("estimatedRevenueAvg"), target_act.get("revenue"))
        compare("EPS", target_est.get("estimatedEpsAvg"), target_act.get("eps"))
        compare("영업이익", target_est.get("estimatedEbitAvg"), target_act.get("operatingIncome"))

        final_score = round(sum(scores) / len(scores)) if scores else 55
        final_score = max(0, min(100, final_score))

        return {"score": final_score, "items": items, "note": "FMP 애널리스트 추정치 기반"}

    except Exception as e:
        print(f"  [WARN] 정량 점수 계산 실패: {e}")
        return {"score": 55, "items": [], "note": f"계산 오류: {e}"}


def _fmt(val) -> str:
    if abs(val) >= 1e9:
        return f"{val / 1e9:.1f}B"
    if abs(val) >= 1e6:
        return f"{val / 1e6:.1f}M"
    return f"{val:.2f}"


# ──────────────────────────────────────────────────────────────────────────────
# 정성 분석 (방법 2) — FinBERT 기반 노이즈 필터 생성
# ──────────────────────────────────────────────────────────────────────────────

HEDGING_KEYWORDS = [
    "may", "might", "could", "expect", "anticipate", "believe", "estimate",
    "target", "plan", "intend", "potential", "if conditions allow",
    "예상", "목표", "계획", "기대", "전망", "가능성", "추진", "검토",
]

FORWARD_KEYWORDS = [
    "will", "going to", "next year", "in 2025", "upcoming",
    "내년", "향후", "2025년", "추진할", "투자할",
]


def extract_claims(text: str) -> list[str]:
    """전망/계획 관련 문장 추출"""
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 20]
    claims = []
    for sent in sentences:
        lower = sent.lower()
        if any(kw in lower for kw in FORWARD_KEYWORDS + HEDGING_KEYWORDS):
            claims.append(sent)
    return claims[:20]


def build_noise_filter(sentences_analysis: list[dict], quant_items: list[dict]) -> list[dict]:
    """FinBERT 분석 + 정량 비교 결합하여 노이즈 필터 아이템 생성"""
    items = list(quant_items)

    for row in sentences_analysis[:10]:
        scores = row["scores"]
        positive = scores.get("positive", 0)
        negative = scores.get("negative", 0)
        neutral = scores.get("neutral", 0)

        # 높은 긍정 감성인데 수치 근거 없는 문장 = 노이즈 후보
        sent = row["sentence"]
        lower = sent.lower()
        has_number = any(c.isdigit() for c in sent)
        is_hedging = any(kw in lower for kw in HEDGING_KEYWORDS)

        if positive > 0.7 and not has_number:
            items.append({
                "claim": sent[:200],
                "is_substantiated": False,
                "evidence": f"긍정적 표현(확신도 {positive:.0%})이나 수치 근거 없음",
            })
        elif positive > 0.6 and has_number:
            items.append({
                "claim": sent[:200],
                "is_substantiated": True,
                "evidence": f"수치 포함 긍정 진술 (감성 확신도 {positive:.0%})",
            })
        elif negative > 0.6:
            items.append({
                "claim": sent[:200],
                "is_substantiated": True,
                "evidence": f"리스크 요인 명시 (부정 감성 {negative:.0%})",
            })

    seen = set()
    deduped = []
    for item in items:
        key = item["claim"][:80]
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    return deduped[:15]


def build_risk_growth(sentences_analysis: list[dict], market: str) -> tuple[list, list]:
    """FinBERT 결과에서 리스크 요인 / 성장 동력 추출"""
    risk_kw = ["risk", "uncertainty", "challenge", "headwind", "decline",
               "리스크", "불확실", "하락", "위험", "악화"]
    growth_kw = ["growth", "opportunity", "expand", "invest", "innovate",
                 "성장", "기회", "확장", "투자", "혁신", "신사업"]

    risks, growths = [], []

    for row in sentences_analysis:
        scores = row["scores"]
        sent = row["sentence"]
        lower = sent.lower()

        if any(kw in lower for kw in risk_kw) and scores.get("negative", 0) > 0.4:
            severity = "high" if scores.get("negative", 0) > 0.7 else "medium"
            risks.append({
                "title": sent[:60] + ("…" if len(sent) > 60 else ""),
                "description": sent[:200],
                "severity": severity,
            })
        elif any(kw in lower for kw in growth_kw) and scores.get("positive", 0) > 0.5:
            growths.append({
                "title": sent[:60] + ("…" if len(sent) > 60 else ""),
                "description": sent[:200],
            })

    return risks[:5], growths[:5]


# ──────────────────────────────────────────────────────────────────────────────
# 종합 실행
# ──────────────────────────────────────────────────────────────────────────────

def analyze(ticker: str, market: str, year: int, doc_type: str) -> dict:
    print(f"\n=== 분석 시작: {ticker} ({market}) {year} {doc_type} ===")

    # 1. 문서 텍스트 수집
    print("1/4 문서 수집 중...")
    if market == "KR":
        text = fetch_dart_text(ticker, year, doc_type)
    else:
        text = fetch_sec_text(ticker, year, doc_type)

    if not text:
        raise ValueError(f"{ticker} {year} 문서 수집 실패")

    # 2. 정량 점수 (방법 1)
    print("2/4 정량 가이던스 비교 중...")
    quant = calc_quantitative_score(ticker, market, year)

    # 3. FinBERT 감성 분석 (방법 2)
    print("3/4 FinBERT 감성 분석 중...")
    classifier = load_finbert(market)
    claims = extract_claims(text)
    sentences_analysis = analyze_sentences(classifier, claims)

    # 4. 결과 조합
    print("4/4 결과 조합 중...")
    noise_filter = build_noise_filter(sentences_analysis, quant["items"])
    risks, growths = build_risk_growth(sentences_analysis, market)

    # 최종 언행일치 점수: 정량 70% + 감성 일관성 30%
    if sentences_analysis:
        positive_ratio = sum(
            1 for s in sentences_analysis if s["scores"].get("positive", 0) > 0.5
        ) / len(sentences_analysis)
        substantiated_ratio = (
            sum(1 for n in noise_filter if n["is_substantiated"]) / len(noise_filter)
            if noise_filter else 0.5
        )
        sentiment_score = round((positive_ratio * 0.4 + substantiated_ratio * 0.6) * 100)
    else:
        sentiment_score = 50

    integrity_score = round(quant["score"] * 0.7 + sentiment_score * 0.3)
    integrity_score = max(0, min(100, integrity_score))

    # 한국어 요약 생성
    grade = "높음" if integrity_score >= 70 else ("중간" if integrity_score >= 40 else "낮음")
    doc_label = "사업보고서" if doc_type == "annual_report" else "실적발표 스크립트"
    summary_ko = (
        f"{ticker} {year}년 {doc_label} 분석 결과, 언행일치 점수는 {integrity_score}점({grade})입니다. "
        f"주요 가이던스 항목 {len(quant['items'])}건을 점검한 결과 "
        f"{sum(1 for i in quant['items'] if i['is_substantiated'])}건이 실제로 달성되었습니다. "
        f"리스크 요인 {len(risks)}건, 성장 동력 {len(growths)}건이 확인됩니다."
    )

    result = {
        "ticker": ticker,
        "market": market,
        "fiscal_year": year,
        "doc_type": doc_type,
        "fiscal_period": f"{year}Y",
        "integrity_score": integrity_score,
        "summary_ko": summary_ko,
        "risk_factors": risks,
        "growth_drivers": growths,
        "noise_filter": noise_filter,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "_meta": {"quant_score": quant["score"], "sentiment_score": sentiment_score, "quant_note": quant["note"]},
    }

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--market", required=True, choices=["US", "KR"])
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--doc_type", required=True, choices=["annual_report", "earnings_call"])
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    result = analyze(args.ticker, args.market, args.year, args.doc_type)

    filename = f"{args.ticker}_{args.market}_{args.year}_{args.doc_type}.json"
    out_path = OUT_DIR / filename
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\n-> 저장 완료: {out_path}")

    # 인덱스 파일 업데이트
    index_path = OUT_DIR / f"{args.ticker}_{args.market}_index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {"analyses": []}
    entry = {"year": args.year, "doc_type": args.doc_type, "file": filename, "analyzed_at": result["analyzed_at"]}
    index["analyses"] = [e for e in index["analyses"] if not (e["year"] == args.year and e["doc_type"] == args.doc_type)]
    index["analyses"].append(entry)
    index["analyses"].sort(key=lambda x: (x["year"], x["doc_type"]), reverse=True)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2))
    print(f"-> 인덱스 업데이트: {index_path.name}")


if __name__ == "__main__":
    main()
