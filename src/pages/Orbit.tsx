import {
  ChevronLeft, Share2, Upload, Star, Plus, Smartphone, Database, Calendar,
  Send, AlertTriangle, Moon, Sun, Search, Bell, ChevronDown, ArrowUpRight,
} from 'lucide-react'
import './orbit.css'

/* 막대차트 높이 (벨 커브 + 우측 작은 봉우리) */
function gauss(x: number, mu: number, sigma: number) {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma))
}
const BAR_N = 44
const rawBars = Array.from({ length: BAR_N }, (_, i) =>
  gauss(i, 15, 5.2) + gauss(i, 30, 6) * 0.34 + 0.04,
)
const maxBar = Math.max(...rawBars)
const bars = rawBars.map((v) => (v / maxBar) * 100)

const railIcons = [
  { icon: ChevronLeft }, { icon: Share2 }, { icon: Upload }, { icon: Star },
  { icon: Plus, active: true }, { icon: Smartphone }, { icon: Database },
  { icon: Calendar }, { icon: Send }, { icon: AlertTriangle },
]

const nav = ['Dashboard', 'Relationship', 'Opportunities', 'Leads', 'Calendar', 'Reposts', 'Quotes']

const teamAvatars = [
  { g: 'linear-gradient(135deg,#6d7f95,#455568)', badge: '2', bc: '#7f9fd6' },
  { g: 'linear-gradient(135deg,#c9a58c,#9a745a)', badge: '3', bc: '#7f9fd6' },
  { g: 'linear-gradient(135deg,#8a7461,#5c4a3b)', badge: '2', bc: '#f27c7c' },
  { g: 'linear-gradient(135deg,#b98a7a,#8a5c4b)', badge: '1', bc: '#f27c7c' },
  { g: 'linear-gradient(135deg,#6d8a95,#455f68)', badge: '1', bc: '#f27c7c' },
  { g: 'linear-gradient(135deg,#7a6d95,#4b4568)', badge: '+', bc: '#17181c' },
  { g: 'linear-gradient(135deg,#95867a,#68584b)', badge: '1', bc: '#7f9fd6' },
  { g: 'linear-gradient(135deg,#8a95a0,#5b6773)', badge: '1', bc: '#7f9fd6' },
]

const maleGrid = [
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1],
]
const femaleGrid = [
  [0, 0, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0],
]

const tableRows = [
  { name: 'Kathryn Murphy', role: 'UX Researcher', active: true, date: '26 Apr, 2026', g: 'linear-gradient(135deg,#c9a58c,#9a745a)' },
  { name: 'Ralph Edwards', role: 'UI Mentor', active: false, date: '27 Apr, 2026', g: 'linear-gradient(135deg,#b98a7a,#8a5c4b)' },
  { name: 'Marvin McKinney', role: 'Marketer', active: true, date: '28 Apr, 2026', g: 'linear-gradient(135deg,#6d8a95,#455f68)' },
  { name: 'Cindy Marline', role: 'Designer', active: false, date: '29 Apr, 2026', g: 'linear-gradient(135deg,#95867a,#68584b)' },
]

function Gauge() {
  return (
    <div className="ob-gauge">
      <svg viewBox="0 0 300 168" width="100%" style={{ maxWidth: 300 }}>
        <defs>
          <linearGradient id="obGauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f6b9b9" />
            <stop offset="0.5" stopColor="#f38f8f" />
            <stop offset="1" stopColor="#ee6a6a" />
          </linearGradient>
        </defs>
        <path d="M22 158 A128 128 0 0 1 278 158" fill="none" stroke="url(#obGauge)" strokeWidth="30" strokeLinecap="round" />
        <path d="M22 158 A128 128 0 0 1 278 158" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="30" strokeLinecap="butt" strokeDasharray="1.6 4" />
      </svg>
      <div className="ob-gauge__num">
        <b>86%</b>
        <span>of 100 point</span>
      </div>
    </div>
  )
}

/* segments: 0% = 12시, 시계방향. start = 조각 시작 위치(%) */
function Donut({ segments }: { segments: { color: string; len: number; start: number }[] }) {
  const r = 74
  return (
    <svg viewBox="0 0 210 210" width="210" height="210" style={{ position: 'absolute', inset: 0 }}>
      <g transform="rotate(-90 105 105)">
        {segments.map((s, i) => (
          <circle key={i} cx="105" cy="105" r={r} fill="none" stroke={s.color} strokeWidth="30"
            strokeLinecap="round" pathLength={100}
            strokeDasharray={`${s.len - 2.5} ${100 - s.len + 2.5}`} strokeDashoffset={-s.start} />
        ))}
      </g>
    </svg>
  )
}

