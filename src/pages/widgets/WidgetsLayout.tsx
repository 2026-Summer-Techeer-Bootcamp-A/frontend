import { Link, NavLink, Outlet } from 'react-router-dom'
import '../../design/design-system.css'
import './widgets.css'
import { RESUME } from './base'

const TABS = [
  { id: 'a', label: 'A · Hype vs Hire' },
  { id: 'c', label: 'C · 커버리지 분포' },
  { id: 'y1', label: 'Y1 · 학습 로드맵' },
  { id: 'y2', label: 'Y2 · 전직 가능성 지도' },
  { id: 'g', label: 'G · 회사 세대론' },
  { id: 'h', label: 'H · 신입의 문' },
  { id: 'k', label: 'K · 아키타입 배지' },
  { id: 'o', label: 'O · 글로벌 vs 국내' },
  { id: 'n', label: 'N · 스킬 번들' },
  { id: 'p', label: 'P · 채용 시즌' },
  { id: 'l', label: 'L · 15년 연대기' },
  { id: 'r', label: 'R · 산업 지문' },
  { id: 's', label: 'S · 응답 잘 오는 회사' },
  { id: 't', label: 'T · GitHub 활력' },
  { id: 'u', label: 'U · topics 교차' },
  { id: 'y4', label: 'Y4 · 트렌드 전파' },
  { id: 'x', label: 'X · 직군 스택 궁합' },
]

export default function WidgetsLayout() {
  return (
    <div className="ds ds--tabbed">
      <div className="ds__topbar">
        <div className="ds__topbar-row">
          <div className="ds__brand"><span className="dot" /> Data Viz Widgets</div>
          <Link to="/gallery" className="ds__back">← 갤러리로</Link>
          <Link to="/design-system" className="ds__back">디자인 시스템 →</Link>
        </div>
        <nav className="ds__tabs">
          {TABS.map((t) => (
            <NavLink
              key={t.id}
              to={`/widgets/${t.id}`}
              className={({ isActive }) => `ds__tab${isActive ? ' active' : ''}`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="ds__main ds__main--tabbed">
        <div className="ds__hero">
          <span className="ds__eyebrow">Career · Data Visualizations</span>
          <h1>채용시장 시각화 위젯</h1>
          <p>
            채용공고 124,237건과 HN 54개월치를 교차해 <b>엑셀로는 못 만드는</b> 인사이트를 뽑았어요.
            열일곱 위젯 모두 실측 데이터를 박제했고, 색·모션은 커리어 디자인 시스템을 그대로 따라요.
            각 위젯 하단의 <b>기준일·모수 배지</b>가 정직 표기예요.
          </p>
          <div className="wg-heroskills">
            <span className="wg-heroskills__label">이 페이지 전체가 기준으로 쓰는 데모 이력서 스킬셋</span>
            <div className="wg-heroskills__chips">
              {RESUME.map((s) => (
                <span key={s} className="chip chip--held">{s}</span>
              ))}
            </div>
            <span className="wg-heroskills__note">A·C·G·H 위젯의 "보유/갭" 판정이 이 8개 기준이에요.</span>
          </div>
        </div>

        <div className="wg-list">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
