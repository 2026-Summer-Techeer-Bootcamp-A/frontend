import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, BarChart3, Map, User, MessageSquare, Search } from 'lucide-react'
import { THEME, themeVars } from '../career/themes'
import './DesktopShell.css'

/* 데스크톱 셸 — Phase 1 골격.
   비주얼 디테일(간격/타이포/컬러 뉘앙스)은 팀 논의 + 레퍼런스 후 확정. 지금은 위계와
   내비게이션 배선만 세운다. 토큰(themeVars)을 루트에 주입해 kit/위젯을 나중에 그대로 얹는다. */

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }

// 모바일 4탭(홈/시장/지도/마이)을 계승하되 PC 밀도로 분화: 대시보드 ↔ 맞춤공고를 분리한다.
const NAV: NavItem[] = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/jobs', label: '맞춤 공고', icon: Briefcase },
  { to: '/market', label: '채용 시장', icon: BarChart3 },
  { to: '/map', label: '지도', icon: Map },
  { to: '/resume', label: '마이', icon: User },
]

export default function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <div className="dshell" style={themeVars(THEME)}>
      <aside className="dshell__side">
        {/* 브랜드 워드마크 자리 — 실제 로고 확정 전 플레이스홀더 */}
        <div className="dshell__brand">
          <span className="dshell__brand-dot" />
          커리어
        </div>

        <nav className="dshell__nav" aria-label="주요 메뉴">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `dshell__navitem${isActive ? ' on' : ''}`}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* AI는 서브 — 사이드바 하단에 분리 배치 */}
        <div className="dshell__navfoot">
          <NavLink to="/rag-docs" className="dshell__navitem sub">
            <MessageSquare size={20} strokeWidth={2} />
            <span>AI 채팅</span>
          </NavLink>
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
