# 모노크롬 커맨드센터 리디자인 — 설계 스펙

- 날짜: 2026-07-12
- 대상 리포: `frontend` (주), `backend` (소규모 엔드포인트 4종)
- 범위: **데스크톱 우선**. 모바일은 색/토큰 리컬러만, 구조 재설계 없음.
- 데이터 전략: **하이브리드** — live 엔드포인트 준비된 위젯은 라이브, 없는 집계는 mock 유지(위젯별).
- 구현 제약: **모든 코드 작성/수정은 Sonnet/Haiku 서브에이전트로만** 수행(토큰 절약). Opus는 계획·검토·Playwright QA 판단만.

> 기존 `2026-07-12-desktop-shell-redesign-design.md`를 확장·대체하는 상위 스펙. 충돌 시 본 문서가 우선.

---

## 1. 목표 (Goals)

1. 포인트 컬러를 슬레이트블루 → **near-black**, 배경 화이트인 모노크롬 시스템으로 전환(무신사/ChatGPT 톤).
2. 사이드바를 **블랙 · 좌측 밀착 풀하이트**로, 페이지 타이틀을 **크게(본문 상단 큰 타이틀)**.
3. 대시보드 = **개인화**, 채용시장 = **시장 흐름**으로 서사 분리. 각 탭 위젯을 더 작게·더 많게 하여 정보 밀도 상승.
4. 검정 배경 히어로 위젯 + 심플 그래프(이미지#2 톤). 네트워크/Sankey 등 "있어보이는" 그래프(ECharts/D3).
5. 맞춤공고 → **검색**(전 필터) + **이력서 선택 시 필터 자동 주입**.
6. 지도 탭 제거 → **공고 상세에 위치 지도 임베드**.
7. 디자인 시스템의 모션/디테일 전면 적용. **Playwright 스샷 반복으로 픽셀 디테일 완성**.
8. 대시보드/시장에 **경량 위젯 설정**(표시/숨김 + 콘텐츠 variant, 로컬 저장).
9. 완료 후 **API 명세서(Notion) 최신화**.

## 2. 비목표 (Non-goals)

- 모바일 화면 구조 재설계(색/토큰 리컬러만).
- 위젯 드래그&드롭 자유 배치(고정 큐레이션 + 표시/숨김/variant까지만).
- 급여/보상 위젯(백엔드에 데이터 없음).
- 국외(global) 지도(백엔드 지도 국내 전용).

---

## 3. 색 시스템 (정본: `src/design/tokens.ts` + `src/career/themes.ts`)

- **배경**: 콘텐츠 화이트 `#ffffff`, 셸 크롬 초저채도 그레이 `#f7f7f8`.
- **포인트/primary**: `#0b0b0c` (near-black). 액티브·primary 버튼·강조.
- **사이드바**: `#0d0d0d` 블랙, 좌측 edge 밀착 풀하이트. 액티브=흰 반투명 필(`rgba(255,255,255,.12)`) + 흰 아이콘/라벨.
- **뉴트럴 램프**(그레이): 0=#fff … 50=#f7f7f8, 100=#f0f0f1, 200=#e4e4e7, 300=#d4d4d8, 400=#a1a1aa, 500=#71717a, 600=#52525b, 700=#3f3f46, 900=#18181b.
- **데이터 시각화 램프(절제)**: 회색계 기반 + 액센트 2개 — 긍정 `#1f9d57`(그린), 갭/주의 `#d9822b`(앰버). 다계열(네트워크/Sankey/히트맵)만 이 좁은 램프 허용. 단일 지표는 모노톤.
- **검정 히어로 위젯**: 배경 `#0d0d0d`, 텍스트 화이트, 그래프는 화이트/그레이 + 액센트 1점. 숫자 좌하단 강조(macOS 톤).
- **스윕 대상(하드코딩된 슬레이트블루 `#2f61b8`/`rgba(47,97,184,*)`)**: `DesktopShell.css` 스크롤바, `MapScreen.tsx`·`placeholders.tsx` 지도 마커, 기타. 전량 토큰화.

**수용 기준**: `grep -r '#2f61b8\|rgba(47,97,184' src` 결과 0건(토큰/폴백 제외).

---

## 4. 셸 & 내비게이션 (`src/desktop/DesktopShell.tsx` + `.css`)

- 레일: 블랙 풀하이트, 마진 제거, 좌측 밀착. 브랜드마크 상단 → 아이콘+라벨 세로 스택 → 하단 설정/문서. 액티브=흰 반투명 필.
- **지도 섹션 제거**: `SECTIONS`에서 `map` 엔트리 삭제. `App.tsx`에서 `/map` 라우트·`DesktopMap`·`MapScreen` import 제거.
- 톱바: 슬림화. 큰 페이지 타이틀은 **본문 상단으로 이동**, 톱바는 서브 필탭 + 계정만.
- 맞춤공고 라벨 → **"검색"**, 아이콘 `Search`.
- 페이지 타이틀 토큰: 32~40px / weight 800 / ls -1px (Display/H1 스케일).

## 5. 대시보드 (개인화) — `src/desktop/pages/DesktopOverview.tsx`

멀티컬럼, 작은 위젯 다수. 위젯 카탈로그(초기 표시 세트 + variant):

| 위젯 | 형태 | 데이터(live→fallback) |
|---|---|---|
| 커리어 점수 | **검정 히어로** 링게이지 + 큰 % 좌하단 | `/match/coverage` → mock |
| 지원 가능 공고 | **검정 히어로** 큰 수 + 매치분포 미니바 | `/postings?min_match` count → mock |
| stat 타일 4종 | 기술보유율·지원가능비율·마감임박·신규 | 위 파생 |
| 맞춤공고 Top | compact 리스트 | `/postings?resume_id&sort=match` → mock |
| 마감 임박 | 리스트(D-day) | `/postings?deadline_within_days` → mock |
| 기술 갭 | 칩/미니바 | `/match/gap` → mock |
| 커버리지 분포 | 히스토그램 + 내 백분위 | `/match/coverage/distribution` → mock |
| 업종 적합도 | radar | `/match/gap` radar / `/match/pivot-map` → mock |
| 추천 로드맵 | 스텝 리스트 | `/match/roadmap` → mock |

이력서/세션 없으면 프리뷰(mock) + 'preview' 배지 + 이력서 등록 CTA.

## 6. 채용 시장 (시장 흐름) — `src/desktop/pages/placeholders.tsx#DesktopMarket` 재작성

개인 진단 위젯은 대시보드로 이관. 시장 인텔리전스 위젯:

| 위젯 | 그래프 | 데이터 |
|---|---|---|
| 수요 리더보드 | 검정 히어로 바 | **신규** `/stats/skill-share`(mv_skill_share) |
| 기술 공동출현 네트워크 | ECharts force graph | **신규** `/stats/cooccurrence`(mv_cooccurrence) |
| 역할↔스택 적합 | Sankey 또는 히트맵 | `/stats/role-stack-fit` matrix |
| Hype vs Hire | 시계열 라인/산점 | `/trend/hype-vs-hire` |
| 채용 계절성 | 월별 index area | `/stats/hiring-season` |
| 글로벌 vs 국내 갭 | 다이버징 바 | `/stats/global-domestic-gap` |
| 산업 지문 | 히트맵/small multiples | `/stats/industry-fingerprint` |
| GitHub 랭크 추이 | bump chart | `/trend/github-chronicle` |
| 기업 과거/현재 | 스플릿 리스트 | `/company/by-skill` |

기존 `insights.tsx`(TechCoNetworkGraph 등)·`Signal*`(Network/ConceptBridge=Sankey) ECharts 자산 재사용.

## 7. 검색 (구 맞춤공고) — `DesktopJobs` 재작성

- 필터 패널: 텍스트 · 풀 · 직무(`/job-categories`) · 스킬 멀티(`/skills`) · 지역(district) · 경력범위 · 마감임박 · 기업규모(mock/클라) · 정렬(latest/deadline/match).
- **이력서 셀렉터**: `/resume` 목록 → 선택 시 `/resume/{id}` + preferences로 스킬·직무·경력·풀 + 선호(지역/산업)를 필터에 **자동 주입**. 헤드라인 기능.
- 마스터-디테일(리스트 + 프리뷰). 프리뷰/상세에서 `/job/:id`로.
- 백엔드 `/postings` 필터 확장(단계적): `skills`, `career_min/max`, `industry`. 미지원분은 클라 필터로 폴백(하이브리드).

## 8. 공고 상세 + 지도 임베드 — `src/career/JobDetail.tsx`

- 상세 하단에 **위치 지도 카드**(Leaflet 단일 pin). 좌표는 백엔드 상세 응답의 신규 `lat`/`lng` 사용(§10-3). 없으면 region 문자열 폴백.
- 국외 공고는 지도 숨김(국내 전용).

## 9. 경량 위젯 설정 — 신규 `src/career/dashboardConfig.ts` (localStorage)

- 구조: `{ [section: 'dash'|'market']: { order: string[]; hidden: string[]; variant: Record<widgetId,string> } }`.
- 타이틀 옆 기어 버튼 → 팝오버/시트: 위젯 표시/숨김 토글 + variant 드롭다운(해당 위젯). 드래그 재배치 없음.
- `settingsStore.ts` 패턴 준용. 나중에 `resume_preference` 동기화 여지(지금은 로컬).

## 10. 백엔드 추가 (소규모, 승인됨) — `backend`

1. `GET /api/v1/stats/skill-share` — mv_skill_share 노출. params: `pool`(필수), `position?`, `top_k`. resp: `{items:[{canonical,category,posting_count,share}], as_of, sample_size}`.
2. `GET /api/v1/stats/cooccurrence` — mv_cooccurrence 노출. params: `pool`(필수), `skill?`, `top_k`. resp: `{nodes:[{canonical,category,freq}], links:[{source,target,co_count,co_rate}], as_of}`.
3. `PostingDetailResponse`에 `lat`/`lng`(Optional) 추가 — 상세 지도용. `app/crud/posting.py`·`app/schemas/posting.py`.
4. (단계적) `/postings` 필터 확장: `skills`, `career_min`, `career_max`, `industry`.

**주의**: 항상 `pool` 분리(global/domestic 혼합 금지). 급여 없음. 지도 국내 전용.

## 11. 모션 & 디테일 표준 (정본: `src/design/tokens.ts`)

- duration/easing/elevation/radius/타입스케일 토큰 준수. 500ms 초과 금지, 장식 바운스 금지.
- count-up(`useCountUp`), press scale 0.97 + opacity 0.8, 진입 decelerate/퇴장 accelerate, 시트만 spring.
- 차트: ECharts 애니메이션 절제, 진입 시 그려지는 방식.
- **QA 루프**: Playwright로 `/`, `/market`, `/jobs`, `/job/:id`를 1280·1440·1024폭에서 스샷 → 정렬·라운딩·간격·타이포·다크히어로 대비를 육안 교정. "AI 티" 디테일 결함 0 목표.

## 12. 하이브리드 데이터 훅 (일원화)

- 위젯별 `useWidgetData(fetchLive, mockValue)` 훅: 라이브 시도 → 실패/미구현/무데이터 시 mock 폴백 + `source:'live'|'mock'` 반환. 'preview' 배지는 `source==='mock'`일 때.
- API 베이스: `import.meta.env.VITE_API_BASE` (없으면 mock 모드). `api.ts` 목 어댑터를 실 fetch로 점진 교체.

---

## 13. 구현 순서 (Phase)

1. **P1 토대**: tokens/themes 모노크롬 전환 + 슬레이트블루 스윕 + 셸(블랙 레일·큰 타이틀·지도 제거).
2. **P2 대시보드**: 검정 히어로 2 + stat 타일 + 개인화 위젯 + 하이브리드 훅.
3. **P3 시장**: 백엔드 2 엔드포인트(skill-share/cooccurrence) + 시장 위젯(네트워크/Sankey/시계열).
4. **P4 검색 + 지도 임베드**: 필터 전면 + 이력서 자동주입 + 상세 lat/lng + JobDetail 지도. (`/postings` 필터 확장)
5. **P5 경량 위젯 설정**: dashboardConfig + 기어 UI.
6. **P6 디테일 QA**: Playwright 스샷 반복 교정 + 모바일 리컬러 확인.
7. **P7 문서**: API 명세서(Notion) 최신화.

각 Phase는 Sonnet/Haiku 서브에이전트로 구현, Opus가 리뷰.

## 14. 수용 기준 (Acceptance)

- 슬레이트블루 잔존 0(스윕 grep 0건). 사이드바 블랙·좌측밀착. 페이지 타이틀 ≥32px.
- 대시보드=개인화 위젯만, 시장=시장흐름 위젯만. 각 탭 위젯 수 증가·크기 축소.
- 검정 히어로 위젯 ≥2(대시보드), 네트워크+Sankey/히트맵 ≥1씩(시장).
- 검색 이력서 셀렉터 → 필터 자동 주입 동작.
- 지도 탭 없음. 공고 상세에 지도 표시(국내).
- 위젯 표시/숨김·variant 로컬 저장 동작.
- Playwright 스샷상 정렬/라운딩/간격 결함 없음.
- API 명세서 최신화 완료.
