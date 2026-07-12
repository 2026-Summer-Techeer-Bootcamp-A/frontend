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
  Settings,
  Bell,
  LogOut,
  LogIn,
} from 'lucide-react'
import { THEME, themeVars } from '../career/themes'
import { useAuth } from '../career/authStore'
import MacMenu, { type MacMenuEntry } from './MacMenu'
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
  foot?: boolean // 레일 하단(railfoot) 배치 — macOS처럼 설정은 하단에 둔다
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
    match: ['/resume'],
    items: [{ to: '/resume', label: '이력서', end: true }],
  },
  {
    key: 'settings',
    label: '설정',
    icon: Settings,
    home: '/settings',
    match: ['/settings'],
    foot: true,
    items: [
      { to: '/settings/account', label: '계정' },
      { to: '/settings/notifications', label: '알림' },
      { to: '/settings/privacy', label: '개인정보' },
      { to: '/settings/terms', label: '이용약관' },
      { to: '/settings/about', label: '앱 정보' },
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
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, isAuthed, logout } = useAuth()
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

  const accountItems: MacMenuEntry[] = [
    { header: { name: isAuthed ? (user?.nickname ?? '사용자') : '게스트', email: user?.email ?? '로그인하고 맞춤 정보를 받아보세요' } },
    'sep',
    { icon: <Settings size={16} />, label: '설정', onClick: () => navigate('/settings') },
    { icon: <Bell size={16} />, label: '알림 설정', onClick: () => navigate('/settings/notifications') },
    'sep',
    isAuthed
      ? { icon: <LogOut size={16} />, label: '로그아웃', destructive: true, onClick: () => { logout(); navigate('/login') } }
      : { icon: <LogIn size={16} />, label: '로그인', onClick: () => navigate('/login') },
  ]

  const avatarInitial = (user?.nickname || user?.email || '리버').slice(0, 2).toUpperCase()

  return (
    <div className="dshell" style={themeVars(THEME)}>
      <aside className="dshell__rail">
        {/* 브랜드 도트 — 실제 로고 확정 전 플레이스홀더 */}
        <div className="dshell__brand-dot" aria-hidden />

        <nav className="dshell__railnav" aria-label="주요 메뉴">
          {SECTIONS.filter((s) => !s.foot).map((s) => {
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

        {/* 하단 섹션(설정) + 학습 문서 — macOS처럼 설정류는 레일 하단에 분리 배치 */}
        <div className="dshell__railfoot">
          {SECTIONS.filter((s) => s.foot).map((s) => {
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
          <span className="dshell__crumb">{active.label}</span>
          <div className="dshell__topright">
            <div className="dshell__accountwrap">
              <button
                type="button"
                className="dshell__avatar"
                aria-label="계정 메뉴"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                {avatarInitial}
              </button>
              <MacMenu open={accountOpen} onClose={() => setAccountOpen(false)} items={accountItems} anchor="right" />
            </div>
          </div>
        </header>

        <main className="dshell__content">{children}</main>
      </div>
    </div>
  )
}
