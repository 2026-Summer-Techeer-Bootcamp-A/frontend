import {
  Loader, Home, ClipboardList, Package, UserPlus, BarChart3,
  Mail, Globe, Share2, Settings, MessageSquare, HelpCircle,
  Search, Plus, Bell, ChevronDown, Calendar, ListFilter,
  User, CircleDollarSign, Wallet, TrendingUp, Activity, Info,
} from 'lucide-react'
import './refMysales.css'

/* ---------- 스무스 라인 (cardinal spline → path) ---------- */
function smooth(points: [number, number][], t = 0.2) {
  if (points.length < 2) return ''
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) * t
    const c1y = p1[1] + (p2[1] - p0[1]) * t
    const c2x = p2[0] - (p3[0] - p1[0]) * t
    const c2y = p2[1] - (p3[1] - p1[1]) * t
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`
  }
  return d
}

/* ---------- 차트 좌표 ---------- */
const PLOT_TOP = 20
const PLOT_BOTTOM = 258
const MAXV = 52
const MINV = 15
const XS = [56, 145, 234, 323, 412, 501, 590, 679]
const yFor = (v: number) => PLOT_TOP + ((MAXV - v) / (MAXV - MINV)) * (PLOT_BOTTOM - PLOT_TOP)
const VALS = [22, 30, 33, 31, 27, 31, 42, 46]
const linePts = VALS.map((v, i) => [XS[i], yFor(v)] as [number, number])
const MARKER_I = 4
const areaPath =
  smooth(linePts) +
  ` L ${XS[XS.length - 1]} ${PLOT_BOTTOM} L ${XS[0]} ${PLOT_BOTTOM} Z`

/* ---------- 데이터 타입 ---------- */
type NavItem = { icon: typeof Home; active?: boolean; dot?: boolean }
type Stat = {
  label: string
  value: string
  delta: string
  pct: string
  icon: typeof User
  tint: string
  soft: string
}
type Country = { name: string; flag: string; count: string; pct: number }

/* ---------- 네비 ---------- */
const navTop: NavItem[] = [
  { icon: Home, active: true },
  { icon: ClipboardList, dot: true },
  { icon: Package },
  { icon: UserPlus, dot: true },
  { icon: BarChart3 },
]
const navMid: NavItem[] = [
  { icon: Mail },
  { icon: Globe },
  { icon: Share2 },
]
const navBottom: NavItem[] = [
  { icon: Settings },
  { icon: MessageSquare },
  { icon: HelpCircle },
]

const stats: Stat[] = [
  { label: 'Active Sales', value: '$40,450', delta: '+$4,000', pct: '+16.5%', icon: User, tint: '#5b3ad9', soft: '#ece7fb' },
  { label: 'Product Revenue', value: '$12,980', delta: '+$3,911', pct: '+12%', icon: Package, tint: '#5b3ad9', soft: '#ece7fb' },
  { label: 'Product Sale', value: '$23,867', delta: '+$1.166', pct: '+8%', icon: CircleDollarSign, tint: '#5b3ad9', soft: '#ece7fb' },
  { label: 'Total Transaction', value: '$30,567', delta: '+$2,888', pct: '+10%', icon: Wallet, tint: '#5b3ad9', soft: '#ece7fb' },
]

const countries: Country[] = [
  { name: 'United States', flag: '🇺🇸', count: '20,568', pct: 87 },
  { name: 'Australia', flag: '🇦🇺', count: '17,412', pct: 78 },
  { name: 'Indonesia', flag: '🇮🇩', count: '10,680', pct: 59 },
  { name: 'Germany', flag: '🇩🇪', count: '8,904', pct: 46 },
]

export default function RefMysales() {
  return (
    <div className="mysales-stage">
      <div className="ms">
        {/* ---------- 사이드 레일 ---------- */}
        <aside className="ms-rail">
          <div className="ms-rail__logo"><Loader size={22} /></div>
          <nav className="ms-rail__group">
            {navTop.map((n, i) => (
              <button key={`t${i}`} className={`ms-navico${n.active ? ' is-active' : ''}`}>
                <n.icon size={20} />
                {n.dot && <span className="ms-navico__dot" />}
              </button>
            ))}
          </nav>
          <div className="ms-rail__div" />
          <nav className="ms-rail__group">
            {navMid.map((n, i) => (
              <button key={`m${i}`} className="ms-navico"><n.icon size={20} /></button>
            ))}
          </nav>
          <div className="ms-rail__spacer" />
          <nav className="ms-rail__group">
            {navBottom.map((n, i) => (
              <button key={`b${i}`} className="ms-navico"><n.icon size={20} /></button>
            ))}
          </nav>
        </aside>

        {/* ---------- 본문 ---------- */}
        <div className="ms-body">
          {/* 탑바 */}
          <header className="ms-top">
            <div className="ms-search">
              <Search size={18} />
              <input placeholder="Search anything" readOnly />
            </div>
            <button className="ms-addbtn"><Plus size={18} /> Add Customers</button>
            <div className="ms-top__icons">
              <button className="ms-iconbtn"><MessageSquare size={19} /><span className="ms-iconbtn__dot" /></button>
              <button className="ms-iconbtn"><Bell size={19} /><span className="ms-iconbtn__dot" /></button>
            </div>
            <div className="ms-user">
              <img className="ms-user__avatar" alt="user" src="https://i.pravatar.cc/80?img=47" />
              <div className="ms-user__meta">
                <div className="ms-user__name">Darlene Robertson</div>
                <div className="ms-user__mail">felicia.reid@example.com</div>
              </div>
              <ChevronDown size={18} className="ms-user__chev" />
            </div>
          </header>

          <div className="ms-scroll">
            {/* 헤더 */}
            <div className="ms-hero">
              <div>
                <h1 className="ms-hero__title">Welcome Back, Darlene! <span>👋</span></h1>
                <p className="ms-hero__sub">
                  Here&apos;s a summary of your CRM dashboard for today. Stay connected and let AI
                  manage your customer relationships for you!
                </p>
              </div>
              <div className="ms-hero__actions">
                <button className="ms-pillbtn"><Calendar size={17} /> Tue, 20 May 2025 <ChevronDown size={16} /></button>
                <button className="ms-pillbtn"><ListFilter size={17} /> Filter <ChevronDown size={16} /></button>
              </div>
            </div>

            {/* KPI 카드 */}
            <div className="ms-stats">
              {stats.map((s) => (
                <div key={s.label} className="ms-card ms-stat">
                  <div className="ms-stat__head">
                    <span className="ms-stat__ico" style={{ background: s.soft, color: s.tint }}>
                      <s.icon size={18} />
                    </span>
                    <span className="ms-stat__label">{s.label}</span>
                    <span className="ms-stat__trend"><TrendingUp size={16} /> {s.pct}</span>
                  </div>
                  <div className="ms-stat__valrow">
                    <span className="ms-stat__value">{s.value}</span>
                    <span className="ms-stat__delta">{s.delta}</span>
                  </div>
                  <div className="ms-stat__foot">Since last week</div>
                </div>
              ))}
            </div>

            {/* 하단 2열 */}
            <div className="ms-grid">
              {/* Analytic */}
              <div className="ms-card ms-analytic">
                <div className="ms-panel__head">
                  <div className="ms-panel__titlewrap">
                    <span className="ms-panel__ico"><Activity size={18} /></span>
                    <span className="ms-panel__title">Analystic</span>
                    <Info size={15} className="ms-panel__info" />
                  </div>
                  <div className="ms-panel__actions">
                    <button className="ms-chip"><ListFilter size={15} /> Filter <ChevronDown size={14} /></button>
                    <button className="ms-chip"><Calendar size={15} /> Last Week <ChevronDown size={14} /></button>
                  </div>
                </div>

                <div className="ms-chart">
                  <svg viewBox="0 0 720 290" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="msArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6b46e5" stopOpacity="0.42" />
                        <stop offset="55%" stopColor="#8a6cf0" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#8a6cf0" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* 그리드 + y라벨 */}
                    {[50, 40, 30, 20].map((g) => (
                      <g key={g}>
                        <line x1="52" y1={yFor(g)} x2="708" y2={yFor(g)} stroke="#e9e7f2" strokeWidth="1.5" strokeDasharray="6 7" />
                        <text x="44" y={yFor(g) + 4} textAnchor="end" fontSize="12.5" fill="#a7a3b8">${g}k</text>
                      </g>
                    ))}
                    {/* 영역 + 라인 */}
                    <path d={areaPath} fill="url(#msArea)" />
                    <path d={smooth(linePts)} fill="none" stroke="#5b3ad9" strokeWidth="3.5" strokeLinecap="round" />
                    {/* 마커 */}
                    <line x1={XS[MARKER_I]} y1={yFor(VALS[MARKER_I])} x2={XS[MARKER_I]} y2={PLOT_BOTTOM}
                      stroke="#5b3ad9" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
                    <circle cx={XS[MARKER_I]} cy={yFor(VALS[MARKER_I])} r="7" fill="#5b3ad9" stroke="#fff" strokeWidth="3.5" />
                  </svg>
                  <div className="ms-tip" style={{ left: `${(XS[MARKER_I] / 720) * 100}%`, top: `${(yFor(VALS[MARKER_I]) / 290) * 100}%` }}>
                    <div className="ms-tip__title">May 2025</div>
                    <div className="ms-tip__row">
                      <span className="ms-tip__val">$27.108</span>
                      <span className="ms-tip__pct"><TrendingUp size={13} /> +6%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customers Active */}
              <div className="ms-card ms-active">
                <div className="ms-active__title">Customers Active</div>
                <div className="ms-active__bignum">
                  34, 654 <span>Accounts</span>
                </div>
                <div className="ms-active__compare">
                  Compare from last week is <b>12,590</b> accounts
                </div>
                <div className="ms-active__list">
                  {countries.map((c) => (
                    <div key={c.name} className="ms-country">
                      <span className="ms-country__flag">{c.flag}</span>
                      <div className="ms-country__body">
                        <div className="ms-country__row">
                          <span className="ms-country__name">{c.name}</span>
                          <span className="ms-country__count">{c.count} <b>({c.pct}%)</b></span>
                        </div>
                        <div className="ms-country__bar"><i style={{ width: `${c.pct}%` }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
