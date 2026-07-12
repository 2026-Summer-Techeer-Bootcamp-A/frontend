# 데스크톱 셸 개편(아이콘 레일 + 세부 메뉴 패널) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PC(>=1024px) 레이아웃을 "아이콘 레일 + 개폐형 세부 메뉴 패널 + 콘텐츠"의 3열 라운드 프레임 구조로 개편한다.

**Architecture:** `DesktopShell`(TSX+CSS)을 3열 구조로 전면 재작성하고, 셸 밖에 떠돌던 `/settings*`·`/cert-gap`·`/resume/submit` 라우트를 `ResponsiveProductLayout` 아래로 이동한다. 활성 섹션은 URL에서 파생하고, 패널 개폐는 로컬 state + CSS width 트랜지션으로 처리한다.

**Tech Stack:** React 18 + react-router-dom v6 + lucide-react + 일반 CSS(`src/design/tokens.ts` 값 준수). 테스트 러너 없음 — 검증은 `npm run build`(tsc -b + vite)와 브라우저 확인.

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-12-desktop-shell-redesign-design.md`
- 모바일(<1024px) 동작·화면 변화 금지. `ResponsiveProductLayout`은 모바일에서 `<Outlet />` 통과.
- 색·모션은 토큰 값 그대로: accent `#2f61b8`, ink `#1c1d21`, muted `#7c7f88`, 패널 트랜지션 300ms `cubic-bezier(0.25, 0.1, 0.25, 1)`, 진입 페이드 `cubic-bezier(0, 0, 0.2, 1)`, 퇴장 페이드 `cubic-bezier(0.4, 0, 1, 1)`. 바운스 금지.
- 프레임: radius 24px, 그림자 elevation 3 `0 8px 24px rgba(20,30,60,0.08), 0 2px 6px rgba(20,30,60,0.05)`, 화면 여백 14px, 배경 `#dee2ea`.
- 코드·주석에 이모지 금지. 주석은 기존 파일처럼 한국어.
- 커밋 메시지는 기존 컨벤션(`feat(...)`, 한국어 요약) + Co-Authored-By 푸터.

---

### Task 1: DesktopShell 3열 구조 재작성 (TSX + CSS)

**Files:**
- Modify: `src/desktop/DesktopShell.tsx` (전면 교체)
- Modify: `src/desktop/DesktopShell.css` (전면 교체)

**Interfaces:**
- Consumes: `themeVars(THEME)` (`src/career/themes.ts`), lucide-react 아이콘, `NavLink`/`useLocation`/`useNavigate`
- Produces: `DesktopShell({ children })` — 시그니처 불변(기존 `ResponsiveProductLayout`이 그대로 사용). CSS 클래스 `dshell__*` 네임스페이스.

- [ ] **Step 1: DesktopShell.tsx 전면 교체**

```tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  ChartNoAxesColumn,
  MapPin,
  CircleUser,
  MessageSquare,
  Search,
} from 'lucide-react'
import { THEME, themeVars } from '../career/themes'
import './DesktopShell.css'

/* 데스크톱 셸 — Phase 2: 아이콘 레일 + 개폐형 세부 메뉴 패널.
   앱 전체를 라운드 프레임 카드에 담고, 왼쪽 레일은 아이콘만 노출한다.
   활성 섹션은 URL에서 파생하고, 같은 아이콘 재클릭이 패널을 토글한다. */

type SubItem = { to: string; label: string; end?: boolean }
type Section = {
  key: string
  label: string
  icon: typeof LayoutDashboard
  home: string // 아이콘 클릭 시 이동할 대표 라우트
  match: string[] // 이 섹션 소속으로 판정할 경로 프리픽스
  items: SubItem[]
}

// 모바일 4탭을 계승한 5섹션. 셸 밖에 떠돌던 설정·자격증 갭·이력서 제출을 하위 메뉴로 흡수.
const SECTIONS: Section[] = [
  {
    key: 'dash',
    label: '대시보드',
    icon: LayoutDashboard,
    home: '/',
    match: ['/'],
    items: [{ to: '/', label: '개요', end: true }],
  },
  {
    key: 'jobs',
    label: '맞춤 공고',
    icon: Briefcase,
    home: '/jobs',
    match: ['/jobs', '/job/'],
    items: [{ to: '/jobs', label: '공고 목록' }],
  },
  {
    key: 'market',
    label: '채용 시장',
    icon: ChartNoAxesColumn,
    home: '/market',
    match: ['/market', '/cert-gap', '/tech/'],
    items: [
      { to: '/market', label: '시장 개요' },
      { to: '/cert-gap', label: '자격증 갭' },
    ],
  },
  {
    key: 'map',
    label: '지도',
    icon: MapPin,
    home: '/map',
    match: ['/map'],
    items: [{ to: '/map', label: '지도 보기' }],
  },
  {
    key: 'my',
    label: '마이',
    icon: CircleUser,
    home: '/resume',
    match: ['/resume', '/settings'],
    items: [
      { to: '/resume', label: '이력서', end: true },
      { to: '/resume/submit', label: '이력서 제출' },
      { to: '/settings/account', label: '계정' },
      { to: '/settings/notifications', label: '알림' },
    ],
  },
]

// 현재 경로가 속한 섹션. '/'는 정확히 일치할 때만 대시보드로 본다.
function sectionOf(pathname: string): Section {
  if (pathname === '/') return SECTIONS[0]
  const hit = SECTIONS.find((s) =>
    s.match.some((m) => m !== '/' && pathname.startsWith(m)),
  )
  return hit ?? SECTIONS[0]
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const active = sectionOf(location.pathname)

  // 같은 아이콘 재클릭 = 패널 토글, 다른 아이콘 = 섹션 이동(+패널 열기)
  const onRailClick = (s: Section) => {
    if (s.key === active.key) {
      setOpen((v) => !v)
      return
    }
    setOpen(true)
    navigate(s.home)
  }

  return (
    <div className="dshell" style={themeVars(THEME)}>
      <div className="dshell__frame">
        <aside className="dshell__rail">
          {/* 브랜드 도트 — 실제 로고 확정 전 플레이스홀더 */}
          <div className="dshell__brand-dot" aria-hidden />

          <nav className="dshell__railnav" aria-label="주요 메뉴">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-label={s.label}
                  data-label={s.label}
                  className={`dshell__railbtn${s.key === active.key ? ' on' : ''}`}
                  onClick={() => onRailClick(s)}
                >
                  <Icon size={21} strokeWidth={2} />
                </button>
              )
            })}
          </nav>

          {/* AI는 서브 — 레일 하단 분리 배치. 셸 밖 라우트로 이동한다. */}
          <div className="dshell__railfoot">
            <button
              type="button"
              aria-label="AI 채팅"
              data-label="AI 채팅"
              className="dshell__railbtn"
              onClick={() => navigate('/rag-docs')}
            >
              <MessageSquare size={21} strokeWidth={2} />
            </button>
          </div>
        </aside>

        <aside
          className={`dshell__panel${open ? ' open' : ''}`}
          aria-hidden={!open}
        >
          <div className="dshell__panelinner">
            <div className="dshell__paneltitle">{active.label}</div>
            <nav className="dshell__panelnav" aria-label={`${active.label} 세부 메뉴`}>
              {active.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  tabIndex={open ? 0 : -1}
                  className={({ isActive }) =>
                    `dshell__navitem${isActive ? ' on' : ''}`
                  }
                >
                  {it.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <div className="dshell__main">
          <header className="dshell__topbar">
            <button className="dshell__search" type="button">
              <Search size={16} />
              <span>공고 · 기술 검색</span>
            </button>
            <div className="dshell__topright">
              {/* 국내/글로벌 풀 토글 자리 — 실제 상태 연동은 Phase 3 */}
              <div className="dshell__pool" role="group" aria-label="채용 풀">
                <button type="button" className="on">국내</button>
                <button type="button">글로벌</button>
              </div>
              <div className="dshell__avatar" aria-label="프로필">리버</div>
            </div>
          </header>

          <main className="dshell__content">{children}</main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: DesktopShell.css 전면 교체**

```css
/* 데스크톱 셸 — 아이콘 레일 + 개폐형 세부 메뉴 패널 + 라운드 프레임.
   색·모션 값은 src/design/tokens.ts 를 정본으로 한다. */

.dshell {
  min-height: 100dvh;
  padding: 14px;
  background: #dee2ea; /* 프레임 뒤 백드롭 — neutral 200~300 사이 */
  color: var(--c-ink);
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: var(--c-ls);
}

/* ---------- 라운드 프레임 ---------- */
.dshell__frame {
  display: flex;
  height: calc(100dvh - 28px);
  border-radius: 24px;
  background: var(--c-card);
  box-shadow: 0 8px 24px rgba(20, 30, 60, 0.08), 0 2px 6px rgba(20, 30, 60, 0.05);
  overflow: hidden;
}

