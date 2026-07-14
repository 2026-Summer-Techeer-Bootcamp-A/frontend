# 시장 상황 탭 재구성 — 최종 설계 스펙 (v8)

작성/개정 2026-07-14. 대상: 데스크톱 `DesktopMarket` (`/market`). **대시보드는 범위 밖.**
시각 목업(그대로 오픈 가능): `docs/superpowers/specs/2026-07-14-market-tab-redesign-mockup.html`
프론트 브랜치 `feat/market-tab-redesign` (main 기준 신규). 백엔드 브랜치 `feat/market-stats-v2` (main 기준 신규).

이 문서는 팀원이 이 파일 + 목업 HTML만 보고 구현할 수 있도록: **실데이터 실사 결과 → 최종 레이아웃 →
위젯별 상세(크기·차트·데이터소스·풀 동작) → 인터랙션 → 신규 백엔드 → 제거/숨김 → 파일 범위 → 체크리스트**
순으로 담는다. 목업의 미니 SVG는 "차트 성격 스케치"이며, 실제 구현은 아래 표의 라이브러리를 쓴다.

---

## 0. 핵심 원칙 (실데이터 실사로 도출)

실제 DB(`appdb_load`, 국내 44.3만 공고 2014–2026 / 글로벌 12.2만)를 읽기 전용 분석해 도출한 원칙:

> **비율·구조·장기추세 지표는 신뢰. 절대 물량·최근성 지표는 스크래핑 배치 노이즈.**

- 월별 공고 물량이 `2025-03: 200건` → `2025-09: 8,497건` → `2026-05: 250건`으로 요동 = 수집 시점 아티팩트.
  → **주간/월간 "신규 공고 증감" 티커, 최근30일 집계는 금지.** 대신 **연 단위 / 누적 / 비율**.
- 반대로 **연도별 점유율(비율), 그룹내 상대 점유, 공동출현, 개념-기술, 신입율 추세**는 물량 노이즈에 강함.

**차트 라이브러리는 ECharts로 통일.** 기존 네트워크·전파 그래프가 이미 ECharts `graph(force)`이고
(`career/insights.tsx`), Sankey·calendar heatmap·bump·themeRiver 모두 ECharts 6 네이티브. d3는 설치돼
있으나 차트엔 미사용 → **신규 도입 안 함.** 컴팩트 바 등 일부는 기존 커스텀 SVG(`dmkt2__bars`) 유지.

---

## 1. 실데이터 실사 결과 (구현 전 필독 — 재조사 불필요)

| 항목 | 결과 | 설계 반영 |
|---|---|---|
| 국내 공고 | 442,768 (2014-07 ~ 2026-07) | 연 단위 추세 충분 |
| 글로벌 공고 | 122,423 · **career_min·region_district 전 행 NULL** | 신입·지역 위젯 **국내 전용** |
| 월별 물량 | 200~8,497 요동(스크래핑) | 물량·최근성 지표 금지 |
| 평균 요구 스킬 | **4.3개** (중앙값 4, 최대 44) | "안심 지표"·분포 위젯 근거 |
| 상위 스킬(전체풀) | Java 3.5%, JS 2.9%, Python 2.5% (비개발 직군 희석) | 스킬 위젯은 **개발 직군/그룹 기준**으로 라벨 |
| 언어 판도 | **Python이 Java 추월** (2026 Python 23% > Java 12%) | 히어로 "수요 레이스"의 스토리 |
| 급부상(무→상위) | FastAPI 0→2.9, Next.js 0→4.1, PostgreSQL 0.2→5.3, Redis 0.2→4.2 | 검정 스트립·성장 산점도 |
| 신입 문호 추세 | **6년 연속 하락 41.5%(2020)→15.5%(2026)** | **위젯 숨김**(사용자 요청, 아래 §6) |
| 직무별 신입(개발군) | 백엔드 10.3% ~ AI/ML 20.9% (전부 좁음) | 숨김·더보기 보관 |
| `response_rate` | **전 행 NULL** | 응답률 위젯 **제거** |
| 기업 규모 | DB 필드 없음 | 규모 2종 **제거** |
| `posting_concept` | **196,734행 · 27개 concept** (개인정보·컴플라이언스, 생성형 AI·LLM, 확장성·성능, CI/CD…) | **개념→기술 Sankey 라이브 가능** |
| 지역 | 강남 11,880 · 서초 3,838 · 분당 3,749 · 영등포 · 송파 · 마포 | 지역 밀도(국내 전용) |
| 캘린더 | **평일 집중(월~목 각 14%, 일 8.3%) + 9월 성수기** 실측 확인 · 단 2026-07-10 덤프일 2,717건 | **부활**, 단일 덤프일 캡(winsorize) 필요 |

