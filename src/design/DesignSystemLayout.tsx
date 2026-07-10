import { Link, NavLink, Outlet } from 'react-router-dom'
import './design-system.css'

const TABS = [
  { id: 'guide', label: "Do & Don't" },
  { id: 'apple', label: 'Like Apple' },
  { id: 'icons', label: '아이콘 세트' },
  { id: 'kit', label: '위젯 킷 ★' },
  { id: 'toss', label: '기타 디테일 ✨' },
  { id: 'colors', label: '컬러' },
  { id: 'typography', label: '타이포그래피' },
  { id: 'tokens', label: '라운드·스페이싱·엘리베이션' },
  { id: 'motion', label: '애니메이션·모션' },
  { id: 'buttons', label: '버튼' },
  { id: 'inputs', label: '인풋·컨트롤' },
  { id: 'forms', label: '폼 요소' },
  { id: 'chips', label: '칩·배지' },
  { id: 'data', label: '데이터 시각화' },
  { id: 'datadisplay', label: '데이터 표시' },
  { id: 'feedback', label: '피드백·상태' },
  { id: 'nav', label: '내비게이션' },
  { id: 'cards', label: '카드 조합' },
  { id: 'map', label: '지도' },
  { id: 'stats', label: '통계·차트' },
  { id: 'insights', label: '인사이트·AI' },
]

export default function DesignSystemLayout() {
  return (
    <div className="ds ds--tabbed">
      <div className="ds__topbar">
        <div className="ds__topbar-row">
          <div className="ds__brand">
            <span className="dot" /> Career DS
          </div>
          <Link to="/gallery" className="ds__back">← 갤러리로</Link>
        </div>
        <nav className="ds__tabs">
          {TABS.map((t) => (
            <NavLink
              key={t.id}
              to={`/design-system/${t.id}`}
              className={({ isActive }) => `ds__tab${isActive ? ' active' : ''}`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="ds__main ds__main--tabbed">
        <Outlet />
      </main>
    </div>
  )
}
