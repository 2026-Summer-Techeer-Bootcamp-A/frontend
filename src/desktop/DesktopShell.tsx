import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  ChartNoAxesColumn,
  MapPin,
  CircleUser,
  BookOpen,
  Search,
} from 'lucide-react'
import { THEME, themeVars } from '../career/themes'
import './DesktopShell.css'

/* 데스크톱 셸 — Phase 2: 아이콘 레일 + 개폐형 세부 메뉴 패널.
   오른쪽 콘텐츠 영역만 라운드 카드로 처리하고, 왼쪽 레일은 아이콘만 노출한다.
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
  const [userOpen, setUserOpen] = useState(true)
  const active = sectionOf(location.pathname)

  // 하위 메뉴가 1개뿐인 섹션은 패널이 레일과 중복이라 아예 열지 않는다
  const hasSub = active.items.length > 1
  const open = userOpen && hasSub

  // 같은 아이콘 재클릭 = 패널 토글(하위 메뉴 있을 때만), 다른 아이콘 = 섹션 이동(+패널 열기)
  const onRailClick = (s: Section) => {
    if (s.key === active.key) {
      if (hasSub) setUserOpen((v) => !v)
      return
    }
    setUserOpen(true)
    navigate(s.home)
  }

  return (
    <div className="dshell" style={themeVars(THEME)}>
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

        {/* 학습 문서는 서브 — 레일 하단 분리 배치. 셸 밖 라우트로 이동한다. */}
        <div className="dshell__railfoot">
          <button
            type="button"
            aria-label="RAG 문서"
            data-label="RAG 문서"
            className="dshell__railbtn"
            onClick={() => navigate('/rag-docs')}
          >
            <BookOpen size={21} strokeWidth={2} />
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
  )
}
