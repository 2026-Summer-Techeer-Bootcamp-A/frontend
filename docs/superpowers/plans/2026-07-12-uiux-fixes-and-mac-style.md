# UI/UX 정리 + macOS 스타일 전역 요소 Implementation Plan

> **For agentic workers:** 이 계획은 태스크 순서대로 실행한다. 각 태스크 끝에서 `npm run build`(tsc+vite)가 통과해야 하고, 태스크 단위로 커밋한다. 브라우저 검증은 오케스트레이터가 별도로 수행하므로 **브라우저 MCP 도구를 사용하지 않는다.**

**Goal:** UX 감사에서 나온 내비 중복·장식 UI·가로 낭비·마이크로 디테일을 정리하고, `/design-system/apple-mac` 갤러리의 macOS 문법(글래스 메뉴·캡슐)을 우리 디자인 시스템 색으로 틴트해 전역 요소(계정 메뉴 등)에 적용한다.

**Branch:** `feat/desktop-shell-rail` (이미 체크아웃됨)

## Global Constraints

- 작업 디렉토리: `/home/rivermoon/Documents/techeer-2026-summer-a/frontend`
- **모바일(<1024px) 화면은 절대 변경 금지.** 데스크톱 전용 변경은 `.dshell` CSS 스코프 또는 `useIsDesktop()` 분기 안에서만.
- **건드리면 안 되는 파일(사용자 작업 중, uncommitted):** `src/App.tsx`, `src/design/DesignSystemLayout.tsx`, `src/design/LikeApple.tsx`, `src/design/LikeAppleMac.tsx`, `src/design/appleMacGallery.css`. 읽기는 가능, 수정·커밋 금지. `git add`는 항상 파일을 명시해서 한다 (`git add -A` 금지).
- 색·모션은 `src/design/tokens.ts` 준수: accent `#2f61b8`, ink `#1c1d21`, muted `#7c7f88`, 진입 `cubic-bezier(0,0,0.2,1)` 200ms, 퇴장 `cubic-bezier(0.4,0,1,1)` 150ms. **애플 순정 파랑 `#007aff`·신호등 버튼은 쓰지 않는다** — macOS에서 가져오는 건 재질(글래스 블러)·형태(캡슐·큰 라운딩)·문법(메뉴 행 구조)이고, 색은 우리 팔레트다.
- 코드·주석에 이모지 금지. 주석은 한국어, 기존 파일 톤.
- 커밋 메시지 푸터:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_013y6EDrnD5gYBK3bhaEikBg`

---

### Task 1: 내비 일원화 — 마이 중복 카드 제거 + 설정 패널 편입

**Files:** `src/desktop/DesktopShell.tsx`, `src/desktop/pages/placeholders.tsx`, `src/desktop/pages/placeholders.css`

1. `DesktopShell.tsx`의 마이 섹션 `items`에 `{ to: '/settings', label: '설정', end: true }`를 마지막에 추가 (이력서 · 계정 · 알림 · 설정).
2. `placeholders.tsx`의 `DesktopMy`에서 우측 "설정" 카드(aside — `MenuRow` 목록: 자격증 갭/알림 설정/개인정보·데이터/설정/로그인·로그아웃)를 **통째로 제거**. 프로필 카드 + 활성 이력서 + 보유 기술만 남긴다. 로그인/로그아웃 진입은 Task 3의 계정 메뉴가 대체한다.
3. `placeholders.css`에서 DesktopMy의 2열 그리드를 1열(본문 max-width 880px)로 조정. 안 쓰게 된 클래스는 삭제.
4. 이제 안 쓰는 import(`MenuRow`, 관련 아이콘 등)를 정리한다.

검증: `npm run build` 통과.
커밋: `fix(desktop): 마이 중복 설정 카드 제거·설정을 사이드 패널로 일원화`

### Task 2: 뒤로 버튼 기준 정리

**Files:** `src/career/charts.tsx`, `src/career/TechDetail.tsx`

1. `charts.tsx`의 `SubScreen`에 `desktopBack?: boolean`(기본 false) prop 추가. **데스크톱 분기에서만** back 버튼을 조건부 렌더 (모바일 분기는 그대로).
2. `TechDetail.tsx`는 상세 페이지이므로 `<SubScreen title={tech} desktopBack>`으로 유지. 나머지 사용처(설정 4종, CertGap, ResumeSubmit, StatesGallery, JobsScreen)는 프롭을 주지 않아 데스크톱에서 뒤로가 사라진다.
3. `JobDetail.tsx`의 데스크톱 분기 back 버튼은 상세 페이지이므로 그대로 둔다.

검증: `npm run build`.
커밋: `fix(desktop): 패널 직접 진입 페이지의 뒤로 버튼 제거(상세 페이지만 유지)`

### Task 3: 톱바 정리 + macOS식 계정 메뉴 (핵심)

**Files:** 새 파일 `src/desktop/MacMenu.tsx`, `src/desktop/macmenu.css`, 수정 `src/desktop/DesktopShell.tsx`, `src/desktop/DesktopShell.css`

1. **톱바 정리:** `DesktopShell.tsx`에서 장식뿐인 검색 버튼(`dshell__search`)과 국내/글로벌 토글(`dshell__pool`)을 제거한다(관련 CSS도 삭제). 톱바 우측엔 아바타만 남는다. 톱바가 비어 보이면 좌측에 현재 섹션명을 작은 브레드크럼 텍스트로 표시해도 된다(선택).
2. **MacMenu 컴포넌트:** `/design-system/apple-mac`의 `mg-menu` 문법(행 + 아이콘 + 구분선 + destructive)을 참고하되 우리 토큰으로 틴트한 범용 드롭다운을 만든다.
   - Props: `open`, `onClose`, `anchor`(정렬: 'right'), `items: Array<{ icon?, label, onClick?, destructive?, disabled? } | 'sep' | { header: { name, email } }>`.
   - 스타일(macmenu.css): `position:absolute; top:calc(100%+8px); right:0;` 배경 `rgba(255,255,255,0.72)` + `backdrop-filter: blur(20px) saturate(1.6)`, `border-radius:14px`, `border:1px solid rgba(28,29,33,0.08)`, 그림자 elevation4 `0 20px 48px rgba(20,30,60,0.14), 0 6px 16px rgba(20,30,60,0.08)`. 행: 8px 라운딩, hover 시 `#2f61b8` 배경 + 흰 글자(맥의 파란 하이라이트 문법을 우리 액센트로). destructive는 `#c8382d`. 헤더 행은 이름(600)+이메일(12px muted).
   - 모션: 진입 opacity 0→1 + translateY(-4px)→0 + scale(0.98)→1, 200ms decelerate, transform-origin top right. 퇴장은 150ms accelerate (열림 상태 클래스 토글로 처리, 언마운트 지연은 선택).
   - 동작: 외부 클릭·Escape로 닫힘(document 리스너), 트리거에 `aria-haspopup="menu"`, `aria-expanded`.