### 프레임워크/DB "판도" — 그룹내 상대 점유(그룹 공고 union 기준, 표본 대략치)

- **프론트**(union 8,036): React 77.0% · Vue 33.5% · Next.js 22.6% · Angular 11.2% · Svelte 0.9%
- **백엔드**(union 14,250): Spring 48.1% · Node.js 31.3% · .NET 13.9% · Django 7.3% · NestJS 6.5%
- **DB**(union 9,684): MySQL 56.5% · **Oracle 26.7%** · PostgreSQL 22.0% · Redis 18.7% · MariaDB 15.8%

> ⚠️ DB 2위는 절대 점유론 **Oracle**(레거시). PostgreSQL은 3위지만 **성장세 1위**라 "급성장" 화살표로 별도 표기.
> %는 전체 공고가 아니라 **그룹 내 상대 점유(대략치)** — 카드에 명시. 1위–2위 %p 격차는 표본이어도 유효.

---

## 2. 최종 레이아웃 (v8)

상단 = 방향/변화, 아래로 갈수록 세부. 목업 HTML이 정본.

- **[상단] 풀 셀렉터** — `국내 / 글로벌 / 전체` 세그먼티드 컨트롤(우상단). 기본 국내.
- **[상단] 검정 풀폭 변화 스트립** — 카운트 아닌 **방향/판도**: ⭐올해의 스킬(Python↗) · 언어 판도(Python이 Java 추월) · 급부상(Next.js·FastAPI·PostgreSQL) · 판도 선두(React·Spring·MySQL).
- **① 시장 흐름** — 연도별 수요 레이스(2×2, 추월 강조) · 판도 카드 3개(프론트/백/DB, 1~3위+%, 클릭→모달) · 급상승·급감(1×1) · **채용 등록 캘린더(풀폭, 검증완료)**.
- **② 기술 수요·성장** (신입 문호 자리 대체, 사실 시각화) — 수요×성장률 버블 산점도(2×2, 판단 없음) · 동반 요구 스킬(2×1) · 공고당 요구 스킬 4.3(1×1) · 요구 스킬 개수 분포(1×1).
- **③ 기술 지형·관계** (主役) — 기술 관계 네트워크(2×2) · **개념→기술 Sankey**(2×2, 라이브).
- **④ 지역·기업** — 지역별 공고 밀도(2×1, **국내 전용**) · 누적 상위 기업(1×1) · 수요×빈도(1×1).
- **⑤ 글로벌·해외 트렌드** (**글로벌/전체 탭 선택 시에만 노출**) — 국내 시차 타임라인(2×2, 참신) · Hype vs Hire(2×1) · 해외서 더 뜨는 기술(1×1) · GitHub 스타 모멘텀(1×1).
- **[숨김/더보기]** 신입 문호(숨김·복구 가능) · 직무→스킬 Sankey.

---

## 3. 위젯 상세표

