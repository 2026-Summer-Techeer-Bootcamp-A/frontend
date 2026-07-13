# 모노크롬 커맨드센터 리디자인 — 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development로 태스크 단위 구현. 스텝은 `- [ ]` 체크박스. **모든 코드 작성/수정은 Sonnet/Haiku 서브에이전트로만** (Opus는 리뷰/QA만).

**Goal:** 커리어 앱 프론트를 블랙 포인트+화이트 모노크롬 커맨드센터로 재설계(데스크톱 우선), 대시보드=개인화·시장=시장흐름 분리, 검색 필터+이력서 자동주입, 지도 상세 임베드, 경량 위젯설정.

**Architecture:** 기존 데스크톱 셸(`src/desktop`)·Adaptive 스왑·ECharts 자산(`src/career/insights.tsx`, `src/pages/Signal*`, `src/pages/widgets/*`)·디자인토큰(`src/design/tokens.ts`)을 재사용. 데이터는 위젯별 하이브리드 훅(live→mock 폴백). 백엔드는 insight 라우터 패턴(crud+schema+router)으로 2 엔드포인트 추가 + 상세 lat/lng.

**Tech Stack:** React 18 + Vite + TS, ECharts(echarts-for-react), D3, Leaflet, lucide-react / FastAPI + SQLAlchemy + pgvector.

## Global Constraints

- 정본 스펙: `docs/superpowers/specs/2026-07-12-mono-command-center-redesign-design.md` — 정확한 hex/토큰/엔드포인트 값은 스펙을 참조(중복 방지).
- 포인트 컬러 near-black `#0b0b0c`, 사이드바 `#0d0d0d`, 콘텐츠 배경 `#ffffff`, 셸 크롬 `#f7f7f8`.
- 데이터 시각화: 모노톤 기반 + 액센트 2개(그린 `#1f9d57`, 앰버 `#d9822b`)만 다계열에 허용.
- 슬레이트블루(`#2f61b8`, `rgba(47,97,184,*)`) 잔존 0 — 토큰으로 스윕.
- 백엔드: 항상 `pool` 분리(global/domestic 혼합 금지). 급여 데이터 없음. 지도 국내 전용.
- 모션: `tokens.ts` 값 준수, 500ms 초과 금지, 장식 바운스 금지.
- 시각 태스크의 "테스트"는 `npm run build` 통과 + Playwright 스샷 대조(수용 기준) + grep 검증. 백엔드 태스크는 pytest TDD.
- 커밋 트레일러: `Claude-Session: https://claude.ai/code/session_01R9YAcrie4Gcip9aL6NdZpd`.

**작업 브랜치:** `feat/mono-command-center`(frontend), `feat/mono-command-center-api`(backend). 실행 시작 시 생성.

---

# Phase 1 — 토대: 모노크롬 토큰 + 블랙 셸 (완전 실행 플랜)

Phase 1은 이후 모든 Phase를 언블록한다. 순수 색/셸/IA 작업이라 리스크 낮고 스샷 검증이 명확.

### Task 1.1: 디자인 토큰 모노크롬 전환

**Files:**
- Modify: `src/design/tokens.ts` (palette.accent/neutral/semantic, 주석 문구)

**Interfaces:**
- Produces: `palette.accent`(near-black 램프 50→900, base `#0b0b0c`), `palette.neutral`(그레이 램프), `palette.dataviz = { positive:'#1f9d57', warn:'#d9822b' }`.