3. **아바타 → 계정 메뉴 연결:** `DesktopShell.tsx`에서 `useAuth()`(`src/career/authStore.ts`)를 읽어 아바타 버튼 클릭 시 MacMenu 오픈. 항목:
   - 헤더: 로그인 시 사용자 이름/이메일, 비로그인 시 "게스트".
   - 설정 (Settings 아이콘) → `/settings`
   - 알림 설정 (Bell) → `/settings/notifications`
   - sep
   - 로그인 상태면 `로그아웃`(LogOut, destructive, `logout()` 후 `/login` 이동), 아니면 `로그인`(LogIn) → `/login`.
   - `authStore`의 실제 API 시그니처(`useAuth`의 필드명)는 파일을 열어 확인 후 맞춘다.
4. 아바타 자체도 버튼화(`<button>`)하고 hover 스케일 등 탭 피드백은 opacity/scale 규칙(0.97) 준수.

검증: `npm run build`.
커밋: `feat(desktop): 톱바 정리 + macOS 문법의 계정 메뉴(우리 팔레트 틴트) 추가`

### Task 4: 공고 상세 2열 재배치 (데스크톱)

**Files:** `src/career/JobDetail.tsx`, `src/career/screens.css` (`.djd-*` 신규 클래스, `.dshell` 스코프 불필요 — 데스크톱 분기 전용 클래스라 무방)

