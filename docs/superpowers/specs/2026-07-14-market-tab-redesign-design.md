# 시장 상황 탭 재구성 — 설계 스펙

작성일 2026-07-14. 대상: 데스크톱 `DesktopMarket` (`/market`). **대시보드는 이번 범위 밖.**
프론트 브랜치 `feat/market-tab-redesign` (main 기준 신규 생성). 백엔드 브랜치 `feat/newcomer-trend-stat` (main 기준 신규 생성).

이 문서는 구현을 맡을 팀원이 이 파일만 보고 작업할 수 있도록 위젯별 처리(유지/재프레이밍/제거),
근거 데이터 출처, 신규 백엔드 스펙, 파일별 변경 범위, 체크리스트까지 전부 담는다.

---

## 1. 왜 다시 짜는가

현재 `DesktopMarket`(`src/desktop/pages/placeholders.tsx:780`)은 21개 위젯 카탈로그
(`src/career/widgetCatalog.ts`의 `MARKET_WIDGETS`)가 5개 섹션(수요/트렌드/기업·역량/구조·탐색/글로벌)에
데이터 카테고리별로 나열되어 있다. 문제는 두 가지:

1. **정확히 뽑아야 할 신호(시장의 흐름·현재 지표)보다 스킬 나열형 위젯이 먼저 눈에 띈다.** "상위 요구 기술
   Top14"·"신입에게 열린 기술"은 스냅샷 랭킹이라 신입 개방도 데이터를 스킬 단위로 쪼개면 ML/DL 같은
   고급 기술이 상위권에 섞여 나와 "신입한테 이걸 배우라는 거냐"는 오해를 만든다. 데이터는 유효하지만
   **프레이밍이 취준생의 실제 질문(신입에게 문이 얼마나 열려있나)과 어긋난다.**
2. **일부 위젯이 실데이터 기반인지 구분 없이 나란히 배치돼 있다.** 아래 §2에서 실제로 검증한 결과,
   진짜 fake 데이터는 2개뿐이지만(§2-C) 조사 전에는 훨씬 많아 보였다 — 이 구분을 명확히 하는 것 자체가
   이번 스펙의 핵심 산출물이다.

재구성 원칙: **데이터 카테고리가 아니라 취준생의 질문 기준으로 섹션을 재편**하고, 좌상단(위쪽)에 가장
유용한 것부터 배치, 탐색적/오락성 위젯은 하단 "더 보기" 접힘 섹션으로 내린다.

---

## 2. 위젯별 데이터 출처 실사 결과 (반드시 읽을 것)

작업 전에 위젯 하나하나의 실제 데이터 소스를 코드에서 직접 확인했다. **과거 진행 원장(`progress.md`)의
기록과 실제 코드가 어긋나는 부분이 있으니, progress.md를 보고 지레짐작하지 말고 아래 표를 기준으로 삼을 것.**

### A. 백엔드 라이브 엔드포인트로 서빙 (실시간, `app/routers/insight.py`)

| 위젯 catalog id | 라벨 | 엔드포인트 | 프론트 호출 위치|
|---|---|---|---|
| `leaderboard`, `hero-demand` | 상위 요구 기술 / 수요 리더보드 | `GET /stats/skill-share` | `career/api.ts:176` |
| (신입 스킬 리스트, catalog엔 별도 id 없음) | 신입에게 열린 기술 | `GET /stats/newcomer-gate` | `career/api.ts:177` |
| `yearly-trend`, `movers` | 연도별 점유율 추이 / 급상승·급감 | `GET /stats/skill-trend-yearly` | `career/api.ts:178` |
| `network` | 기술 공동출현 네트워크 | `GET /stats/cooccurrence` | `career/api.ts:179` |
| `hot-companies` | 이번 달 활발 기업 | `GET /stats/hot-companies` | `career/api.ts:180` |
| `region-density` | 지역별 공고 밀도 | `GET /stats/region-density` | `career/api.ts:181` |
| `posting-calendar` | 채용 공고 등록 캘린더 | `GET /stats/posting-timeline` | `career/api.ts:182` |
| `response-rate` | 응답 잘 오는 회사 | `GET /stats/response-rate` | `career/api.ts:183` |
| `global-domestic-gap` | 글로벌 vs 국내 격차 | `GET /stats/global-domestic-gap` | `career/api.ts:184` |
| `hype-vs-hire` | Hype vs Hire | `GET /trend/hype-vs-hire` | `career/api.ts:185` |
| `github-chronicle` | GitHub 스타 순위 변천사 | `GET /trend/github-chronicle` | `career/api.ts:186` |
| `github-topics` | 오픈소스 관심 vs 수요 | `GET /trend/github-topics` | `career/api.ts:187` |
| `trend-chronicle` | 기술 트렌드 연대기 | `GET /stats/skill-trend-yearly` 재사용(라이브) + 정적 폴백 | `career/wowWidgets.tsx:656` |

