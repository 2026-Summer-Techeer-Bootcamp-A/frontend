# 프론트-백 연결 작업 3인 분배

작성일: 2026-07-13. 백엔드는 `feat/frontend-api-completion` 브랜치(main merge 완료, `feat/mono-command-center-api` 포함)에 전부 구현·테스트 완료됨(145+ 테스트 통과). 이 작업은 신규 백엔드 개발이 아니라 **프론트 mock → 실제 fetch 연결**이 핵심.

## ⚠️ 충돌 방지 공통 규칙 (필독)

- **공용 파일**(`placeholders.tsx`, `wowWidgets.tsx`, `career/api.ts`)은 3명이 같이 열지만, **각자 담당 함수만** 수정(다른 사람 함수 절대 편집 금지).
- 작업 시작 전 `git pull`, 작업 끝나면 바로 `npm run build` 확인 후 `push`. 커밋 자주 작게.
- 각자 개인 브랜치(`feat/connect-mypage` / `feat/connect-jobs-market` / `feat/connect-dashboard`)에서 `main` 기준으로 작업 → PR로 합류.
- 백엔드 라우터는 3명 모두 같은 파일(`insight.py` 등)을 참조하지만 **읽기(GET)만** 하므로 백엔드 코드 수정 충돌은 없음. 연동 중 버그 발견 시 백엔드 `main`에 각자 수정 후 rebase.
- 데이터 연결 패턴은 전부 동일: `src/career/useWidgetData.ts`의 `useWidgetData(fetchLive, mock)`에서 `fetchLive: null` → 실제 `fetch(`${VITE_API_BASE}/api/v1/...`)` 함수로 교체.
- 세 사람 다 `.env`에 `VITE_API_BASE=http://localhost:8000` 설정 후 시작.

---

## 🟦 P1 — 대시보드 (개인화)

**담당 프론트 파일**: `src/desktop/pages/DesktopOverview.tsx` (파일 전체 소유) · `src/career/wowWidgets.tsx`의 `LatestJobsTimeline`/`LearningPathWidget`/`SkillUnlockWidget` **함수만** · `src/career/api.ts`에 `dashboardApi` 신규 추가

| 라우터 | 응답 요지 | 연결할 위젯 | 작업 내용 |
|---|---|---|---|
| `GET /api/v1/match/coverage` | `coverage_score`, `top_skills[]` | 커리어 점수 히어로 | `resume_id`/`session_id`+`pool` 필요. mock coverage 계산 제거, 실값으로 |
| `GET /api/v1/match/coverage/distribution` | `histogram[]`, `my_percentile` | 커버리지 분포 위젯 | 히스토그램 + 백분위 마커 |
| `GET /api/v1/match/pivot-map` | `targets[{name,coverage,missing}]` | 업종 적합도(radar) | industry kind로 조회, radar 축 매핑 |
| `GET /api/v1/match/roadmap` | `steps[{tech,delta,matched_after}]` | 학습 로드맵 위젯 | steps 그대로 렌더(이미 mock과 shape 유사) |
| `GET /api/v1/stats/skill-unlock` | `funnel`, `candidates[]` | 한계 해금 위젯 | `position`(직군 탭) 파라미터 연동 |
| `GET /api/v1/stats/posting-timeline` | `daily[{date,total,matched}]` | 최신 공고 타임라인(상단 막대) | `days=36`, `resume_id` |
| `GET /api/v1/postings?resume_id&sort=match&page_size=12` | `items[]` | 최신 공고 타임라인(리스트)·맞춤 공고 Top | 매칭순 정렬, 카드 클릭→상세 |
| `GET /api/v1/postings?resume_id&min_match=50` | `total` | 지원 가능 공고 히어로/KPI | count만 사용 |
| `GET /api/v1/stats/skill-share?pool&top_k` | `items[{canonical,share}]` | 내 스킬 시장 모멘텀 | 내 보유기술만 필터링해 표시 |

**후속과제(데이터 준비 후)**: 북마크한 공고·최근 본 공고는 로컬스토리지(id만 저장) + `GET /postings/{id}` 개별 조회로 카드 채우기(백엔드 다건조회 없으면 반복 호출).

---

## 🟩 P2 — 채용공고 검색 + 공고상세 + 채용시장