| # | 위젯 | 크기 | 차트(ECharts) | 데이터 소스 / 엔드포인트 | 풀 동작 | 상태 |
|---|---|---|---|---|---|---|
| 스트립 | 변화 브리핑 | 풀폭 | 텍스트+화살표 | skill-trend-yearly 파생 | 국내/글로벌/전체 | 신규 조립 |
| ①-a | 연도별 수요 레이스 | 2×2 | bump/line | `/stats/skill-trend-yearly` | pool | 재활용 |
| ①-b/c/d | 판도(프론트/백/DB) | 1×1 ×3 | 순위 리스트 + **모달(그래프)** | **신규 group-share** (아래 §5) | pool | 신규 |
| ①-e | 급상승·급감 | 1×1 | diverging bar | skill-trend-yearly.movers | pool | 재활용 |
| ①-f | 채용 등록 캘린더 | 풀폭 | calendar heatmap | `/stats/posting-timeline` (**덤프일 캡**) | pool(post_date 양쪽 존재) | 재활용+캡 |
| ②-a | 수요 × 성장률 | 2×2 | bubble scatter (판단 없음) | skill-trend-yearly (수요=공고수, y=Δ) | pool | 신규 |
| ②-b | 동반 요구 스킬 | 2×1 | bar | `/stats/cooccurrence` | pool | 신규 |
| ②-c | 공고당 요구 스킬(4.3) | 1×1 | stat | 신규 집계(avg/median) | pool | 신규 |
| ②-d | 요구 스킬 개수 분포 | 1×1 | histogram | 신규 집계 | pool | 신규 |
| ③-a | 기술 관계 네트워크 | 2×2 | graph(force) | `/stats/cooccurrence` | pool | 재활용(기존 컴포넌트) |
| ③-b | 개념→기술 Sankey | 2×2 | sankey | **신규 concept-tech** (§5) | pool | 신규 |
| ④-a | 지역별 공고 밀도 | 2×1 | bar | `/stats/region-density` | **국내 전용** (글로벌/전체 비활성) | 재활용 |
| ④-b | 누적 상위 기업 | 1×1 | bar | `/stats/hot-companies` (days→누적) | pool | 재활용+수정 |
| ④-c | 수요 × 빈도 | 1×1 | scatter | skill-share | pool | 재활용 |
| ⑤-a | 국내 시차 타임라인 | 2×2 | dual line/lag | **신규**: 글로벌·국내 연도추세 시차 | 글로벌/전체 전용 | 신규 |
| ⑤-b | Hype vs Hire | 2×1 | scatter | `/trend/hype-vs-hire` | 글로벌/전체 전용 | 재활용 |
| ⑤-c | 해외서 더 뜨는 기술 | 1×1 | diverging | `/stats/global-domestic-gap` | 글로벌/전체 전용 | 재활용 |
| ⑤-d | GitHub 스타 모멘텀 | 1×1 | line | `/trend/github-chronicle` | 글로벌/전체 전용 | 재활용 |

---

## 4. 인터랙션

### 4-1. 국내/글로벌/전체 풀 셀렉터
- 상단 세그먼티드 컨트롤. 선택 상태를 `useState<'domestic'|'global'|'all'>`로 관리, pool-지원 위젯의 `marketApi` 호출 `pool` 파라미터에 매핑(`all`은 두 풀 각각 조회 후 병합 표시 — **점유율은 합산 금지, 병렬 표기/비교**).
- **국내 전용 위젯**(지역 밀도 등)은 글로벌/전체에서 **비활성(dim + "국내 전용" 안내)**.
- **⑤ 글로벌·해외 트렌드 섹션은 pool≠'domestic'일 때만 렌더** (국내 탭에선 섹션째 숨김).
- 기존 "내 직무/전체"(myCategory) 토글과는 **다른 축** — 공존. 셀렉터를 둘 다 두거나, 풀 셀렉터를 1차/직무 토글을 2차로.

### 4-2. 판도 카드 → 모달
- 카드엔 **1~3위 + 그룹내 점유%**. 클릭 시 **모달**: 전체 순위(5위+) + 증감 화살표 + **프레임워크별 연도 점유율 추이 그래프(멀티라인)**.
- 데이터: 신규 group-share 엔드포인트(랭킹) + skill-trend-yearly(그룹 스킬들의 연도 추이).

---

## 5. 신규 백엔드 작업 (`feat/market-stats-v2`)

기존 `app/routers/insight.py` 패턴을 따른다. 신규 4종:

1. **`GET /stats/group-share`** — `group` = `frontend_fw|backend_fw|database`(스킬 세트는 서버 상수).
   반환: `{ union_count, items:[{canonical, count, share}], as_of }`. share = count/union(그룹 union). pool 파라미터.
   *구현*: 그룹 스킬 세트로 `posting_tech` distinct posting union + 스킬별 distinct count. (실측 쿼리 §1 참고.)
2. **`GET /stats/concept-tech`** — 개념→기술 Sankey. `posting_concept` × `posting_tech` 조인.
   반환: `{ nodes:[{name,type:'concept'|'tech'}], links:[{source,target,value}], as_of }`. concept 상위 N × 각 concept 공고에서 상위 기술 M. pool 파라미터. (posting_concept 19.6만행 확인됨.)
3. **`GET /stats/skill-count-dist`** — 공고당 요구 스킬 개수 분포 + 평균/중앙값. `{ histogram:[{k,count}], avg, median }`. pool.
4. **`GET /stats/global-domestic-lag`** — "국내 시차": 글로벌 연도추세가 국내를 선행하는 시차(개월/년).
   기술별 글로벌·국내 연도 점유율 시계열의 교차상관으로 lag 추정. `{ items:[{canonical, lag_months, global_series, domestic_series}], as_of }`.
   *주의*: 표본·정렬 한계 있으니 lag는 근사·범위로 노출. 데이터 부족 기술은 제외.