→ **`Promise.allSettled` 실패/빈 응답 시 `career/useWidgetData.ts`가 정적 JSON으로 조용히 폴백**한다는
점은 기존 그대로 유지. 이번 재구성이 이 하이브리드 패턴 자체를 바꾸진 않는다.

### B. 백엔드에 엔드포인트는 있는데 프론트에서 전혀 안 쓰고 있음 (미배선, 재사용 가능)

| 엔드포인트 | 내용 | 비고 |
|---|---|---|
| `GET /stats/hiring-season` | 월별 채용 성수기 지수 | `posting-calendar`와 겹치는 정보라 이번엔 배선 안 함(§4 비목표) |
| `GET /stats/industry-fingerprint` | 산업별 기술 지문 | 표본 얇음(코드 주석) — 이번 범위 밖 |
| `GET /stats/role-stack-fit` | 직무-스택 적합도 | 개인화 성격이라 대시보드 후보(이번 범위 밖) |

### C. **진짜 fake 데이터 — 제거 대상 (확정)**

| 위젯 catalog id | 라벨 | 근거 |
|---|---|---|
| `tier-donut` | 기업 규모 분포 | `placeholders.tsx:904`의 `tierDonut`이 `data.postings`(클라이언트 mock `careerData.json`)의 `p.tier` 필드를 직접 읽음. **DB `Posting` 모델에 기업 규모 필드 자체가 없다**(`app/models/posting.py` 확인). 100% 가짜. |
| `tier-compare` | 기업 규모별 요구 차이 | `career/insights.tsx:333`의 `TierCompareChart`. 국내 유명 기업 **20개씩 수동 분류한 60개 기업**짜리 별도 curated 데이터셋(`TIER_DATA`)이며, 실제 공고 풀 전체와 무관. 카드 하단에 "실제 매출/인원 기준 아님"이라고 작게 고지돼 있지만 눈에 잘 안 띔. |

**⚠️ 주의**: 이 둘을 지울 때 `TierCompareChart`/`TierDonutChart`/`TIER_HEAT_TECHS`/`TIER_LIST`/`TIER_DATA`/`TIER_COLOR`
(모두 `career/insights.tsx`)를 **완전히 삭제하면 안 된다** — `career/MarketScreen.tsx`(모바일 시장 화면)가
같은 컴포넌트·상수를 그대로 쓰고 있다. 이번 스펙은 **데스크톱 전용**이므로, 데스크톱 `placeholders.tsx`의
`DesktopMarket`에서 해당 JSX 블록과 `tierDonut` 계산부만 제거하고, `insights.tsx`의 공용 export는 그대로 둘 것.
모바일 쪽 정리는 별도 스펙으로 분리한다(§6 비목표).

### D. 조사 전엔 fake로 의심했으나, 실제로는 실데이터 — **제거하지 않는다 (정정)**

과거 `progress.md`엔 "ETL 미실행/설립연도 데이터 없음"으로 기록돼 있었지만, 실제 JSON 파일을 열어보니
전부 `../data-collector-script/`(백엔드·프론트와 별도인 형제 저장소)의 오프라인 파이프라인이 실제 공고
텍스트에서 뽑아낸 **정적 스냅샷**이다. 라이브 API가 아닐 뿐 가짜 데이터가 아니다.

| 위젯 catalog id | 라벨 | 데이터 파일 | 근거 |
|---|---|---|---|
| `generation-trend` | 레거시 → 신진 스택 변화 | `src/data/pearl/g.json` | 점핏 등록 기업 2,993건, `establishDate` 98% 커버리지 기준 실측 (`sample_note` 필드 확인) |
| `concept-signal` | 개념 → 기술 시그니처 | `src/data/conceptReal.json` | 실공고 4,097건, lexicon 기반 추출. `_meta.simulated: false`, note에 "시뮬레이션 아님" 명시 |
| `competency` | 회사가 원하는 역량 | `src/data/competencyData.json` | 실공고 4,097건(jumpit+wanted), 자유텍스트 lexicon 매칭. `../data-collector-script/extract_competency.py`가 생성 |