**담당 프론트 파일**: `src/desktop/pages/placeholders.tsx`의 `DesktopJobs`/`DesktopMarket` **함수만** · `src/career/JobDetail.tsx`(데스크톱 분기) · `src/career/wowWidgets.tsx`의 시장 위젯들(`HypeVsHireWidget`/`CompetencyWidget`/`ResponseRateWidget`/`ConceptSignalWidget`/`TrendChronicleWidget`/`GithubChronicleWidget`/`GlobalDomesticGapWidget`/`GithubTopicsWidget`) **함수만** · `src/desktop/DesktopShell.tsx`+`GlobalSearch.tsx`(우상단 검색) · `src/career/api.ts`에 `jobsApi`/`marketApi`/`searchApi` 신규 추가

| 라우터 | 응답 요지 | 연결할 화면/위젯 | 작업 내용 |
|---|---|---|---|
| `GET /api/v1/postings` (pool·position·sort·district·deadline_within_days·match_only·min_match·resume_id·page) | `items[]`, `total` | 검색 결과 리스트 | 필터 패널 각 state를 쿼리파라미터로 매핑 |
| `GET /api/v1/postings/{id}` | 상세 전체 필드(+lat/lng) | 공고 상세 본문 | 탭(상세/회사) 데이터 매핑 |
| `GET /api/v1/postings/{id}/nearby` | `items[]` | 상세 "주변 채용공고" | district 기반, 이미 프론트 로직 있음 → API로 교체 |
| `GET /api/v1/postings/{id}/similar` | `items[{...,overlap_count}]` | 상세 "비슷한 채용공고" | 겹침 기술 칩 그대로 매핑 |
| `GET /api/v1/postings/map` | `pins[]`(lat/lng) | 상세 지도 마커(정밀 좌표 보강용) | 현재 marketData mock pins → 실 API |
| `GET /api/v1/search?q&limit` | `postings[]`,`skills[]`,`companies[]` | 우상단 GlobalSearch | 디바운스 250ms, 3섹션 드롭다운 |
| `GET /api/v1/job-categories` | `categories[]` | 검색 직무 필터 옵션 | 현재 클라 `derivePosition` 추정 로직 대체(후속) |
| `GET /skills?q` | `skills[]` | 검색 기술스택 필터 옵션 | 상위 N개 검색/자동완성 |
| `GET /api/v1/stats/skill-share?pool&position&top_k` | `items[]` | 시장 "수요" 리더보드 | scope(내직무/전체) → position 파라미터 |
| `GET /api/v1/stats/newcomer-gate` | `items[{tech,open_rate}]` | "신입에게 열린 기술" | open_rate desc |
| `GET /api/v1/stats/skill-trend-yearly?pool` | `years[]`,`series[]`,`movers` | 연도별 추이·급상승급감 | 라인+무버스 둘 다 이 응답에서 |
| `GET /api/v1/stats/cooccurrence?pool&skill&top_k` | `nodes[]`,`links[]` | 기술 공동출현 네트워크 | force graph 데이터 매핑 |
| `GET /api/v1/stats/hot-companies?pool&days&limit` | `items[]` | 이번 달 활발 기업 | |
| `GET /api/v1/stats/region-density?pool&limit` | `items[]` | 지역별 공고 밀도 | |
| `GET /api/v1/stats/response-rate?pool` | `median_rate`,`companies[]` | 응답 잘 오는 회사 | |
| `GET /api/v1/stats/industry-fingerprint` | `industries[]` | 산업 지문(후속 위젯) | |
| `GET /api/v1/stats/role-stack-fit?pool` | `matrix` | 직군 스택 궁합(후속 위젯) | |
| `GET /api/v1/stats/hiring-season` | `months[]` | 채용 계절성(후속 위젯) | |
| `GET /api/v1/stats/global-domestic-gap` | `global_favored[]`,`domestic_favored[]` | 글로벌 vs 국내 격차 | |
| `GET /api/v1/trend/hype-vs-hire?skill` | `quarters[]` | Hype vs Hire | 스킬 단건 조회 — 카탈로그 상위 N개 순회 필요(설계 확인) |
| `GET /api/v1/trend/github-chronicle` | `years[]`,`lines[]`,`events[]` | GitHub 스타 순위 변천사 | |
| `GET /api/v1/trend/github-topics` | `items[]`,`opportunities[]` | 오픈소스 관심 vs 채용수요 | |
| `GET /api/v1/company/by-skill?skill&pool` | `present[]`,`past[]` | (후속 위젯 — 현재 미배선) | |
| `GET /api/v1/cert/gap`, `GET /certs` | 자격증 갭 | `/cert-gap` 페이지 | 있으면 연결 |

