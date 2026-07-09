# demo-frontend 디자인 · 데모 빌드 로그

커리어 포지셔닝 대시보드(채용공고 124,237건)의 데모 프론트엔드. 발표용 데모영상이 목표.

- **주제·기능·API 명세**: `/home/rivermoon/Documents/techeer-2026-summer-a/cite`
- **데이터셋 문서**: `/home/rivermoon/Documents/github/gh-hn-data-collector/cite`
- ⚠️ 주제와 데이터가 **서로 다른 위치**에 있음.

---

## 디자인 시스템 (정본)

`src/design/` — 라우트 `/design-system`.

- `tokens.ts` — 액센트 **슬레이트 블루 #2f61b8**, 뉴트럴 쿨 그레이, 라운드 8~28, 엘리베이션 e0~e4(쿨톤 `rgba(20,30,60,..)`), 모션(iOS HIG).
- `design-system.css` — 전 컴포넌트 스타일. 라인 `#e6e9ef`.
- `DesignSystem.tsx` — 카탈로그 + 사이드바 NAV.
- `dontDoItems.ts` / `DoDont.tsx` — Do & Don't(`/design-system/guide`). AI 바이브코딩 클리셰 반면교사.

### 지켜야 할 원칙 (Don't 요약)
단일 액센트 한 톤 · 사각 배지(pill은 필터/토큰/카운터만) · 라운드 7~20 · 정적 카드는 e1 앰비언트 한 겹(그림자0도 shadow-2xl도 금지) · **숫자 tabular-nums + 기준일·모수(N) 캡션** · **AI에 보라/핑크/Sparkles 금지**(뉴트럴 버블+보더) · 무지개 차트 금지(값=색의 진하기) · 좌측 액센트 스트라이프 만능처방 금지 · 프레스 scale(0.97)+brightness · 동심원 라운드.

---

## 완료 (검증됨)

### 1. career 메인 (`src/career/CareerDashboard.tsx` + `career.css`)
- DS 토큰 주입(라인·e1~e4·accent 스케일). 카드=보더+e1, hover 시 accent-200 보더.
- 소프트 칩(보더), 그라디언트 링/매칭 트랙, 세그먼트(국내/해외)·고스트 필터버튼, 바텀시트 그라디언트 체크·프레스 피드백.
- **히어로 = 카드에서 벗어난 풀블리드 + 위젯 4종 캐러셀**(하단 점 4개, 탭 전환):
  1. 커버리지 링(73%) 2. 도달률(넓이, 문턱 바) 3. 부족기술 Top3(뜨는중 배지) 4. 시장 요구 기술 미니바(보유/미보유).
  - state `slide`, `.cr-carousel`/`.cr-slide`/`.cr-dots`. → **사용자가 4개 중 하나 고를 예정**.
- 하단 탭바 미선택 = 배경 없이 아이콘만.

### 2. 모달 → 얼럿 통일 (DS)
- `.ds-modal`(PC식 헤더/X/구분선) 제거 → `.app-alert` 모바일 카드로. 위험은 `.app-alert--danger`(아이콘 레드) **색으로만 구분**.

### 3. DS 신규 컴포넌트 34개 (`#map` / `#stats` / `#insights`)
- CSS 네임스페이스 `.mx-`(지도) `.sx-`(통계) `.ax-`(AI). 헬퍼 컴포넌트 `LineChart`/`Donut`/`Gauge`/`AppleSlider`.
- **AppleSlider**: 드래그 중 썸 가로 stretch(`.ios-slider.dragging .thumb` w34/h19 pill), 스프링 이징.
- **지도 = 국내 전용(F16)**: 서울 구 단위 클러스터(Apple 구형 셰이딩·화이트링·펄스 내위치 `.mx-me`·이름표 `.mx-namepill`), **핀↔히트맵 토글**, 구 posting_count 히트맵, 선택지역 공고시트(매칭·**응답률 F11**·D-day), 국내전용 배너, 기준일+N 라벨.

---

## 데이터 핵심 (지도·통계용)

- 총 124,237건. 글로벌 ~117,133(himalayas/hn/wwr) / 국내 ~7,104(jumpit/wanted). **절대 합산 금지**, 전역 `[글로벌|국내]` 토글.
- **지도는 국내만.** 좌표=원티드 lat/lng(정밀) + 점핏 주소 지오코딩. 글로벌은 국가 레벨뿐.
- **응답률(response_rate)**=원티드 고유(F11), 값 없으면 배지 숨김.
- 마감임박순=국내만(himalayas/hn close_date 0%). 연차=현재 국내만.
- 상위 기술: Python 16,945 · AWS 14,885 · JavaScript 13,938 · Git 11,117 · TypeScript 9,930 · SQL 9,814 · Kubernetes 7,678 · PostgreSQL 7,480 · Docker 6,453.
- 커버리지 산식: `Σ_{보유∩상위K} f(t) / Σ_{상위K} f(t) × 100` (K=20). "합격 확률" 표현 **금지**.
- 정직 표기: 빈 구간 "표본 N건/수집 중", 매칭 풀 <50건 "참고용", himalayas 시계열 제외.