→ 처리 방침: **유지하되 "정적 스냅샷(as_of 날짜)" 라벨을 카드에 명시**해서 다른 실시간 위젯과 신뢰도
구분이 가능하게 한다. 리라이브(백엔드 엔드포인트화)는 이번 범위 밖 — 필요해지면 별도 스펙.

---

## 3. 새 레이아웃 — 질문 중심 3단 + 더 보기

섹션 이름을 데이터 카테고리("수요/트렌드/기업·역량")에서 **취준생이 실제로 묻는 질문**으로 바꾼다.
위에서 아래로 갈수록 우선순위가 낮아진다.

### Section 1 — "지금 시장이 어떻게 움직이나" (최상단, 히어로)
- `yearly-trend` 연도별 점유율 추이 (기존 유지)
- `movers` 급상승·급감 Top (기존 유지)
- `posting-calendar` 채용 공고 등록 캘린더 (기존 "기업·역량" 섹션에서 이동 — 계절성 정보라 여기가 더 맞음)

### Section 2 — "신입에게 문이 얼마나 열려있나" (신규 프레이밍, §4 참조)
- **[신규] `newcomer-trend` 신입/경력무관 비율 추이 + 직무별 신입 문호 지수** — 히어로 위젯
- `response-rate` 응답 잘 오는 회사 (기존 유지, 이 섹션으로 이동 — "기업이 얼마나 적극적인지"는 문호 지수와 결이 같음)
- 기존 "상위 요구 기술 Top14"·"신입에게 열린 기술" 스킬 리스트는 **삭제하지 않고** 이 섹션 하단에
  압축된 참고 위젯(각 top 5, `1x1` 크기)으로 축소 배치. 스킬 레퍼런스 자체의 효용은 있으니 완전 제거는 과함.

### Section 3 — "어디서, 누가 뽑나"
- `hot-companies` 이번 달 활발 기업 (기존 유지)
- `region-density` 지역별 공고 밀도 (기존 유지)

### "더 보기" (기본 접힘 — 기존 "구조·탐색" 섹션의 progressive disclosure 패턴 그대로 재사용)
`network`(공동출현 네트워크), `propagation`(트렌드 전파 네트워크), `scatter`(수요×빈도 분포),
`generation-trend`, `concept-signal`, `competency` (셋 다 "정적 스냅샷" 라벨 부착),
`trend-chronicle`, `hype-vs-hire`, `github-chronicle`, `github-topics`, `global-domestic-gap`

### 제거
`tier-compare`, `tier-donut` (§2-C 사유)

### 위젯 개수 요약
21개 → 19개(2개 제거) 중 상단 3섹션엔 **7개만** 노출(신규 1개 포함), 나머지 12개는 접힘. 상단에서
"선택과 집중"이 실제로 체감되도록 하는 게 핵심이다.

---

## 4. 신규 백엔드 작업 — `/stats/newcomer-trend`

기존 `/stats/newcomer-gate`는 **스킬 단위** open_rate만 반환한다(시계열 없음, 직무 breakdown 없음).
Section 2 히어로 위젯을 위해 **비율·추이 중심**의 신규 집계가 필요하다.

### 스펙

```
GET /api/v1/stats/newcomer-trend
Query:
  pool: "domestic" | "global" = "domestic"
  months: int (1~36) = 12

Response 200:
{
  "as_of": "2026-07-14",
  "sample_size": <int, career_min not null인 공고 수>,
  "overall_rate": <float, 최신 달 기준 신입/경력무관 비율(%)>,
  "monthly": [
    { "month": "2025-08", "total": <int>, "newcomer_eligible": <int>, "rate": <float> },
    ...
  ],
  "by_position": [
    { "position": "백엔드", "total": <int>, "newcomer_eligible": <int>, "rate": <float> },
    ...
  ],
  "note": "career_min<=0을 신입 가능 근사치로 사용 (newcomer-gate와 동일 근사)"
}
```

### 구현 가이드 (`app/crud/insight.py` + `app/routers/insight.py`)