/* ---------- 아이콘 레일 ---------- */
.dshell__rail {
  flex: none;
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 0;
  background: var(--c-card);
  border-right: 1px solid #eef1f6;
}

.dshell__brand-dot {
  width: 26px;
  height: 26px;
  margin-bottom: 18px;
  border-radius: 9px;
  background: var(--c-accent);
}

.dshell__railnav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dshell__railfoot {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #eef1f6;
}

.dshell__railbtn {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: var(--c-muted);
  transition: background 0.15s ease, color 0.15s ease;
}
.dshell__railbtn:hover {
  background: #f2f5fb;
  color: var(--c-ink);
}
.dshell__railbtn.on {
  background: var(--c-chipbg);
  color: var(--c-chiptext);
}

/* 호버 툴팁 — 아이콘만 있는 레일의 라벨 보조 */
.dshell__railbtn::after {
  content: attr(data-label);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  translate: 0 -50%;
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--c-ink);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 30;
}
.dshell__railbtn:hover::after {
  opacity: 1;
}

/* ---------- 세부 메뉴 패널 (개폐) ---------- */
.dshell__panel {
  flex: none;
  width: 0;
  overflow: hidden;
  background: var(--c-card);
  border-right: 1px solid transparent;
  transition: width 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.dshell__panel.open {
  width: 240px;
  border-right-color: #eef1f6;
}

/* 내부는 고정폭 — 개폐 중 텍스트가 찌그러지지 않게 한다 */
.dshell__panelinner {
  width: 240px;
  height: 100%;
  padding: 22px 14px;
  opacity: 0;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 1, 1); /* 퇴장: accelerate */
}
.dshell__panel.open .dshell__panelinner {
  opacity: 1;
  transition: opacity 0.3s cubic-bezier(0, 0, 0.2, 1); /* 진입: decelerate */
}

.dshell__paneltitle {
  padding: 2px 10px 14px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.dshell__panelnav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dshell__navitem {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--c-muted);
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s ease, color 0.15s ease;
}
.dshell__navitem:hover {
  background: #f2f5fb;
  color: var(--c-ink);
}
.dshell__navitem.on {
  background: var(--c-chipbg);
  color: var(--c-chiptext);
  font-weight: 700;
}

/* ---------- 메인(톱바 + 콘텐츠) ---------- */
.dshell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #f6f8fc; /* = THEME.screenBg */
}

.dshell__topbar {
  flex: none;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 28px;
  background: var(--c-card);
  border-bottom: 1px solid #e2e5ec;
}

.dshell__search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(420px, 40vw);
  padding: 9px 14px;
  border-radius: 12px;
  background: #f2f5fb;
  color: var(--c-muted);
  font-size: 13.5px;
  text-align: left;
}

.dshell__topright {
  display: flex;
  align-items: center;
  gap: 14px;
}

.dshell__pool {
  display: flex;
  padding: 3px;
  border-radius: 10px;
  background: #eef1f6;
}
.dshell__pool button {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-muted);
}
.dshell__pool button.on {
  background: var(--c-card);
  color: var(--c-ink);
  box-shadow: 0 1px 2px rgba(20, 30, 60, 0.06);
}