- [ ] **Step 1:** `palette.accent`를 슬레이트블루 램프 → near-black 그레이 램프로 교체. base(500)=`#0b0b0c`, 위로 갈수록 밝은 그레이. 주석의 "슬레이트 블루(C)" 문구도 "near-black 모노크롬"으로 수정.
- [ ] **Step 2:** `palette.neutral` 램프를 스펙 §3 값으로 정렬(0=#fff,50=#f7f7f8,100=#f0f0f1,200=#e4e4e7,300=#d4d4d8,400=#a1a1aa,500=#71717a,600=#52525b,700=#3f3f46,900=#18181b).
- [ ] **Step 3:** `palette.semantic.info`/`infoBg`를 near-black 계열로, `dataviz` 객체 신설(positive/warn).
- [ ] **Step 4 (test):** `npm run build` → 타입/빌드 통과.
- [ ] **Step 5:** 커밋 `feat(tokens): 모노크롬 팔레트로 전환`.

### Task 1.2: 테마 변수 전환 + 하드코딩 슬레이트블루 스윕

**Files:**
- Modify: `src/career/themes.ts` (THEME.primary/accent/navActive/chipBg/chipText/stageBg/screenBg)
- Modify: `src/desktop/DesktopShell.css` (스크롤바 `rgba(47,97,184,*)`)
- Modify: `src/career/MapScreen.tsx`, `src/desktop/pages/placeholders.tsx` (지도 마커 `#2f61b8`, `#8fa0b8`)
- 스윕 대상 grep로 전수 조사 후 각 파일

**Interfaces:**
- Consumes: Task 1.1 `palette`.
- Produces: `THEME.primary='#0b0b0c'`, `accent='#0b0b0c'`, `navActive` 흰 반투명은 셸에서 처리, `chipBg`=`#f0f0f1`, `chipText`=`#18181b`.

- [ ] **Step 1:** `THEME` 색 필드를 모노크롬으로 교체(primary/accent=near-black, chipBg/chipText=그레이, stageBg/screenBg=화이트/그레이). 주석 "슬레이트 블루(C) 확정" 수정.
- [ ] **Step 2:** `grep -rn '#2f61b8\|rgba(47,\?\s*97,\?\s*184\|#8fa0b8' src` 로 전수 조사.
- [ ] **Step 3:** 각 히트를 토큰/그레이로 교체(스크롤바 thumb=`rgba(0,0,0,.24)`, 지도 마커 매치≥50=near-black, 미만=그레이 `#a1a1aa`).
- [ ] **Step 4 (test):** `grep -rn '#2f61b8\|rgba(47,\s*97,\s*184' src` → **0건**. `npm run build` 통과.
- [ ] **Step 5:** 커밋 `feat(theme): 슬레이트블루 → 모노크롬 스윕`.

### Task 1.3: 블랙 좌측밀착 사이드바

**Files:**
- Modify: `src/desktop/DesktopShell.css` (`.dshell`, `.dshell__rail`, `.dshell__railbtn`, `.on`, `.dshell__brand-dot`)

**Interfaces:**
- Consumes: 없음(순수 CSS).
- Produces: 블랙 레일 클래스 셋(액티브 `.on` = 흰 반투명 필).

- [ ] **Step 1:** `.dshell__rail` 배경 `#0d0d0d`, `padding` 좌측 0 밀착, 풀하이트(현재도 100dvh). 레일 폭 유지(84px) 또는 76px로 소폭 축소.
- [ ] **Step 2:** `.dshell__railbtn` 기본 색 `rgba(255,255,255,.62)`, hover `background rgba(255,255,255,.08)` + 흰 텍스트. `.on` = `background rgba(255,255,255,.14)` + 흰색.
- [ ] **Step 3:** `.dshell__brand-dot` 흰색/화이트 라운드로, `.dshell__railfoot` border-top `rgba(255,255,255,.1)`.
- [ ] **Step 4:** `.dshell`(셸 배경) `#f7f7f8`, `.dshell__content` 흰 카드 유지하되 좌측 마진 조정(레일이 밀착이므로 content margin 재계산).
- [ ] **Step 5 (test):** Playwright로 `/` 열어 스샷 → 레일 블랙·좌측밀착·액티브 흰필 육안 확인. `npm run build` 통과.
- [ ] **Step 6:** 커밋 `feat(shell): 블랙 좌측밀착 사이드바`.

### Task 1.4: 지도 섹션 IA 제거

**Files:**
- Modify: `src/desktop/DesktopShell.tsx` (`SECTIONS`에서 `map` 삭제)
- Modify: `src/App.tsx` (`/map` 라우트 + `MapScreen`/`DesktopMap` import 제거)

**Interfaces:**
- Consumes: 없음.
- Produces: 라우팅에서 map 부재. (파일 `MapScreen.tsx`/`DesktopMap`은 P4에서 상세지도 참고용으로 남겨두되 라우트만 해제.)

- [ ] **Step 1:** `DesktopShell.tsx` `SECTIONS` 배열에서 `key:'map'` 엔트리 제거. `market.match`에서 `/map` 없음 확인.
- [ ] **Step 2:** `App.tsx`에서 `<Route path="/map" .../>` 라인 + `MapScreen`, `DesktopMap` import 제거(`DesktopMap`이 placeholders에서 default export 아니면 named import만 정리).
- [ ] **Step 3 (test):** `npm run build` 통과. Playwright로 레일에 '지도' 없음 확인. `/map` 접근 시 404.
- [ ] **Step 4:** 커밋 `feat(ia): 지도 탭 제거(상세 임베드로 이관 예정)`.

### Task 1.5: 큰 페이지 타이틀 + 톱바 슬림화 + 검색 라벨

**Files:**
- Modify: `src/desktop/DesktopShell.tsx` (`SECTIONS` jobs 라벨 '검색' + 아이콘 `Search`; 톱바 crumb 처리)
- Modify: `src/desktop/DesktopShell.css` (`.dshell__crumb` 또는 신규 페이지 타이틀 클래스)
- Modify: `src/desktop/pages/DesktopOverview.tsx` + `.css` (`.dov__title` 크기)

**Interfaces:**
- Consumes: 없음.
- Produces: 페이지 타이틀 스타일(32~40px/800/ls -1px).

- [ ] **Step 1:** `SECTIONS` jobs `label:'검색'`, `icon:Search`(lucide) 로 교체. import 조정.
- [ ] **Step 2:** 페이지 본문 상단 큰 타이틀 표준 정립 — `.dov__title` 등 페이지 h1을 `font-size:34px; font-weight:800; letter-spacing:-1px`로. 톱바 `.dshell__crumb`는 유지하되 작게(보조), 또는 숨기고 본문 타이틀로 위계 이동.
- [ ] **Step 3 (test):** Playwright `/` 스샷 → 큰 타이틀 확인. 레일 '검색' 라벨 확인. `npm run build` 통과.
- [ ] **Step 4:** 커밋 `feat(shell): 큰 페이지 타이틀 + 검색 라벨 + 톱바 슬림`.

### Phase 1 수용 기준
- `grep` 슬레이트블루 0건. 레일 블랙·좌측밀착·흰 액티브필. 페이지 타이틀 ≥32px. 지도 탭 없음. 빌드 통과. 스샷상 정렬 이상 없음.

---

# Phase 2 — 대시보드(개인화) [실행 직전 상세화]

**목표:** `DesktopOverview.tsx`를 검정 히어로 2 + stat 타일 + 개인화 위젯 카탈로그로 재작성. 하이브리드 데이터 훅 도입.

**핵심 파일:** `src/career/useWidgetData.ts`(신규 훅), `src/career/api.ts`(실 fetch 점진 교체), `src/desktop/pages/DesktopOverview.tsx`+`.css`, `src/career/kit.tsx`(검정 히어로/링게이지/미니바 위젯 추가).

**태스크 아웃라인:**
1. `useWidgetData(fetchLive, mock)` 훅 — `VITE_API_BASE` 있으면 live 시도, 실패/무데이터 시 mock + `source` 반환. (유닛 테스트: mock 폴백/‘preview’ 플래그.)
2. 검정 히어로 위젯 컴포넌트 2종(`HeroRingStat` 커리어점수, `HeroCountStat` 지원가능+미니바) — kit.tsx. 숫자 좌하단 강조.
3. stat 타일 4종(macOS 톤, 숫자 좌하단 + tiny graph).
4. 개인화 위젯 배선: 맞춤공고 Top(`/postings?resume_id&sort=match`), 마감임박(`/postings?deadline_within_days`), 기술갭(`/match/gap`), 커버리지 분포(`/match/coverage/distribution`), 업종 radar(`/match/gap` radar), 로드맵(`/match/roadmap`) — 각 `useWidgetData`로.
5. 멀티컬럼 그리드 레이아웃(작은 위젯 다수, 정보 밀도) + 이력서 없을 때 프리뷰/CTA.
6. Playwright 스샷 QA.

**수용 기준:** 검정 히어로 ≥2, 개인화 위젯만, 라이브 있을 때 실데이터·없을 때 preview 배지, 정보 밀도 상승.

---

# Phase 3 — 채용시장(시장흐름) + 백엔드 2 엔드포인트 [실행 직전 상세화]

## 3A. 백엔드 (pytest TDD, `feat/mono-command-center-api` on backend repo)

insight 라우터 패턴(crud `app/crud/insight.py` + schema `app/schemas/insight.py` + router `app/routers/insight.py`) 그대로 확장.

1. `GET /api/v1/stats/skill-share` — mv_skill_share 쿼리. params `pool`(필수), `position?`, `top_k`(기본 20). resp `SkillShareResponse{items:[{canonical,category?,posting_count,share}], as_of, sample_size}`. (테스트: pool 필수 422, top_k 제한, 정렬 desc.)
2. `GET /api/v1/stats/cooccurrence` — mv_cooccurrence 쿼리 + skill 조인. params `pool`(필수), `skill?`, `top_k`. resp `CooccurrenceResponse{nodes:[{canonical,category?,freq}], links:[{source,target,co_count,co_rate}], as_of}`. (테스트: pool 필수, skill 필터, 노드/링크 정합.)
   - 각각: 실패 테스트 작성 → crud → schema → router 등록(`app/main.py` include) → 통과 → 커밋.

## 3B. 프론트 (`DesktopMarket` 재작성)

기존 `insights.tsx`/`Signal*` ECharts 재사용. 위젯: 수요 리더보드(skill-share, 검정 히어로 바), 공동출현 네트워크(cooccurrence, ECharts force), 역할↔스택(role-stack-fit → Sankey 또는 히트맵), Hype vs Hire(시계열), 계절성(hiring-season), 글로벌vs국내 갭(다이버징), 산업지문(히트맵), GitHub 랭크 bump(chronicle), 기업 과거/현재(company/by-skill). 각 `useWidgetData`.

**수용 기준:** 개인 진단 위젯 없음(대시보드로 이관), 네트워크 1 + Sankey/히트맵 1 이상, 시계열 1 이상, 실데이터 배선.

---

# Phase 4 — 검색 + 지도 상세 임베드 [실행 직전 상세화]

## 4A. 백엔드
- `PostingDetailResponse`에 `lat`/`lng`(Optional) 추가 — `app/schemas/posting.py` + `app/crud/posting.py`(detail 쿼리에 lat/lng 포함). (테스트: 국내 공고 lat/lng 존재, 국외 null.)
- (단계적) `/postings` 필터 확장 `skills`/`career_min`/`career_max`/`industry` — 각 파라미터 + crud 필터 + 테스트.

## 4B. 프론트
- `DesktopJobs` 재작성: 필터 패널(텍스트·풀·직무·스킬멀티·지역·경력·마감·기업규모·정렬) + **이력서 셀렉터**(`/resume` → `/resume/{id}`+preferences → 필터 자동 주입) + 마스터-디테일.
- `JobDetail.tsx`: 상세 하단 Leaflet 단일 pin 지도 카드(신규 lat/lng, 국내만). 없으면 region 폴백.

**수용 기준:** 이력서 선택→필터 자동주입 동작, 상세 지도 표시(국내), 지도 탭 부재 유지.

---

# Phase 5 — 경량 위젯 설정 [실행 직전 상세화]

- 신규 `src/career/dashboardConfig.ts`(localStorage, settingsStore 패턴): 섹션별 `{hidden:string[], variant:Record<id,string>}`.
- 타이틀 옆 기어 → 팝오버/시트: 위젯 표시/숨김 토글 + variant 드롭다운. 드래그 없음.
- 대시보드·시장 위젯 렌더가 config를 반영.

**수용 기준:** 표시/숨김·variant 로컬 저장·복원 동작.

---

# Phase 6 — 디테일 QA (Playwright 스샷 반복)

- `/`, `/market`, `/jobs`, `/job/:id`를 1280·1440·1024폭에서 스샷 → 정렬·라운딩·간격·타이포·검정히어로 대비 교정 루프.
- 모바일 리컬러(블랙 테마 토큰) 육안 확인.

**수용 기준:** 스샷상 디테일 결함 없음("AI 티" 0).

---

# Phase 7 — API 명세서(Notion) 최신화

- 신규/변경 엔드포인트(skill-share, cooccurrence, 상세 lat/lng, /postings 필터 확장)를 Notion API 명세서에 반영.

---

## Self-Review (Phase 1 기준 + 로드맵 커버리지)

- **스펙 커버리지:** §3 색→T1.1/1.2, §4 셸→T1.3/1.4/1.5, §5 대시보드→P2, §6 시장→P3, §7 검색→P4, §8 상세지도→P4B, §9 위젯설정→P5, §10 백엔드→P3A/P4A, §11 모션/디테일→P6, §7 문서→P7. 갭 없음.
- **Placeholder:** P1은 파일·값·grep·스샷까지 구체. P2~P7은 "실행 직전 상세화" 명시(의도된 JIT 확장, 스펙에 정확값 존재).
- **타입 일관성:** 신규 훅 `useWidgetData`, 응답 `SkillShareResponse`/`CooccurrenceResponse` 명명 P2/P3에서 통일.

## Execution Handoff
Phase 1부터 subagent-driven(Sonnet/Haiku)로 실행, Opus가 태스크 간 리뷰.