---

## 완료 4 — 데모 화면 9종 (`PhoneFrame` + DS 준수) ✅

**IA**: 하단 탭바 5탭(홈·통계·인사이트·지도·마이) + 푸시 하위 4(이력서제출·공고상세·기술세부·자격증갭). 공용 탭바 `CareerTabBar.tsx`(아이콘 전용 플로팅 필, 미선택=아이콘만). 홈 히어로 캐러셀에 **스와이프+좌우 방향키**(비순환) 추가.

- **공용 셸·차트**: `charts.tsx`(`CareerScreen`/`SubScreen`/`ScreenHead`/`PoolToggle`/`Segmented`/`AsOf`/`Gauge`/`Donut`/`HBars`/`Sparkline`/`TrendLines`/`Heatmap`), 스타일 `screens.css`(`.scr-*`, career DS 토큰 재사용).
- **화면**: `StatsScreen`(/stats) `InsightsScreen`(/insights) `MapScreen`(/map) `ResumeScreen`(/resume) `ResumeSubmit`(/resume/submit) `TechDetail`(/tech/:name) `CertGap`(/cert-gap) + 기존 `JobDetail`(/job/:id) + 홈.
- **지도**: 서울 고정 bounds 투영 + 지터로 declump, 핀↔히트맵 토글, 내 위치(빨강), 지역별 리스트. 국내 전용 배너.
- **정직 표기**: 전 화면 기준일+N, 보유=액센트/미보유=뉴트럴, 합격확률 금지, `[글로벌|국내]` 토글, 연봉 금지. **응답률(F11)은 이 mart.db 스냅샷에 없어 미표시**(스펙 "값 없으면 숨김").
- **갤러리**: `/gallery`에 "화면 구조 · 커리어 앱" 섹션(9카드) + "레퍼런스 목업" 섹션 분리.

## 데이터 확대 (실 데이터 기반)

- 원천 = `gh-hn-data-collector/dashboard/out/mart.db`(실 124,237건). 빌더 = scratchpad `build_data.py`.
- `careerData.json`: 공고 12→**42건**(국내22·국외20, descSections·companyInfo·techs·gap·district), `topTechsByPool`, `resumes`(1/2/3).
- `marketData.json`(신규): `skillShare`(풀별 N), `cooccurrence`(6허브), `trend`(2019~26·himalayas제외), `industry`(6산업×기술 히트맵), `certGap`, `companyBySkill`(과거/현재), `techDetail`, `map`(핀120·구36).

### 검증
- `npm run build`(tsc -b + vite) 통과. dev 9화면 브라우저 렌더·콘솔 에러 0 확인.
- 라우트: `src/App.tsx`. 갤러리 인덱스: `src/pages/Gallery.tsx`.

## 완료 5 — 홈 위젯 캐러셀 6종 + 이력서 유무 분기 ✅

**신규**: `career/homeWidgets.tsx` — 마감임박×매칭 / 다음 배울 기술(로드맵) / 다음에 뜰 기술(트렌드전파·글로벌) / 기술 아키타입 / 응답 잘 오는 회사 / 나와 닮은 회사. 전부 `skills:string[]`로 개인화·일반 모드 겸용(빈 배열이면 자동으로 일반 시장 지표).

- `CareerDashboard.tsx`: 정적 `PulseCard` 제거 → 죽어있던 `SwipePager`를 실사용. 이력서 없어도 위젯·미니스탯을 블러 처리하지 않고 `ResumeEmptyCard`(유도 카드)만 히어로 자리에 대신 노출, 나머지는 그대로 일반 모드로 보여줌(`cr-lockwrap` 방식 폐기). 공고 피드는 5→3개로 압축.
- `insights.tsx`에 `computeTechChain()` 분리(로드맵 로직 재사용), `state.ts`의 `ddayInfo` export.
- `S 응답률` 위젯은 원래 "매칭×응답률 교집합"으로 기획했으나 데이터 구조상(examples.matched가 고정 레퍼런스 이력서 기준) 임의 이력서와 교차 불가라 "응답 잘 오는 회사" 일반 지표로 정직하게 재정의.
- 검증: `npm run build` 통과, 이력서 있음/없음(`?empty=true`) 양쪽 6위젯 전부 브라우저 스크린샷 확인.