.dshell__avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--c-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.dshell__content {
  flex: 1;
  min-width: 0;
  padding: 28px;
  overflow-y: auto;
}
```

- [ ] **Step 3: 빌드로 타입·번들 검증**

Run: `cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend && npm run build`
Expected: 에러 0으로 성공 (`tsc -b` 통과 + vite build 완료)

- [ ] **Step 4: 커밋**

```bash
git add src/desktop/DesktopShell.tsx src/desktop/DesktopShell.css
git commit -m "feat(desktop): 셸을 아이콘 레일+개폐형 세부 메뉴 패널+라운드 프레임으로 개편"
```

---

### Task 2: 셸 밖 라우트를 ResponsiveProductLayout 아래로 이동

**Files:**
- Modify: `src/App.tsx:103-128` (라우트 배치만 변경, import 변경 없음)

**Interfaces:**
- Consumes: 기존 컴포넌트 그대로 (`ResumeSubmit`, `CertGap`, `SettingsHome` 등)
- Produces: `/resume/submit`, `/cert-gap`, `/settings*`가 데스크톱에서 셸 안에 렌더됨. 모바일은 기존과 동일(레이아웃이 Outlet 통과).

- [ ] **Step 1: 라우트 이동**

`src/App.tsx`에서 `<Route element={<ResponsiveProductLayout />}>` 블록을 아래처럼 바꾼다. `/resume/submit`, `/cert-gap`, `/settings*` 라우트를 블록 안으로 옮기고, 원래 자리(기존 111~115행의 `/resume/submit`·`/cert-gap`, 121~126행의 `/settings*`)에서 삭제한다. `/job/:id`, `/tech/:name`, `/splash`, `/login`, `/signup`, `/states`, `/offline`은 기존 자리에 그대로 둔다.

```tsx
      <Route element={<ResponsiveProductLayout />}>
        <Route path="/" element={<Adaptive mobile={CareerDashboard} desktop={DesktopOverview} />} />
        <Route path="/jobs" element={<Adaptive mobile={JobsScreen} desktop={DesktopJobs} />} />
        <Route path="/market" element={<Adaptive mobile={MarketScreen} desktop={DesktopMarket} />} />
        <Route path="/map" element={<Adaptive mobile={MapScreen} desktop={DesktopMap} />} />
        <Route path="/resume" element={<Adaptive mobile={ResumeScreen} desktop={DesktopMy} />} />
        {/* 아직 모바일 스타일 화면 — 데스크톱에선 셸 안에서 렌더되고, 페이지 데스크톱화는 다음 단계 */}
        <Route path="/resume/submit" element={<ResumeSubmit />} />
        <Route path="/cert-gap" element={<CertGap />} />
        <Route path="/settings" element={<SettingsHome />} />
        <Route path="/settings/account" element={<SettingsAccount />} />
        <Route path="/settings/notifications" element={<SettingsNotifications />} />
        <Route path="/settings/terms" element={<SettingsLegal kind="terms" />} />
        <Route path="/settings/privacy" element={<SettingsLegal kind="privacy" />} />
        <Route path="/settings/about" element={<SettingsAbout />} />
      </Route>

      {/* 제품 상세 — 데스크톱 마스터-디테일 전환은 Phase 3. 지금은 모바일 화면 유지. */}
      <Route path="/job/:id" element={<JobDetail />} />
      <Route path="/tech/:name" element={<TechDetail />} />
```

- [ ] **Step 2: 빌드 검증**

Run: `cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend && npm run build`
Expected: 에러 0으로 성공

- [ ] **Step 3: 커밋**

```bash
git add src/App.tsx
git commit -m "feat(routes): 설정·자격증 갭·이력서 제출 라우트를 제품 셸 레이아웃 안으로 이동"
```

---

### Task 3: 브라우저 검증 (데스크톱 + 모바일)

**Files:**
- 없음 (검증 전용 — 문제 발견 시 해당 파일 수정 후 재검증)

**Interfaces:**
- Consumes: Task 1·2 결과 전체
- Produces: 스펙 "검증" 섹션 충족 확인

- [ ] **Step 1: 개발 서버 기동**

Run: `cd /home/rivermoon/Documents/techeer-2026-summer-a/frontend && npm run dev` (백그라운드)
Expected: `Local: http://localhost:5173/`

- [ ] **Step 2: 데스크톱(1440x900) 확인** — 브라우저 자동화(chrome-devtools 또는 playwright MCP)로:

1. `http://localhost:5173/` 접속, 뷰포트 1440x900 → 라운드 프레임 + 아이콘 레일 + "대시보드" 패널 + 콘텐츠 3열 확인 (스크린샷)
2. 채용 시장 아이콘 클릭 → `/market` 이동 + 패널에 "시장 개요/자격증 갭" 표시
3. 같은 아이콘 재클릭 → 패널 닫힘(콘텐츠 넓어짐), 다시 클릭 → 열림 (스크린샷)
4. 패널의 "자격증 갭" 클릭 → `/cert-gap`가 셸 안에서 렌더, 채용 시장 아이콘 활성 유지
5. `http://localhost:5173/settings/account` 직접 진입 → 마이 섹션 활성 + 패널에 "계정" 활성 표시

- [ ] **Step 3: 모바일(390x844) 확인**

1. 뷰포트 390x844로 `http://localhost:5173/` → 기존 모바일 대시보드(셸 없음) 그대로인지 확인
2. `/settings/account` → 기존 모바일 설정 화면 그대로인지 확인

- [ ] **Step 4: 발견된 문제 수정 후 커밋** (문제 없으면 생략)

```bash
git add -A src/
git commit -m "fix(desktop): 셸 검증 중 발견된 시각·동작 문제 수정"
```