1. `JobDetail.tsx` 데스크톱 분기를 2열 그리드로 재구성:
   - 좌측(본문, `minmax(0,1fr)`, max-width 760px): 회사·제목 헤더, 탭(상세 설명/회사) + 탭 콘텐츠. 기존 `detail` JSX에서 본문 부분을 재사용하되, **매칭 카드·지원 버튼은 우측으로 이동**시키기 위해 기존 `detail` 덩어리를 분해해야 하면 모바일 분기가 깨지지 않도록 공통 조각을 변수로 분리한다.
   - 우측(사이드, 320px, `position:sticky; top:24px`): ① 매칭 카드(내 매칭 %, 프로그레스 바, 요구 기술 칩 — 보유는 파랑 틴트) ② 메타 카드(지역·경력·마감 D-day) ③ `지원하기` 프라이머리 버튼(우리 액센트, 캡슐 라운딩 12px, 전체 폭) + 북마크 토글 버튼 나란히.
2. 그리드: `display:grid; grid-template-columns: minmax(0,1fr) 320px; gap:24px; align-items:start;` 1280px 미만에선 1열 폴백(`@media (max-width:1279px)`).
3. 기존 `.dsub__content crd maxWidth:760` 인라인 스타일은 새 레이아웃으로 대체.

검증: `npm run build`.
커밋: `feat(desktop): 공고 상세를 본문+사이드 2열로 재배치`

### Task 5: 마이크로 퀵픽스 묶음

**Files:** `src/desktop/DesktopShell.css`, `src/desktop/pages/placeholders.tsx`, `src/desktop/pages/placeholders.css`, `src/desktop/pages/DesktopOverview.css`, `src/career/TechDetail.tsx`, `src/career/screens.css`

1. **레일 툴팁 키보드 접근:** `DesktopShell.css`에 `.dshell__railbtn:focus-visible::after { opacity: 1; }`와 `.dshell__railbtn:focus-visible { outline: 2px solid var(--c-accent); outline-offset: 2px; }` 추가.
2. **자격증 갭 라벨 잘림:** CertGap이 쓰는 가로 바 차트의 라벨 클래스(`src/career/` 안에서 grep으로 찾기 — HBars 또는 CertGap 자체 마크업)의 고정폭을 데스크톱에서 완화: `.dshell` 스코프로 `min-width` 180px + `white-space: normal` 또는 폭 자동. 모바일 영향 없도록 `.dshell` 스코프 필수.
3. **지도 범례 + 리스트 스크롤:** `DesktopMap`(placeholders.tsx) 지도 카드 우상단 또는 리스트 헤더 아래에 범례 추가: `● 매칭 50% 이상`(#2f61b8) `● 50% 미만`(#8fa0b8). `.dmap__rows`에 `kit-scroll` 클래스 추가(이미 kit.css에 정의됨).
4. **대시보드 클릭 가능 항목 구분:** `DesktopOverview.css`에서 `.dov__dl-row:hover`에 배경(`#f6f8fc` 또는 `#eef1f6`) 추가. '오늘 브리핑' 리스트는 그대로.
5. **기술 상세 빈 상태:** `TechDetail.tsx`의 "이 기술의 상세 집계는 데모 데이터에 포함되지 않았어요" 카드를 빈 상태 스타일로: 중앙 정렬, muted 아이콘(lucide `ChartColumn` 등 24px), 12~13px muted 텍스트, 배경 `#f6f8fc` 점선 없는 연한 카드. 클래스는 screens.css에 `.crd-empty` 등으로 추가하고 모바일에도 무해한 중립 스타일로.
6. **로그인 게이트 컴팩트화:** 계정/알림의 로그인 게이트(해당 마크업을 grep으로 찾기 — "로그인이 필요해요")를 데스크톱에서 중앙 카드(max-width 360px, 버튼도 그 폭)로: `.dshell` 스코프 CSS.

검증: `npm run build`.
커밋: `fix(desktop): 툴팁 포커스·범례·라벨 잘림·빈 상태 등 마이크로 UX 정리`

### Task 6: 최종 빌드 + 요약

1. `npm run build` 최종 확인.
2. 변경 파일 목록과 태스크별 결과를 최종 텍스트로 보고한다 (스크린샷 불필요 — 오케스트레이터가 검증).