기존 재사용(수정 최소): skill-trend-yearly, cooccurrence, region-density, hot-companies(days 파라미터 대신 누적 기본), posting-timeline(응답에 캡/이상치 플래그 추가 권장), global-domestic-gap, hype-vs-hire, github-chronicle.

각 신규 엔드포인트: 스키마(`app/schemas/insight.py`) + crud(`app/crud/insight.py`) + 라우트 + 테스트 + ruff + Notion 명세.

---

## 6. 제거 / 숨김

- **제거**: 기업 규모별 요구 차이·규모 분포 도넛(DB 필드 없음) · **응답률**(전 행 NULL) · 지역×스택 지문(의미 낮음) · 세대별 스택(정적, 이번 미채택).
- **숨김(코드 유지·복구 가능)**: **신입 문호(직무별·비율)** — 데이터는 유효하나 "개발직 전부 좁음(10~21%)·6년 하락"이라 사용자 판단상 상단 노출 보류. 더보기/설정에서 복구 가능하게 컴포넌트·엔드포인트는 남긴다.
- **주의**: `TierCompareChart`/`TierDonutChart`/`TIER_*`(`career/insights.tsx`)는 **모바일 `MarketScreen.tsx`가 공유** → 데스크톱 `DesktopMarket`에서 사용부만 제거, 공용 export는 보존.

---

## 7. 프론트 구현 파일 범위

| 파일 | 변경 |
|---|---|
| `src/desktop/pages/placeholders.tsx` (`DesktopMarket`) | 섹션 5개 재조립, 풀 셀렉터 상태, 판도 카드+모달, 신규 위젯 배선, 제거/숨김 |
| `src/desktop/pages/market.css` | `.dmkt2__*` 재정리, 검정 스트립, 판도 카드, 모달, 글로벌 섹션 dim/게이팅 |
| `src/career/widgetCatalog.ts` | `MARKET_WIDGETS` 갱신(신규 id 추가/제거), 섹션 우선순위 순서 |
| `src/career/api.ts` | `marketApi`에 groupShare/conceptTech/skillCountDist/globalDomesticLag 추가 |
| `src/career/wowWidgets.tsx` | 개념 Sankey·수요×성장 산점도·국내 시차 등 신규 위젯 컴포넌트 |
| `src/career/insights.tsx` / `MarketScreen.tsx` | **무변경**(모바일 공유 — §6 주의) |

`getWidgetSize/isWidgetHidden('market', id)`는 위젯 네임스페이스일 뿐 화면 섹션과 무관 — JSX 재배치로 충분.

---

## 8. 체크리스트

### 백엔드 (`feat/market-stats-v2`)
- [ ] `/stats/group-share` (프론트/백/DB, 그룹 union 기준) + 테스트
- [ ] `/stats/concept-tech` (posting_concept×posting_tech Sankey) + 테스트
- [ ] `/stats/skill-count-dist` (평균 4.3/분포) + 테스트
- [ ] `/stats/global-domestic-lag` (근사 lag, 데이터부족 제외) + 테스트
- [ ] posting-timeline 이상치(덤프일) 캡/플래그
- [ ] hot-companies 누적 기본화
- [ ] ruff + 회귀 통과 + Notion 명세 갱신

### 프론트 (`feat/market-tab-redesign`)
- [ ] 국내/글로벌/전체 셀렉터 + pool 매핑, 국내전용 위젯 비활성, ⑤ 섹션 게이팅
- [ ] 검정 풀폭 변화 스트립(방향 지표, 카운트 금지)
- [ ] 판도 카드 1~3위+% + 클릭 모달(전체순위+증감+연도추이 그래프)
- [ ] 수요×성장률 **사실형** 버블 산점도(‘기회/포화’ 판단 카피 금지)
- [ ] 개념→기술 Sankey(라이브) · 기술 네트워크(재활용)
- [ ] 채용 캘린더 복귀(덤프일 캡), 지역=국내전용 뱃지
- [ ] 신입 문호 숨김(복구 가능), 규모/응답률/지역×스택 제거
- [ ] `insights.tsx`/`MarketScreen.tsx` 무변경 확인, `npm run build`, Playwright(1440/1920 + 3개 탭 전환)

---

## 9. 비목표
- 대시보드 탭, 모바일 `MarketScreen.tsx` 재구성
- 신입 문호 위젯 완전 삭제(숨김만)
- `hiring-season`/`industry-fingerprint`/`role-stack-fit` 신규 배선
- 신입 문호 시계열/직무별의 상단 승격(사용자 보류)
