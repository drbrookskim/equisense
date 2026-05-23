"""
scripts/moat_scores.json (수동 관리)을 읽어 프론트엔드 JSON으로 변환합니다.
출력: frontend/public/data/moat/{ticker}_{market}.json
"""

import json
from datetime import datetime, timezone
from pathlib import Path

SCORES_PATH = Path(__file__).parent / "moat_scores.json"
OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data" / "moat"

GRADE_THRESHOLDS = {"wide": 7.0, "narrow": 4.0}


def compute_grade(composite: float) -> str:
    if composite >= GRADE_THRESHOLDS["wide"]:
        return "wide"
    if composite >= GRADE_THRESHOLDS["narrow"]:
        return "narrow"
    return "none"


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    scores_data = json.loads(SCORES_PATH.read_text())

    for entry in scores_data["scores"]:
        ticker = entry["ticker"]
        market = entry["market"]
        dims = entry["dimension_scores"]

        composite = round(sum(d["score"] for d in dims) / len(dims), 2)
        grade = compute_grade(composite)

        output = {
            "ticker": ticker,
            "market": market,
            "fiscal_year": entry["fiscal_year"],
            "dimension_scores": dims,
            "composite_score": composite,
            "grade": grade,
            "analyst_note": entry.get("analyst_note"),
            "scored_at": datetime.now(timezone.utc).isoformat(),
        }

        out = OUT_DIR / f"{ticker}_{market}.json"
        out.write_text(json.dumps(output, ensure_ascii=False, indent=2))
        print(f"Saved moat: {out.name} (grade={grade}, score={composite})")


if __name__ == "__main__":
    main()
