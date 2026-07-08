import { Link } from 'react-router-dom'
import '../../design/design-system.css'
import './widgets.css'
import { RESUME } from './base'
import WidgetA from './WidgetA'
import WidgetC from './WidgetC'
import WidgetG from './WidgetG'
import WidgetH from './WidgetH'
import WidgetK from './WidgetK'
import WidgetO from './WidgetO'
import WidgetN from './WidgetN'
import WidgetP from './WidgetP'
import WidgetL from './WidgetL'
import WidgetR from './WidgetR'
import WidgetS from './WidgetS'
import WidgetT from './WidgetT'
import WidgetU from './WidgetU'
import WidgetX from './WidgetX'
import WidgetY1 from './WidgetY1'
import WidgetY2 from './WidgetY2'
import WidgetY4 from './WidgetY4'

const NAV = [
  { id: '후보A·킬링', label: 'A · Hype vs Hire' },
  { id: '후보C·히어로', label: 'C · 커버리지 분포' },
  { id: '후보Y1', label: 'Y1 · 학습 로드맵' },
  { id: '후보Y2', label: 'Y2 · 전직 가능성 지도' },
  { id: '후보G', label: 'G · 회사 세대론' },
  { id: '후보H', label: 'H · 신입의 문' },
  { id: '후보K·공통레이어', label: 'K · 아키타입 배지' },
  { id: '후보O', label: 'O · 글로벌 vs 국내' },
  { id: '후보N', label: 'N · 스킬 번들' },
  { id: '후보P', label: 'P · 채용 시즌' },
  { id: '후보L', label: 'L · 15년 연대기' },
  { id: '후보R', label: 'R · 산업 지문' },
  { id: '후보S', label: 'S · 응답 잘 오는 회사' },
  { id: '후보T', label: 'T · GitHub 활력' },
  { id: '후보U', label: 'U · topics 교차' },
  { id: '후보Y4', label: 'Y4 · 트렌드 전파' },
  { id: '후보X', label: 'X · 직군 스택 궁합' },
]

export default function WidgetsDemo() {
  return (
    <div className="ds">
      <div className="ds__shell">
        <aside className="ds__side">
          <div className="ds__brand"><span className="dot" /> Data Viz Widgets</div>
          <Link to="/gallery" className="ds__back">← 갤러리로</Link>
          <nav className="ds__nav">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}>{n.label}</a>
            ))}
          </nav>
          <div className="wg-navnote">
            실측 데이터 박제 · ECharts<br />
            <Link to="/design-system" style={{ color: 'var(--accent)' }}>디자인 시스템 →</Link>
          </div>
        </aside>

        <main className="ds__main">
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
            <WidgetA />
            <WidgetC />
            <WidgetY1 />
            <WidgetY2 />
            <WidgetG />
            <WidgetH />
            <WidgetK />
            <WidgetO />
            <WidgetN />
            <WidgetP />
            <WidgetL />
            <WidgetR />
            <WidgetS />
            <WidgetT />
            <WidgetU />
            <WidgetY4 />
            <WidgetX />
          </div>
        </main>
      </div>
    </div>
  )
}