- `career_min<=0` 근사는 기존 `get_newcomer_gate`(`app/crud/insight.py:74`)와 **동일 기준**을 유지해서
  두 위젯의 숫자가 서로 모순되지 않게 한다.
- 월별 집계: `Posting.post_date`(`app/models/posting.py:48`, `Date` 컬럼)로
  `date_trunc('month', post_date)` group by. `Posting.pool`, `is_deleted=False` 필터.
- 직무별 집계: `PostingCategory`(`app/models/posting.py:114`, `posting_id`↔`category` 문자열)를 join.
  기존 `build_posting_pool_query(pool, position)`(`app/services/match.py:85`)가 이미 이 join 패턴을
  구현해뒀으니 **그대로 재사용**할 것 — position 필터 로직을 새로 짜지 말 것.
- 응답 스키마는 `app/schemas/insight.py`에 `NewcomerTrendResponse` 추가 (기존 `SkillTrendYearlyResponse`
  형태를 참고하면 구조가 비슷하다 — `series`/`movers` 대신 `monthly`/`by_position`).
- 테스트: 기존 `newcomer-gate`, `skill-trend-yearly` 테스트 파일 옆에 같은 패턴으로 추가.

### 프론트 연동
- `career/api.ts`의 `marketApi`에 `newcomerTrend(params)` 추가 (기존 `yearlyTrend` 함수 바로 옆).
- `career/widgetCatalog.ts`의 `MARKET_WIDGETS`에 신규 항목 추가:
  `{ id: 'newcomer-trend', label: '신입 문호 지수', shape: 'line', allowedSizes: ['2x1', '2x2'], defaultSize: '2x1' }`
- 시각화: 월별 추이는 line chart(`echarts-for-react`, 기존 `TechYearlyTrendChart` 패턴 재사용), 직무별
  breakdown은 가로 bar(기존 `dmkt2__bars` 클래스 재사용 — `region-density`/`hot-companies`와 같은 스타일).
  **스킬을 나열하지 않는다** — 이게 이번 재구성의 핵심이므로 리뷰 시 반드시 확인.

---

## 5. 프론트 구현 파일 범위

| 파일 | 변경 내용 |
|---|---|
| `src/desktop/pages/placeholders.tsx` (`DesktopMarket`, 780~1333) | 섹션 5개→4개(히어로3+더보기) 재조립, `tier-compare`/`tier-donut` JSX·계산부 삭제, `posting-calendar` Section1로 이동, `newcomer-trend` 위젯 신규 배선 |
| `src/desktop/pages/market.css` | `.dmkt2__sec-grid--*` 클래스 재정리(섹션명 변경에 맞춰), 정적 스냅샷 라벨 배지 스타일 추가 |
| `src/career/widgetCatalog.ts` | `MARKET_WIDGETS`에서 `tier-compare`/`tier-donut` 제거, `newcomer-trend` 추가, 배열 순서를 새 섹션 우선순위에 맞게 재정렬(설정 메뉴 표시 순서에 영향) |
| `src/career/api.ts` | `marketApi.newcomerTrend()` 추가 |
| `src/career/wowWidgets.tsx` | `generation-trend`/`concept-signal`/`competency` 위젯 카드에 "정적 스냅샷 · {asOf}" 배지 추가 (각 JSON의 `_meta.asOf`/`as_of` 필드 사용) |
| `src/career/insights.tsx` | **건드리지 않음** (모바일 공유 — §2-C 주의사항) |
| `src/career/MarketScreen.tsx` | **건드리지 않음** (이번 범위 밖) |

`getWidgetSize('market', id, …)` / `isWidgetHidden('market', id)`의 `section` 인자는 위젯 그룹 네임스페이스일
뿐 화면상 5개 섹션과 무관하다 — 섹션 재배치는 `dashboardConfig.ts` 변경 없이 JSX만 옮기면 된다.

---

## 6. 주의사항 (구현 전 반드시 확인)

1. **`insights.tsx`의 `TierCompareChart`/`TierDonutChart`/`TIER_*` 상수를 삭제하지 말 것.** 모바일
   `MarketScreen.tsx`가 그대로 참조 중. 데스크톱 `DesktopMarket`에서 사용 부분만 제거.
