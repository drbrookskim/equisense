# 📊 차트패턴 종합 분석 가이드 v2.0
> 웹서비스 분석기능 적용을 위한 패턴 분류 체계  
> **v2.0 업데이트**: 캔들 분석 심화 / 투자원칙 / 매매타이밍 / 호가창 / Gap 전략 / 차트분석 3대요소 추가

---

## 목차
1. [패턴 분류 체계 개요](#1-패턴-분류-체계-개요)
2. [캔들의 기본 구조](#2-캔들의-기본-구조) ⭐NEW
3. [캔들 분석 심화](#3-캔들-분석-심화) ⭐NEW
4. [반전 패턴 (Reversal Patterns)](#4-반전-패턴)
5. [지속 패턴 (Continuation Patterns)](#5-지속-패턴)
6. [중립 패턴 (Neutral Patterns)](#6-중립-패턴)
7. [이동평균선 패턴](#7-이동평균선-패턴)
8. [수평선 패턴 (지지/저항)](#8-수평선-패턴)
9. [Gap & 특수 캔들 패턴](#9-gap--특수-캔들-패턴) ⭐NEW
10. [바닥 신호 패턴 (매집 패턴)](#10-바닥-신호-패턴)
11. [피보나치 패턴](#11-피보나치-패턴)
12. [SMC 매수 기회 패턴](#12-smc-매수-기회-패턴)
13. [투자원칙 — 종목선정 / 매수타이밍 / 매도타이밍](#13-투자원칙) ⭐NEW
14. [호가창 분석](#14-호가창-분석) ⭐NEW
15. [차트분석 3대요소 & 매매 프레임워크](#15-차트분석-3대요소--매매-프레임워크) ⭐NEW
16. [단타 매매 전략](#16-단타-매매-전략) ⭐NEW
17. [패턴별 신뢰도 & 진입 전략 요약표](#17-패턴별-신뢰도--진입-전략-요약표)
18. [웹서비스 적용 코드 구조](#18-웹서비스-적용-코드-구조)

---

## 1. 패턴 분류 체계 개요

```
chart_patterns/
├── candle_basics/         # 캔들 기본 구조 (NEW)
├── candle_advanced/       # 캔들 심화 분석 (NEW)
├── reversal/              # 추세 전환 패턴
│   ├── bearish/           # 하락 전환 (매도 신호)
│   └── bullish/           # 상승 전환 (매수 신호)
├── continuation/          # 추세 지속 패턴
├── neutral/               # 방향 미결정 (돌파 방향 확인 필요)
├── moving_average/        # 이동평균선 크로스
├── support_resistance/    # 수평 지지/저항선
├── gap_patterns/          # Gap 및 특수 캔들 (NEW)
├── bottom_signal/         # 바닥 매집 신호
├── fibonacci/             # 피보나치 리트레이스먼트
├── smc/                   # Smart Money Concepts
├── investment_rules/      # 투자원칙 (NEW)
├── order_book/            # 호가창 분석 (NEW)
└── trading_framework/     # 매매 프레임워크 (NEW)
```

### 신호 강도 등급
| 등급 | 설명 | 신뢰도 |
|------|------|--------|
| `STRONG_BUY` | 강력 매수 | 80~100% |
| `BUY` | 매수 | 65~79% |
| `WAIT` | 관망 | 50% |
| `SELL` | 매도 | 65~79% |
| `STRONG_SELL` | 강력 매도 | 80~100% |

---

## 2. 캔들의 기본 구조

### 가격 4요소
```yaml
candle_price_elements:
  시가: 장 시작 가격 (Open)
  종가: 장 마감 가격 (Close)
  고가: 최고 거래 가격 (High)
  저가: 최저 거래 가격 (Low)
```

### 구성 부위
```yaml
candle_parts:
  몸통: 시가와 종가 사이 구간 (Body)
  꼬리: 고가와 저가 표시선 (Wick/Shadow)
```

### 캔들 종류 및 색상
```yaml
candle_types:
  양봉 (빨간색):
    condition: 종가 > 시가
    meaning: 상승 (매수세 강세)
    
  음봉 (파란색/검정):
    condition: 종가 < 시가
    meaning: 하락 (매도세 강세)
    
  도지 (Doji):
    condition: 시가 ≈ 종가 (거의 일치)
    meaning: 시장 불확실성/중립 — 다음 봉에서 방향 결정
```

---

## 3. 캔들 분석 심화

### 3-1. 추세 전환 판단 (캔들 기반)

#### 상승 추세 중 하락 전환 신호
```yaml
pattern_id: CANDLE_BEARISH_REVERSAL
description: >
  상승 추세에서 저점을 깨는 음봉 출현
  → '하락추세로 전환됨' (상승추세가 끊어진다)
condition:
  - 상승 추세 진행 중
  - 음봉이 이전 저점 하향 이탈
signal: SELL
warning: 하락추세의 방향 전환(X) → 상승 지속 유지 상태
```

#### 상승 추세 지속 확인 패턴 (4단계)
```yaml
pattern_id: CANDLE_BULLISH_CONTINUATION_4STEP
steps:
  ①: 강한 양봉 출현 (상승추세 전환)
  ②: 조정 음봉 (되돌림)
  ③: 추가 양봉으로 상승 지속
  ④: 다시 조정 후 재상승

rules:
  rule_A: >
    강한 양봉에 대한 조정 음봉 → 상승 지속 신호
  rule_B: >
    조정 음봉이 아닌 하락추세의 방향을 전환하게 되는 음봉이면
    전날 양봉을 'Fake'로 보면 됨
  rule_C: >
    강하게 들어온 매수시(전날양봉)에 대한 조정 음봉은
    절대 전날 양봉의 저점을 이탈(X)
signal: BUY
```

### 3-2. 상승 장악형 캔들 (느낌표 패턴)
```yaml
pattern_id: BULLISH_ENGULFING_STRONG
description: >
  전날의 음봉을 뛰어넘는 캔들의 길이를 야기함
  (전가/전저 포함) → 해당 캔들 주가는 상승함
condition:
  - 전날 음봉 완전 포함하는 대형 양봉
  - 전가와 전저를 모두 커버
signal: STRONG_BUY
note: 갭 상승 후 이 패턴 나타나면 추가 상승 강력 신호
```

### 3-3. Gap과 전고점이 만나는 지점
```yaml
pattern_id: GAP_MEETS_RESISTANCE
description: >
  Gap 상승 후 전고점(저항선)과 만나는 지점에서
  'N'자형 패턴 형성 → 눌림사가 일어난다
pattern_shape: N자형
important_zone:
  - Gap 발생 가격대 (Gap + 지지)
  - ①으로 뒤이어지고 이탈 방지
  - ②으로 이탈 방지
action: >
  매수 가격을 정할 때, 중요한 가격대 즉 Gap을 발생시키는 가격대,
  세력이 지지해주는 가격대가 어디인지를 확인해서 매수한다
  (거래량 급증 확인, 20일선 등 이용 필요)
```

### 3-4. 십자도지 캔들
```yaml
pattern_id: DOJI_CROSS
description: >
  지지형 만든 이후 행동, 개미를 역이용한 행동.
  개미들을 받아주기 위한 세력의 캔들 (전략적 캔들).
  도지: 매도세/매수세가 더 이상 나오지 않는 것
  → 올라갈지, 아래로 갈지 결정을 짓는 봉(캔들)
  (주로 일봉에서 봄)
variants:
  복수개: 소규모 십자도지 여러 개 연속
  대수개: 대형 십자도지 — 이후 상승장악형캔들 출현 가능
key_insight: 십자도지는 몇 개라도 나올 수 있다
signal: WAIT  # 방향 결정 전 중립
```

### 3-5. 캔들 해석 기본 원칙
```yaml
candle_interpretation_rules:
  저점에서 발생 양봉: → 상승전환 / 고점에서 발생 양봉 → 하락전환 가능
  저점에서 십자도지: → 상승 지속 / 고점에서 십자도지 → 하락 지속 가능
  5일선 밑 십자도지: → 하락 지속
  전일음봉 < 당일양봉: → 상승
  전일양봉 > 당일음봉: → 하락

  장대음봉 (Gap) 세력이 담고나서는 (근거):
    - 장대양봉의 반(1/2)선을 지켜주는(상향)/안착 여부 확인
    - 갭 상승 후 하락 방어 (Gap 상승 → 하락 방어)
    - 이평선도 좋다 (5일선 활용)
```

---

## 4. 반전 패턴

### 4-1. 하락 반전 패턴 (Bearish Reversal) — `팔아라`

#### 🔴 쌍봉 (Double Top)
```yaml
pattern_id: DOUBLE_TOP
signal: STRONG_SELL
confidence: 100%
description: >
  두 개의 봉우리가 같은 수준에서 형성되며 상승 추세의 종료.
  두 번째 고점 형성 후 넥라인 이탈 시 하락 확정.
entry: 넥라인 하향 이탈 시 매도
stop_loss: 두 번째 고점 위
target: 넥라인에서 고점까지 높이만큼 하락
action: 폭락에 대비해
```

#### 🔴 하락 깃발 (Bearish Flag)
```yaml
pattern_id: BEARISH_FLAG
signal: SELL
confidence: 80%
entry: 깃발 하단 이탈 시 매도
action: 빨리 팔아
```

#### 🔴 하락 다이아몬드 (Bearish Diamond)
```yaml
pattern_id: BEARISH_DIAMOND
signal: SELL
confidence: 65%
action: 천천히 내려간다
```

#### 🔴 삼중 천정 / 삼증천정 (Triple Top)
```yaml
pattern_id: TRIPLE_TOP
signal: STRONG_SELL
confidence: 95%
entry: 넥라인 이탈 시
```

#### 🔴 헤드앤숄더 (Head & Shoulders)
```yaml
pattern_id: HEAD_AND_SHOULDERS
signal: STRONG_SELL
confidence: 90%
entry: 넥라인 하향 이탈 + 거래량 확인
stop_loss: 오른쪽 어깨 위
```

#### 🔴 상승 쐐기형 (Rising Wedge)
```yaml
pattern_id: RISING_WEDGE
signal: SELL
confidence: 75%
entry: 하단 추세선 이탈 시
```

---

### 4-2. 상승 반전 패턴 (Bullish Reversal) — `사라`

#### 🟢 역삼중천정 / 트리플바닥 (Triple Bottom)
```yaml
pattern_id: TRIPLE_BOTTOM
signal: STRONG_BUY
confidence: 95%
entry: 넥라인 상향 돌파 시
```

#### 🟢 쌍바닥 (Double Bottom)
```yaml
pattern_id: DOUBLE_BOTTOM
signal: STRONG_BUY
confidence: 85%
entry: 넥라인 상향 돌파 확인
stop_loss: 두 번째 저점 아래
target: 넥라인에서 저점까지 깊이만큼 상승
```

#### 🟢 역헤드앤숄더 (Inverse H&S)
```yaml
pattern_id: INVERSE_HEAD_AND_SHOULDERS
signal: STRONG_BUY
confidence: 85%
entry: 넥라인 상향 돌파 + 거래량 급증
```

#### 🟢 상승 깃발 (Bullish Flag)
```yaml
pattern_id: BULLISH_FLAG
signal: STRONG_BUY
confidence: 100%
entry: 깃발 상단 돌파 + 거래량 증가
action: 급하게 사 (폭등에 대비)
```

---

## 5. 지속 패턴

#### 🔴 하락 삼각형 / 하락 플래그
```yaml
pattern_id: DESCENDING_TRIANGLE
signal: SELL
entry: 수평 지지선 하향 이탈
```

#### 🟢 상승 삼각형 (Ascending Triangle)
```yaml
pattern_id: ASCENDING_TRIANGLE
signal: STRONG_BUY
confidence: 100%
entry: 수평 저항선 상향 돌파 + 거래량 확인
target: 삼각형 높이만큼 상승
```

---

## 6. 중립 패턴

#### ⚪ 삼각 수렴 (Symmetrical Triangle)
```yaml
pattern_id: SYMMETRICAL_TRIANGLE
signal: WAIT
note: 돌파 전 매수/매도 금지. 건들지 마 위험.
```

#### ⚪ 박스권 횡보 (Box Range)
```yaml
pattern_id: BOX_RANGE
signal: WAIT
entry: 박스 상단/하단 명확한 돌파 + 거래량 확인
```

---

## 7. 이동평균선 패턴

```yaml
ma_settings:
  단기선: 5MA
  중기선: 50MA
  장기선: 100MA
  초장기선: 200MA
```

#### 🟢 골든크로스 (Golden Cross)
```yaml
pattern_id: GOLDEN_CROSS
signal: BUY
condition:
  - 단기선 > 장기선 (상향 돌파)
  - 장기선 방향: 상승
invalid_condition: 장기선 하락 방향이면 매수 금지
```

#### 🔴 데드크로스 (Dead Cross)
```yaml
pattern_id: DEAD_CROSS
signal: SELL
condition:
  - 단기선 < 장기선 (하향 돌파)
  - 장기선 방향: 하락
invalid_condition: 장기선 상승 방향이면 매도 금지
```

### 이평선 가격대 분석 (NEW)
```yaml
ma_price_zone_analysis:
  단기 저항 가격대라인:
    - 5일선 위 — 매수 가능
    - 20일선 위 안착 시 상승 추세 강화
    
  단기 하단 가격대라인:
    - 5일선 아래 십자도지 → 하락 지속
    - 20일선 하향 이탈 → 추세 약화
    
  중기 하단 가이드라인:
    - 중기 지지선 역할
    
  가장조성 (상승 조정 국면):
    description: 5일선 → 20일선까지 가격조정 기간 기다림
    flow: 5일선 급등 후 20일선을 안정시킬 때까지 가격조 기다림
    
  가격조정 (하락 후 반등):
    description: 5일선 급등 후 20일선을 가격조정으로 떨어뜨려서 안내케함
    flow: 5일선 급등 → 20일선으로 되돌림 → 재상승

  새상봉 조건:
    ①: 전일 음봉 후 2 음봉의 70% 이상을 되돌리는 양봉
    ②: 여러간 횡보하면서 줄어드는 거래량 + 다시 증가하면서 횡보됐던 봉의 고점을 돌파

  시가 Gap 조건:
    description: 추가 상봉의 대한 가능성과 세력의 이탈 여부
```

---

## 8. 수평선 패턴

### 기본 원칙
```
수평선 요령: 2번 이상 반응한 지점에 선 긋기
```

#### 지지선 → 매수 / 저항선 → 매도
```yaml
support_entry: 지지선 도달 + 양봉 캔들 확인
resistance_entry: 저항선 도달 + 음봉 캔들 확인
```

#### 레지서포 전환 (SR Flip)
```yaml
pattern_id: SR_FLIP
bullish: 저항선 돌파 → 되돌림 → 지지 확인 → 매수 ④
bearish: 지지선 이탈 → 되돌림 → 저항 확인 → 매도
```

---

## 9. Gap & 특수 캔들 패턴

### 9-1. Gap의 종류와 의미

#### Gap 상승 기본 원칙
```yaml
pattern_id: GAP_UP_BASIC
description: >
  갭 상승 후 시가를 이탈 → 바로 새가돌다하면 매수 (상승 가속)
signal: BUY
condition: 갭 상승 + 시가 유지/상승 확인
```

#### Gap과 전고점 조합 (N자형)
```yaml
pattern_id: GAP_RESISTANCE_N_SHAPE
description: >
  갭 상승 후 전고점(저항) 만남 → N자형 눌림목 발생
  이후 눌림목 구간을 지지로 확인되면 재상승
key_zone: Gap 발생 가격대 + 세력 지지 확인 구간
entry: 눌림목 지지 확인 + 거래량 급증 + 20일선 참고
```

### 9-2. 단타 매매별 시간봉 활용
```yaml
scalping_timeframes:
  1분봉: Gap 상승 후 시가를 이탈 → 바로 새가돌다하면 매수 (상승 가속)
  3분봉: 5일선을 타고 간다
  5분봉: 하락극 없을 때 횡자도지 반성
  1일봉: 지지선 이탈하고 바로 회복하면서 저항선 돌파
  
  중요: >
    중요한 지지선(5/10/20일선 아탈) 이탈 후 바로 회복 → 차트(봉)을
    보이면서 바로 저항대를 돌파함
```

### 9-3. 도지+Gap 패턴 (상승으로 돌려세우는 패턴)
```yaml
pattern_id: DOJI_GAP_REVERSAL
description: >
  지지형 만든 뒤 행동 + 개미를 역이용한 행동
  개미들을 받아주기 위한 세력의 캔들 (전략적)
  → 도지: 매도/매수세가 더 이상 나오지 않는 것
  → 올라갈지/아래로 갈지 결정짓는 봉

example_patterns:
  복수개 도지: 소형 십자도지 여러 개 → 이후 대형 상승장악형 캔들
  대수개 도지: 대형 도지 → 강한 방향성 캔들 예고
  
key_insight: 십자도지는 몇 개라도 나올 수 있다!
```

### 9-4. 캔들 방향 판단 규칙 (요약)
```yaml
candle_direction_rules:
  - "저점에서 발생 → 상승전환 / 고점에서 발생 → 하락전환"
  - "저점이면 상승지속 / 고점이면 하락지속"
  - "5일선 밑 십자도지 → 하락지속"
  - "전일음봉 < 당일양봉 → 상승"
  - "전일양봉 > 당일음봉 → 하락"
  - "장대음봉 Gap 세력이 담고나서는: 장대양봉의 1/2선 지켜주는지 확인"
```

---

## 10. 바닥 신호 패턴

### 바닥 신호 1: 사자 입 패턴
```yaml
pattern_id: BOTTOM_BULLISH_ENTRY
conditions:
  - 바닥권 소형 양봉 연속
  - 십자형(도지) 캔들
  - 대형 양봉 + 거래량 급증
entry: 큰 양봉 + 바닥 거래량 함께 나타날 때
```

### 바닥 신호 2: 매집 기둥형
```yaml
pattern_id: BOTTOM_ACCUMULATION_PILLAR
indicators:
  KDJ: 골든크로스
  CCI: -200 이하
conditions:
  - 횡보 후 중장대 음봉 저점 이탈
  - 거래량 서서히 증가하며 돌파
```

### 바닥 신호 3: 음양 누적량
```yaml
pattern_id: BOTTOM_VOLUME_ACCUMULATION
conditions:
  - 3일+ 소형 캔들 + 거래량 감소
  - 장대 양봉 출현 + 저점 돌파
```

### 바닥 패턴 4: 10주선 되돌림
```yaml
pattern_id: BOTTOM_10MA_PULLBACK
entry: 10주선 강한 돌파로 회복
ma_reference: { 10일선: 단기 지지, 20일선: 저점 방어 }
```

### 바닥 패턴 5: 상승 갭 이탈
```yaml
pattern_id: BOTTOM_GAP_UP
conditions:
  - 5/10/20일선 위 위치
  - 장대 양봉 + 갭 상승
  - 거래량 20일선 위 급증
```

### 바닥 패턴 6: 하락장악양봉
```yaml
pattern_id: BOTTOM_BEARISH_ENGULF_REVERSAL
entry: 장대 양봉 후 거래량 크게 증가 → 다음날 재진입
```

### 바닥 패턴 7: 미인의 긴 다리
```yaml
pattern_id: BOTTOM_LONG_LOWER_SHADOW
entry: 긴 아래꼬리 양봉 출현 후 저점 최대한 낮게 흡수
```

---

## 11. 피보나치 패턴

### 진입 리트레이스먼트
```yaml
entry_zone: 38.2% ~ 61.8%
preferred: 38.2% (충동적), 61.8% (골든존)
```

### 익절 프로젝션
```yaml
profit_targets:
  - -0.272% (1차)
  - -0.618% (2차)
note: 높은 시간프레임 키레벨 결합 시 신뢰도 상승
```

---

## 12. SMC 매수 기회 패턴

| 전략 | 진입 레벨 | 손절 |
|------|----------|------|
| 충동적 움직임 | 38.2% | 61.8% |
| 골든 존 | 61.8% | 88.6% |
| 기관 레벨 | 78.6% | 113% |

---

## 13. 투자원칙

> ⭐ NEW — IMG_9788, IMG_9789 기반

### 13-1. 종목 선정 기준
```yaml
stock_selection_criteria:
  ①_주가: 주가 5,000원 이상 (↑)
  ②_시가총액: 시가총액 500억 이상 (↑)
  ③_PEG:
    저평가: PEG '1' 이하
    고평가: PEG '1.5' 이상
  ④_이구분: 진전년도 '예상(매수)'에서 '+'쪽 전환
  ⑤_PER_PBR: PER × PBR = '20' 이하 (↓)
```

### 13-2. 매수 타이밍 (9가지 조건)
```yaml
buy_timing_conditions:
  ①: 60일선 돌파 or 그 위에 위치했을 때 (누봉선, 상승곡면) — 돌리지
  ②: 20일선 위에서 추세선을 따라가진 않을 때 (상승추세)
  ③: 거래량이 최근 높았던 峰 거래량의 절반은 넘겼을 때
  ④: 이격도가 좁아지고, 골든크로스 직전이고, 정배열 시작 시작
  ⑤: 컵 모양 캔들의 속정아부분이 나타났을 때 (∪자형) → 매수 신점
  ⑥: 저점을 높여가는 추세일 때
  ⑦: 단타는 무릎에서 매수, 무릎은 분할매수 (20일선 이탈 시 3차매수, 60일선 이탈 시 2차/3차 매수)
  ⑧: 화가진량(con수/매도) 에서 매도화 물량이 2배이상 않을 때
  ⑨: 전저점을 깨지 않고 거래량의 항극한 증가는 즉시 전환신호 → 매수
```

### 13-3. 매도 타이밍 (4가지 조건)
```yaml
sell_timing_conditions:
  ①: 3%, 5%, 10% 분할매도
  ②: 20일선 이탈 시 매도
  ③: Round Figure 근처 2~3회가 넘으면 가격이 매도 (매수도 마찬가지)
  ④: 주가급락 시, 거래량 확인 — 없다면 재상봉 이견, 있다면 재상봉 되움
```

### 13-4. 매매타이밍 — 특수 상황
```yaml
special_buy_scenarios:
  변동성이_클때_항상_매매타이밍:
    - 데섹리스트를 안들려면 (시장이 패닉인데, 무러진 살 수 없는 종목)
    
  지정학적_리스크가_있을때:
    - 테러나 금융리스크 등 강정영향
    
  분기실적_발표가_없을때:
    - 잠깐까지 강했던 종목을 찾아서 매수 진입

  정형화된_시나리오:
    scenario_A: >
      사고 싶은 종목이 약세장이면 오전에 사자마라
      거래량이 나는 거 보고 양봉 않잡지 시 [1차매수 및 분할매수] 이후
      하락하면 분할매수하지만고 다시 상봉하면 [2차 분할매수]
    scenario_B: >
      하락하는 종목은 오후에 같이 매수,
      강재종목이면 오전에 매수 (9:00 ~ 9:30)
      좀 더 싼 가격이 사려고 하지 말고 아침이 변동성이 않는다라는 매수
      (신리종목 下) — 약간 비싸더라도
```

---

## 14. 호가창 분석

> ⭐ NEW — IMG_9790 기반

### 호가창 구조 (예시: 삼성전자)
```
매도잔량  호가
4,450
4,400
44,350 ← 매도호가
4,300
4,250 ② 매수우위
4,200 ← 매수가
4,150
4,100
─────────────
55,952 : 26,082  ← ① 매수량 vs 매도량
```

### 종도호가창이란?
```yaml
order_book_analysis:
  기본원칙:
    ①: 매수량 > 매수량 (매수잔량 우세 확인)
    ②: 매수량의 가격대에 매물이 쌓여 있어야 한다
        (있으면 힌트, 없으면 한 거뻔에 이럼)

  상승 → 조정 (매도타이밍):
    3/단타매매님...
    - 올라가길면 내려가는 침이 있다
    - 올라가의 절반을 지났때 매도하자

  주식시장_수명도:
    season: 11월 ~ 4월이 발생한다
    trend: 최근 3~12개인 오를놈은 계속 오를 경향이 높다
    rule: 최근 3개월 수익이 (+) 인 경우이면 투자
```

---

## 15. 차트분석 3대요소 & 매매 프레임워크

> ⭐ NEW — IMG_9793 기반

### 차트 분석 3대요소
```yaml
chart_analysis_3_elements:
  ①_캔들: 캔들 패턴 분석 (단기 신호)
  ②_거래량: 거래량 분석 (추세 강도 확인)
  ③_이동평균선: 이동평균선 분석 (중장기 방향)

  분석_순서: >
    거래량 → 캔들 → 이동평균선 → 보조지표
    (캔들은 변화가 없어도 거래량은 변화한다. 중/고봉)

  핵심_인사이트: >
    캔들은 변화가 없어도 거래량은 변화한다!
    (단기적 추세 / 세력의 움직임 / 저항적 추세)
```

### 단기 저항 상단 가이드라인 매매 프레임
```yaml
price_action_framework:
  단기_저항_상단_가이드라인:
    entry: 저항선 돌파 시 → 매수하자
    
  단기_하단_가이드라인:
    entry: ① 매수하자 / ② 매수하자 (반등 확인 후)
    
  중기선_하단_가이드라인:
    note: 중기선 하단 참고선 (추가 지지 확인 필요)
```

### 피봇(Pivot) 계산
```yaml
pivot_calculation:
  formula: Pivot = (전일고가 + 전일저가 + 전일종가) / 3
  usage: 차트 3대요소 → 캔들, 이동평균선, 거래량 (이동평균선)
```

---

## 16. 단타 매매 전략

> ⭐ NEW — IMG_9792, IMG_9793, IMG_9794, IMG_9795 기반

### 16-1. 단타 시간봉별 전략
```yaml
scalping_strategy:
  1분봉: Gap 상승 후 시가 이탈 → 바로 새가돌다하면 매수 (상승 가속)
  3분봉: 5일선을 타고 간다
  5분봉: 하락 극 없을 때 횡자도지 반성
  1일봉: 지지선 이탈 후 바로 회복하면서 저항선 돌파

  핵심: >
    중요 지지선(5/10/20일선 아탈) 이탈 후 바로 회복하는 차트(봉)를
    보이면서 바로 저항대를 돌파함
```

### 16-2. 십자양봉 (단타 신호)
```yaml
pattern_id: CROSS_CANDLE_BUY
description: >
  5일선 위에 있으면서 20일선 봉의 윗꼬리가 근처에 있는 종목
  (단, 20일선 밑이나 5일선 밑에 있는(이평선) 종목 — 매수하지)
conditions:
  - 5일선 위 위치
  - 20일선 봉 윗꼬리 근처
  - 5일선 / 20일선 위 확인 필수
signal: BUY
```

### 16-3. 가장조성 vs 가격조정
```yaml
phase_analysis:
  가장조성 (시간적 조정):
    description: 5일선 급등 후 20일선을 안정시킬 때까지 기간을 기다림
    chart: 5일선 → 상승 → 20일선까지 기간 조정
    action: 5일선 급등 후 20일선을 안정될 때까지 기간으로 기다림
    
  가격조정 (가격적 조정):
    description: 5일선 급등 후 20일선을 가격조정으로 떨어뜨려서 안내케 함
    chart: 5일선 급등 → 20일선으로 가격 하락 → 재상승
    action: 5일선 급등 후 20일선을 가격조정으로 안내하며 재진입
```

### 16-4. 새상봉 & Gap 조건
```yaml
saesangbong_conditions:
  ①: 전일 음봉 후 2 음봉의 70% 이상을 리복하는 양봉
  ②: >
    여러 간 횡보하면서 줄어드는 거래량이 다시 증가하면서
    횡보됐던 봉의 고점을 돌파

gap_entry_condition:
  description: 시가 Gap 조건은 추가 상봉의 대한 가능성과 세력의 이탈 여부
  buy_signal: Gap 발생 + 세력 지지 확인
```

---

## 17. 패턴별 신뢰도 & 진입 전략 요약표

### 매수 패턴 (Bullish)

| 패턴명 | ID | 신뢰도 | 진입 조건 | 손절 기준 |
|--------|-----|--------|-----------|-----------|
| 역삼중천정 | `TRIPLE_BOTTOM` | ⭐⭐⭐⭐⭐ 95% | 넥라인 돌파 | 세 번째 저점 아래 |
| 역헤드앤숄더 | `INVERSE_H_S` | ⭐⭐⭐⭐ 85% | 넥라인 돌파+거래량 | 오른쪽 어깨 아래 |
| 쌍바닥 | `DOUBLE_BOTTOM` | ⭐⭐⭐⭐ 85% | 넥라인 돌파 | 두 번째 저점 아래 |
| 상승 깃발 | `BULLISH_FLAG` | ⭐⭐⭐⭐⭐ 100% | 깃발 상단 돌파 | 깃발 하단 |
| 상승 삼각형 | `ASCENDING_TRIANGLE` | ⭐⭐⭐⭐⭐ 100% | 수평 저항 돌파 | 삼각형 내 재진입 |
| 골든크로스 | `GOLDEN_CROSS` | ⭐⭐⭐⭐ 80% | 단기>장기 돌파 | 장기선 이하 |
| 상승 장악형 | `BULLISH_ENGULFING` | ⭐⭐⭐⭐⭐ 90% | 전일 음봉 완전 포함 | 전일 저점 |
| Gap+지지 확인 | `GAP_SUPPORT` | ⭐⭐⭐⭐ 85% | Gap+세력 지지 확인 | Gap 하단 |
| 십자도지 후 양봉 | `DOJI_REVERSAL` | ⭐⭐⭐⭐ 80% | 도지 후 대형 양봉 | 도지 저점 |
| 상승 갭 이탈 | `BOTTOM_GAP_UP` | ⭐⭐⭐⭐⭐ 90% | 갭+거래량 급증 | 갭 하단 |

### 매도 패턴 (Bearish)

| 패턴명 | ID | 신뢰도 | 진입 조건 | 손절 기준 |
|--------|-----|--------|-----------|-----------|
| 쌍봉 | `DOUBLE_TOP` | ⭐⭐⭐⭐⭐ 100% | 넥라인 하향 이탈 | 두 번째 고점 위 |
| 삼중 천정 | `TRIPLE_TOP` | ⭐⭐⭐⭐⭐ 95% | 넥라인 이탈 | 세 번째 고점 위 |
| 헤드앤숄더 | `H_S` | ⭐⭐⭐⭐ 90% | 넥라인 이탈+거래량 | 오른쪽 어깨 위 |
| 저점 하향 이탈 | `LOWER_LOW` | ⭐⭐⭐⭐ 85% | 전 저점 이탈 | 이탈 캔들 고가 |
| 데드크로스 | `DEAD_CROSS` | ⭐⭐⭐⭐ 80% | 단기<장기 | 장기선 위 |
| 하락 깃발 | `BEARISH_FLAG` | ⭐⭐⭐⭐ 80% | 깃발 하단 이탈 | 깃발 상단 |
| 20일선 이탈 | `MA20_BREAKDOWN` | ⭐⭐⭐ 75% | 20일선 하향 이탈 | 20일선 위 |

### 관망 패턴 (Neutral)

| 패턴명 | ID | 신뢰도 | 조건 |
|--------|-----|--------|------|
| 삼각 수렴 | `SYMMETRICAL_TRIANGLE` | 50% 양방향 | 돌파+거래량 필수 |
| 박스권 | `BOX_RANGE` | 50% 양방향 | 상/하단 명확 이탈 |
| 십자도지 단독 | `DOJI_ALONE` | 50% | 다음 봉 방향 확인 |

---

## 18. 웹서비스 적용 코드 구조

```python
# 패턴 감지 결과 데이터 구조 (v2.0)
pattern_result = {
    "pattern_id": "BULLISH_ENGULFING",
    "pattern_name": "상승 장악형",
    "signal": "STRONG_BUY",       # STRONG_BUY | BUY | WAIT | SELL | STRONG_SELL
    "confidence": 90,
    "category": "candle_advanced", # candle_basics | candle_advanced |
                                   # reversal_bearish | reversal_bullish |
                                   # continuation | neutral | ma_cross |
                                   # support_resistance | gap_patterns |
                                   # bottom_signal | fibonacci | smc |
                                   # investment_rules | order_book | trading_framework
    "entry_condition": "전일 음봉 완전 포함 장대 양봉",
    "stop_loss": "전일 저점 하향 이탈 시",
    "target": "다음 저항선",
    "action_message": "갭 상승 후 추가 상승 대비",
    "chart_analysis_3": {          # 차트분석 3대요소
        "candle": "상승 장악형 확인",
        "volume": "전일 대비 200% 증가",
        "ma": "5일선 > 20일선 (정배열)"
    },
    "detected_at": "2026-05-23T10:00:00",
}

# 투자원칙 종목 필터링
stock_filter = {
    "min_price": 5000,
    "min_market_cap": 50_000_000_000,  # 500억
    "peg_max": 1.0,
    "per_x_pbr_max": 20,
}

# 매수 타이밍 체크리스트
buy_checklist = [
    "ma60_breakout",       # 60일선 돌파
    "ma20_above",          # 20일선 위 추세선 유지
    "volume_above_half",   # 거래량 최고점의 절반 이상
    "golden_cross_near",   # 골든크로스 직전
    "cup_pattern",         # 컵 모양 캔들
    "higher_low",          # 저점 높아지는 추세
    "dip_buy",             # 무릎 분할매수
    "volume_surge",        # 거래량 급증 전환
]
```

```javascript
// 신호 색상 매핑 (프론트엔드)
const SIGNAL_COLORS = {
  STRONG_BUY:  { bg: '#006400', text: '#fff', label: '강력 매수' },
  BUY:         { bg: '#228B22', text: '#fff', label: '매수' },
  WAIT:        { bg: '#B8860B', text: '#fff', label: '관망' },
  SELL:        { bg: '#DC143C', text: '#fff', label: '매도' },
  STRONG_SELL: { bg: '#8B0000', text: '#fff', label: '강력 매도' },
};

// 차트분석 3대요소 점수화
const calcChartScore = ({ candle, volume, ma }) => {
  return (candle * 0.4) + (volume * 0.35) + (ma * 0.25);
};
```

---

## 변경 이력

| 버전 | 날짜 | 추가 내용 |
|------|------|-----------|
| v1.0 | 2026-05-23 | 초기 작성 (16장 이미지 기반) |
| v2.0 | 2026-05-23 | 캔들 기본/심화, 투자원칙, 매수/매도 타이밍, 호가창, Gap 전략, 차트3대요소, 단타전략 추가 (9장 HEIC + 마인드맵 기반) |

---

*분석 기반: 총 26장 이미지 (IMG_0094, IMG_0107~0121, IMG_9787~9795, NotebookLM_Mind_Map-2)*  
*작성일: 2026-05-23*
