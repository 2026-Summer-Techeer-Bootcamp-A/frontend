import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import './design-system.css'

/* 디자인 시스템 IA — 4개 큰 탭으로 재편.
   1) Do & Don't  2) 아이콘 세트  3) 컴포넌트(기본/내비게이션/카드/차트와 AI)  4) Apple/Toss 레퍼런스
   라우트 id는 기존 그대로 두고(딥링크 유지), 그룹핑은 이 레이아웃에서만 파생한다. */

type Section = { id: string; label: string }
type Group = { label: string; items: Section[] } // label '' 이면 그룹 헤더 없이 평면
type Tab = { key: string; label: string; groups: Group[] }

const TABS: Tab[] = [
  { key: 'guide', label: "Do & Don't", groups: [{ label: '', items: [{ id: 'guide', label: "Do & Don't" }] }] },
  { key: 'icons', label: '아이콘 세트', groups: [{ label: '', items: [{ id: 'icons', label: '아이콘 세트' }] }] },
  {
    key: 'components',
    label: '컴포넌트',
    groups: [
      {
        label: '기본',
        items: [
          { id: 'colors', label: '컬러' },
          { id: 'typography', label: '타이포그래피' },
          { id: 'tokens', label: '라운드·스페이싱·엘리베이션' },
          { id: 'motion', label: '애니메이션·모션' },
          { id: 'buttons', label: '버튼' },
          { id: 'inputs', label: '인풋·컨트롤' },
          { id: 'forms', label: '폼 요소' },
          { id: 'chips', label: '칩·배지' },
          { id: 'feedback', label: '피드백·상태' },
          { id: 'datadisplay', label: '데이터 표시' },
        ],
      },
      { label: '내비게이션', items: [{ id: 'nav', label: '내비게이션' }] },
      {
        label: '카드',
        items: [
          { id: 'cards', label: '카드 조합' },
          { id: 'kit', label: '위젯 킷 ★' },
        ],
      },
      {
        label: '차트와 AI',
        items: [
          { id: 'data', label: '데이터 시각화' },
          { id: 'stats', label: '통계·차트' },
          { id: 'map', label: '지도' },
          { id: 'insights', label: '인사이트·AI' },
        ],
      },
    ],
  },
  {
    key: 'reference',
    label: 'Apple / Toss 레퍼런스',
    groups: [
      {
        label: '',
        items: [
          { id: 'apple', label: 'Like Apple' },
          { id: 'apple-motion', label: '애니메이션·모션 ✨' },
          { id: 'toss', label: '기타 디테일 ✨' },
        ],
      },
    ],
  },
]

const sectionsOf = (t: Tab) => t.groups.flatMap((g) => g.items)
const firstIdOf = (t: Tab) => sectionsOf(t)[0].id
const hasSidebar = (t: Tab) => sectionsOf(t).length > 1

export default function DesignSystemLayout() {
  const { pathname } = useLocation()
  const currentId = pathname.split('/').filter(Boolean).pop() ?? ''
  const activeTab = TABS.find((t) => sectionsOf(t).some((s) => s.id === currentId)) ?? TABS[0]

  return (
    <div className="ds ds--tabbed">
      <div className="ds__topbar">
        <div className="ds__topbar-row">
          <div className="ds__brand">
            <span className="dot" /> Career DS
          </div>
          <Link to="/gallery" className="ds__back">← 갤러리로</Link>
        </div>
        {/* 상단 = 4개 큰 탭 */}
        <nav className="ds__tabs" aria-label="디자인 시스템 섹션">
          {TABS.map((t) => (
            <Link
              key={t.key}
              to={`/design-system/${firstIdOf(t)}`}
              className={`ds__tab${activeTab.key === t.key ? ' active' : ''}`}
              aria-current={activeTab.key === t.key ? 'page' : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {hasSidebar(activeTab) ? (
        <div className="ds__body2">
          <aside className="ds__side2" aria-label={`${activeTab.label} 목차`}>
            {activeTab.groups.map((g, i) => (
              <div className="ds__navgroup" key={g.label || i}>
                {g.label && <div className="ds__navgroup-label">{g.label}</div>}
                <div className="ds__nav">
                  {g.items.map((s) => (
                    <NavLink
                      key={s.id}
                      to={`/design-system/${s.id}`}
                      className={({ isActive }) => `ds__navlink${isActive ? ' on' : ''}`}
                    >
                      {s.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </aside>
          <main className="ds__main2">
            <Outlet />
          </main>
        </div>
      ) : (
        <main className="ds__main ds__main--tabbed">
          <Outlet />
        </main>
      )}
    </div>
  )
}