2. **`src/pages/Signal*.tsx`(SignalCompetency, SignalConceptTrend, SignalNetwork 등)는 이번 작업과 무관.**
   `career/insights.tsx` + `desktop/pages/placeholders.tsx`가 실제 제품 시장 탭이고, `src/pages/*`는
   과거 기록상 "제품 IA 아님"(lab/demo 영역)으로 분류된 별도 코드다. 헷갈려서 잘못 수정하지 말 것.
3. **`career_min<=0` 근사는 하나의 기준으로 통일.** `newcomer-gate`와 신규 `newcomer-trend`가 서로 다른
   신입 판정 기준을 쓰면 두 위젯 숫자가 어긋나 보여서 오히려 신뢰도를 깎아먹는다.
4. **정적 스냅샷 위젯(`generation-trend`/`concept-signal`/`competency`) 셋은 삭제 대상이 아니다.**
   과거 progress.md 기록만 보고 "미구현/0 rows"로 오판하지 말 것 — 실제 JSON엔 실측 데이터가 들어있다
   (§2-D). 다만 갱신 주기가 없으므로(수동 스크립트 재실행 필요) 라벨로 구분만 한다.
5. **현재 uncommitted 프론트 브랜치(`feat/mypage-assistant-redesign`)는 `DesktopMarket`을 건드리지
   않는다** (`git diff` 확인 완료 — `DesktopMy`만 수정). 새 브랜치는 그 브랜치가 아니라 **`main`에서
   분기**할 것 — 마이페이지 작업의 미완성 변경사항과 섞이지 않게.
6. **Section 2 하단 압축 스킬 리스트는 삭제가 아니라 축소.** "의미 없다"는 피드백은 상위 노출 방식에
   대한 것이지 데이터 자체를 없애라는 뜻이 아니었다 — 완전 삭제하면 스킬 레퍼런스를 찾던 사용자가 불편해진다.

---

## 7. 체크리스트

### 백엔드 (`feat/newcomer-trend-stat`)
- [ ] `app/schemas/insight.py`에 `NewcomerTrendResponse` 추가
- [ ] `app/crud/insight.py`에 `get_newcomer_trend()` 추가 (`build_posting_pool_query` 재사용, `career_min<=0` 기준 `get_newcomer_gate`와 통일)
- [ ] `app/routers/insight.py`에 `GET /stats/newcomer-trend` 라우트 추가
- [ ] 신규 테스트(월별 집계 정확성, position 필터, sample_size 0일 때 처리) + 기존 회귀 테스트 통과
- [ ] `ruff` 통과
- [ ] Notion API 명세에 신규 엔드포인트 페이지 추가

### 프론트 (`feat/market-tab-redesign`)
- [ ] `widgetCatalog.ts`: `tier-compare`/`tier-donut` 제거, `newcomer-trend` 추가
- [ ] `career/api.ts`: `marketApi.newcomerTrend()` 추가
- [ ] `DesktopMarket`: 섹션 재조립 (Section 1/2/3 + 더보기), `posting-calendar` 이동, `tier-compare`/`tier-donut` JSX·계산 로직 제거
- [ ] `newcomer-trend` 위젯 UI 구현 — **스킬 나열 아님**, 비율/추이/직무별 breakdown 형태인지 리뷰 시 확인
- [ ] `generation-trend`/`concept-signal`/`competency`에 "정적 스냅샷 · {asOf}" 배지 추가
- [ ] `insights.tsx`/`MarketScreen.tsx` 무변경 확인 (`git diff` 스코프 체크)
- [ ] `npm run build` (tsc -b + vite) 통과
- [ ] Playwright: `/market` 데스크톱 1440/1920px — 새 섹션 순서, 더보기 접힘/펼침, 신규 위젯 렌더, 기존 위젯 회귀 없음 확인
- [ ] "내 직무/전체" 스코프 토글이 새 섹션 구조에서도 정상 동작하는지 확인 (기존 `scope`/`scoped` 로직 그대로 재사용됨)

---

## 8. 비목표 (이번 범위 밖)

- 대시보드 탭 재구성 (별도 스펙)
- 모바일 `MarketScreen.tsx` 재구성
- `hiring-season`/`industry-fingerprint`/`role-stack-fit` 신규 배선
- `generation-trend`/`concept-signal`/`competency`를 라이브 백엔드 엔드포인트로 승격
- `src/pages/Signal*` 정리
