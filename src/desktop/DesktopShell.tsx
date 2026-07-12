import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  ChartNoAxesColumn,
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

/* 데스크톱 셸 — Phase 3: 아이콘+라벨 레일 + 톱바 필 탭.
   개폐형 패널은 섹션마다 있다 없다 해 콘텐츠 폭이 출렁였다 — 패널을 없애고
   하위 메뉴가 2개 이상인 섹션은 톱바의 필 탭 셀렉터로 노출한다.
   활성 섹션은 URL에서 파생한다. */

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
    label: '검색',
    icon: Search,
    home: '/jobs',
    match: ['/jobs', '/job/'],
    items: [{ to: '/jobs', label: '검색 결과' }],
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
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, isAuthed, logout } = useAuth()
  const active = sectionOf(location.pathname)

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
                className={`dshell__railbtn${s.key === active.key ? ' on' : ''}`}
                onClick={() => navigate(s.home)}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="dshell__raillabel">{s.label}</span>
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
                className={`dshell__railbtn${s.key === active.key ? ' on' : ''}`}
                onClick={() => navigate(s.home)}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="dshell__raillabel">{s.label}</span>
              </button>
            )
          })}
          <button
            type="button"
            className="dshell__railbtn"
            onClick={() => navigate('/rag-docs')}
          >
            <BookOpen size={20} strokeWidth={2} />
            <span className="dshell__raillabel">RAG 문서</span>
          </button>
        </div>
      </aside>

      <div className="dshell__main">
        <header className="dshell__topbar">
          <span className="dshell__crumb">{active.label}</span>
          {/* 하위 메뉴가 2개 이상인 섹션은 필 탭 셀렉터로 노출 */}
          {active.items.length > 1 && (
            <nav className="dshell__tabs" aria-label={`${active.label} 탭`}>
              {active.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) => `dshell__tab${isActive ? ' on' : ''}`}
                >
                  {it.label}
                </NavLink>
              ))}
            </nav>
          )}
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