**⚠️ 데이터 미준비 — mock 유지(백로그, 백엔드 파이프라인 필요)**: `CompetencyWidget`(competency 테이블 없음), `ConceptSignalWidget`(concept-signature ETL 미실행, 0 rows), 기업규모별 요구/분포(tier 필드 없음), 세대별 변화(설립연도 없음), 트렌드 전파 네트워크(교차상관 파이프라인 없음). **이 5개는 API 연결하지 말고 mock 유지**.

---

## 🟨 P3 — 마이페이지 + 세부(이력서/설정/인증)

**담당 프론트 파일**: `src/desktop/pages/placeholders.tsx`의 `DesktopMy` **함수만** · `src/desktop/SkillManagerModal.tsx` · `src/career/authStore.ts`+`auth/LoginScreen.tsx`+`SignupScreen.tsx` · `src/career/state.ts`(`useResumesState` 등) · `src/career/ResumeSubmit.tsx` · `src/career/settings/*.tsx` · `src/career/api.ts`에 `authApi`(mock→실제 교체)+`resumeApi` 신규 추가

| 라우터 | 응답 요지 | 연결할 화면 | 작업 내용 |
|---|---|---|---|
| `POST /api/v1/auth/signup` | `{id,email,nickname}` | SignupScreen | 폼 제출 → 토큰 저장 |
| `POST /api/v1/auth/login` | `{access_token}` | LoginScreen | 로그인 후 `GET /me` 호출 |
| `POST /api/v1/auth/logout` | 204 | 로그아웃 버튼(DesktopMy/MacMenu) | 토큰 폐기 |
| `GET /api/v1/me` | `{id,email,nickname,is_admin}` | authStore | 세션 복원 |
| `POST /api/v1/resume/parse` | `{skills[],position,career_min/max}` | ResumeSubmit(PDF 업로드) | 파싱 결과 미리보기 |
| `POST /api/v1/resume/confirm` | `{session_id}` | ResumeSubmit(비로그인 플로우) | session_id를 이후 match/stats 호출에 사용 |
| `POST /api/v1/resume` (create) | `{resume_id}` | ResumeSubmit 저장 | **단일 이력서 원칙**: 기존 것 있으면 PUT으로 교체 |
| `GET /api/v1/resume` (list) | `{items[]}` | (단일화됐으므로 첫 항목만 사용) | |
| `GET /api/v1/resume/{id}` | 상세 | DesktopMy "내 이력서" 카드 | |
| `PUT /api/v1/resume/{id}` | - | SkillManagerModal 저장 · ResumeSubmit 수정 | 기술 추가/제거 시 PUT |
| `DELETE /api/v1/resume/{id}` | 204 | 이력서 삭제(설정) | |
| `GET/PUT /api/v1/resume/{id}/preferences` | 선호 설정 | SettingsAccount 또는 DesktopMy | 희망 지역/기업규모 등 |
| `POST /api/v1/resume/feedback` | `{feedback[],questions[]}` | ResumeSubmit 결과 화면 | LLM 피드백 표시 |
| `GET /skills?q` | 기술 카탈로그 | SkillManagerModal 검색 | (P2와 같은 GET 엔드포인트, 읽기전용이라 충돌 없음) |
| `GET /api/v1/job-categories` | 직무 목록 | ResumeSubmit position 선택 | |

---

## 시작 체크리스트

1. 세 사람 다 `backend`에서 `git switch main`, `git pull` (API는 이미 main에 머지 완료).
2. `frontend`에서 각자 개인 브랜치 생성(`feat/connect-{mypage|jobs-market|dashboard}`) — `main` 기준. `.env`에 `VITE_API_BASE=http://localhost:8000` 설정.
3. 표에 있는 자기 함수부터 `useWidgetData`의 `fetchLive`를 채워넣기 시작.
4. mock 유지 항목(P2의 5개)은 건드리지 말 것 — 백엔드 파이프라인 나올 때까지 백로그.