export default function Orbit() {
  return (
    <div className="orbit-stage">
      <div className="orbit-device">
        <div className="orbit-ui">
          {/* 헤더 */}
          <header className="ob-header">
            <span className="ob-logo">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2 L20 7 L12 12 L4 7 Z" />
                <path d="M4 12 L12 17 L20 12 L20 15 L12 20 L4 15 Z" opacity="0.55" />
              </svg>
              ORBIT
            </span>
            <nav className="ob-nav">
              {nav.map((n) => (
                <a key={n} className={n === 'Dashboard' ? 'active' : ''}>{n}</a>
              ))}
            </nav>
            <div className="ob-header__right">
              <span className="ob-iconbtn"><Search size={20} /></span>
              <span className="ob-iconbtn"><Bell size={20} /><span className="dot" /></span>
              <span className="ob-avatar" />
            </div>
          </header>

          <div className="ob-body">
            {/* 좌측 레일 */}
            <aside className="ob-rail">
              {railIcons.map(({ icon: Icon, active }, i) => (
                <span key={i} className={`ob-rail__btn${active ? ' ob-rail__btn--active' : ''}`}>
                  <Icon size={19} />
                </span>
              ))}
              <span className="ob-rail__sp" />
              <span className="ob-rail__btn"><Moon size={19} /></span>
              <span className="ob-rail__btn ob-rail__btn--active"><Sun size={19} /></span>
            </aside>

            {/* 메인 */}
            <main className="ob-main">
              <h1 className="ob-title">Discuss New Opportunity</h1>

              {/* Performance Overview */}
              <div className="ob-perf">
                <div className="ob-perf__title">
                  <b>Performance Overview</b>
                  <p>Track key metrics, performance trends &amp; business insights</p>
                </div>
                <div className="ob-avatars">
                  {teamAvatars.map((a, i) => (
                    <span key={i} className="ob-av">
                      <span className="ob-av__img" style={{ background: a.g }} />
                      <span className="ob-av__badge" style={{ background: a.bc }}>{a.badge}</span>
                    </span>
                  ))}
                </div>
                <div className="ob-perf__actions">
                  <span className="ob-iconbtn"><Plus size={19} /></span>
                  <span className="ob-iconbtn"><Upload size={19} /></span>
                  <span className="ob-iconbtn"><Calendar size={19} /></span>
                </div>
              </div>

              {/* 상단 3카드 */}
              <div className="ob-grid-top">
                {/* Statistic */}
                <div className="ob-card">
                  <div className="ob-card__head">
                    <h3>Statistic</h3>
                    <span className="ob-drop">Monthly <ChevronDown size={16} /></span>
                  </div>
                  <div className="ob-chart">
                    <div className="ob-chart__grid">
                      {Array.from({ length: 5 }).map((_, i) => <span key={i} />)}
                    </div>
                    <div className="ob-bars">
                      {bars.map((h, i) => (
                        <span key={i} className="ob-bar" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    {/* $120K 마커 (파랑, 피크) */}
                    <div className="ob-marker" style={{ left: '35%', top: '10px', height: '48px' }}>
                      <span className="ob-marker__label">$120K</span>
                      <span className="ob-marker__line" style={{ background: '#7f9fd6' }} />
                      <span className="ob-marker__dot" style={{ background: '#7f9fd6' }} />
                    </div>
                    {/* $100K 마커 (코랄) */}
                    <div className="ob-marker" style={{ left: '68%', top: '30px', height: '150px' }}>
                      <span className="ob-marker__label">$100K</span>
                      <span className="ob-marker__line" style={{ background: '#f27c7c' }} />
                      <span className="ob-marker__dot" style={{ background: '#f27c7c' }} />
                    </div>
                  </div>
                </div>

                {/* Sales 게이지 */}
                <div className="ob-card">
                  <div className="ob-card__head">
                    <h3>Sales Performance</h3>
                    <span className="ob-arrow"><ArrowUpRight size={18} /></span>
                  </div>
                  <Gauge />
                  <div className="ob-gauge__foot">
                    <b>Your team is exceptional.</b>
                    <p>Delivers consistent results through collaboration, expertise, and innovation</p>
                  </div>
                </div>

                {/* Sales 와플 */}
                <div className="ob-card">
                  <div className="ob-card__head">
                    <h3>Sales Performance</h3>
                    <span className="ob-arrow"><ArrowUpRight size={18} /></span>
                  </div>
                  <div className="ob-waffle-top">
                    <b>76%</b>
                    <span className="ob-chip">+12%</span>
                  </div>
                  <div className="ob-waffle-sub">returning users</div>
                  <div className="ob-waffles">
                    <div className="ob-waffle">
                      <div className="ob-waffle__grid">
                        {maleGrid.flat().map((v, i) => (
                          <span key={i} className="ob-waffle__cell" style={{ background: v ? '#7f9fd6' : '#dfe6f4' }} />
                        ))}
                      </div>
                      <div className="ob-waffle__legend"><b>Male</b><span>65%</span></div>
                    </div>
                    <div className="ob-waffle">
                      <div className="ob-waffle__grid">
                        {femaleGrid.flat().map((v, i) => (
                          <span key={i} className="ob-waffle__cell" style={{ background: v ? '#f4a0a0' : '#fbdada' }} />
                        ))}
                      </div>
                      <div className="ob-waffle__legend"><b>Female</b><span>35%</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단 2카드 */}
              <div className="ob-grid-bottom">
                {/* 도넛 */}
                <div className="ob-card ob-card--soft">
                  <div className="ob-card__head">
                    <h3>Employment Status</h3>
                    <span className="ob-arrow"><ArrowUpRight size={18} /></span>
                  </div>
                  <div className="ob-donuts">
                    <div className="ob-donut">
                      <Donut segments={[
                        { color: '#7f9fd6', len: 85, start: 58 },
                        { color: '#f27c7c', len: 13, start: 44 },
                      ]} />
                      <div className="ob-donut__center"><b>100</b><span>Permanent</span></div>
                      <span className="ob-bubble" style={{ top: '20px', left: '14px' }}>87%</span>
                      <span className="ob-donut__seglbl" style={{ top: '40px', left: '50%', transform: 'translateX(-50%)', color: '#3a3c43' }}>Active</span>
                      <span className="ob-donut__seglbl" style={{ bottom: '40px', left: '50%', transform: 'translateX(-50%)', color: '#fff' }}>Inactive</span>
                      <span className="ob-bubble" style={{ bottom: '4px', left: '50%', transform: 'translateX(-50%)' }}>13%</span>
                    </div>
                    <div className="ob-donut">
                      <Donut segments={[
                        { color: '#f27c7c', len: 76, start: 77 },
                        { color: '#7f9fd6', len: 24, start: 51 },
                      ]} />
                      <div className="ob-donut__center"><b>100</b><span>Contract</span></div>
                      <span className="ob-bubble" style={{ top: '20px', left: '50%', transform: 'translateX(-50%)' }}>76%</span>
                      <span className="ob-donut__seglbl" style={{ top: '40px', left: '50%', transform: 'translateX(-50%)', color: '#fff' }}>Inactive</span>
                      <span className="ob-bubble" style={{ bottom: '52px', left: '4px' }}>24%</span>
                      <span className="ob-donut__seglbl" style={{ bottom: '38px', left: '50%', transform: 'translateX(-50%)', color: '#3a3c43' }}>Active</span>
                    </div>
                  </div>
                </div>

                {/* 테이블 */}
                <div className="ob-card">
                  <div className="ob-card__head">
                    <h3>Employment Status</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="ob-search"><Search size={17} /> Search...</span>
                      <span className="ob-arrow"><ArrowUpRight size={18} /></span>
                    </div>
                  </div>
                  <table className="ob-table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Role</th><th>Status</th><th>Date</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r) => (
                        <tr key={r.name}>
                          <td>
                            <span className="ob-td-name">
                              <span className="av" style={{ background: r.g }} /> {r.name}
                            </span>
                          </td>
                          <td style={{ color: '#5a5d66' }}>{r.role}</td>
                          <td>
                            <span className="ob-status">
                              <span className="d" style={{ background: r.active ? '#7f9fd6' : '#f27c7c' }} />
                              {r.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ color: '#5a5d66' }}>{r.date}</td>
                          <td><span className="ob-more">•••</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
