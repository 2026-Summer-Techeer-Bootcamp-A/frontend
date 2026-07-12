import {
  Bot, LayoutDashboard, Code2, Waypoints, Server, Activity,
  Settings, Bell, RefreshCw, SlidersHorizontal, Plus, X,
  Play, Link2, CircleCheck, Terminal, Settings2, RotateCw,
  Trash2, ChevronDown, Sparkles, FileText, BrainCircuit, CreditCard, BookOpen,
} from 'lucide-react'
import './refBotrix.css'

/* ---------- 스파크라인 (막대) ---------- */
function gauss(x: number, mu: number, sigma: number) {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma))
}
function Spark({ color, seed }: { color: string; seed: number }) {
  const n = 34
  const bars = Array.from({ length: n }, (_, i) => {
    const base = gauss(i, 12 + (seed % 6), 7) * 0.7 + gauss(i, 24, 5) * 0.5
    const jitter = (Math.sin(i * (1.7 + seed * 0.3)) + 1) / 2
    return 12 + (base * 0.7 + jitter * 0.3) * 88
  })
  return (
    <div className="bx-spark">
      {bars.map((h, i) => (
        <i key={i} style={{ height: `${h}%`, background: color, opacity: 0.35 + (h / 100) * 0.65 }} />
      ))}
    </div>
  )
}

/* ---------- 스무스 라인 (cardinal spline → path) ---------- */
function smooth(points: [number, number][], t = 0.18) {
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

const XS = [70, 188, 306, 424, 542, 660]
const yFor = (v: number) => 214 - ((v - 40) / 120) * 190
const mk = (vals: number[]) => vals.map((v, i) => [XS[i], yFor(v)] as [number, number])

const lineIndigo = mk([58, 51, 68, 118, 150, 150])
const lineOrange = mk([49, 55, 82, 100, 106, 98])
const lineGreen = mk([60, 90, 78, 54, 63, 46])

/* ---------- 반원 게이지 (270도) ---------- */
function Gauge({ frac, val, label, color }: { frac: number; val: string; label: string; color: string }) {
  const r = 32
  const C = 2 * Math.PI * r
  const arc = 0.75 // 270도
  const track = `${arc * C} ${C}`
  const prog = `${arc * frac * C} ${C}`
  return (
    <div className="bx-gauge">
      <svg width="82" height="82" viewBox="0 0 82 82">
        <g transform="rotate(135 41 41)">
          <circle cx="41" cy="41" r={r} fill="none" stroke="#eeecf7" strokeWidth="8"
            strokeDasharray={track} strokeLinecap="round" />
          <circle cx="41" cy="41" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={prog} strokeLinecap="round" />
        </g>
        <text x="41" y="45" textAnchor="middle" fontSize="15" fontWeight="800" fill="#23202e">{val}</text>
      </svg>
      <div className="bx-gauge__lb">{label}</div>
    </div>
  )
}

/* ---------- 데이터 ---------- */
const nav = [
  { label: 'DASHBOARD', icon: LayoutDashboard, active: true },
  { label: 'AGENT', icon: Code2 },
  { label: 'APIS', icon: Waypoints },
  { label: 'SERVERS', icon: Server },
  { label: 'ACTIVITY', icon: Activity },
]

const stats = [
  { num: '12', label: 'Automations Running', icon: Play, color: 'var(--purple)', soft: 'var(--purple-soft)', spark: '#7c3aed', numColor: 'var(--ink)', seed: 1 },
  { num: '08', label: 'Apps Connected', icon: Link2, color: 'var(--blue)', soft: 'var(--blue-soft)', spark: '#2b8fe0', numColor: 'var(--ink)', seed: 3 },
  { num: '02', label: 'Active Servers', icon: Server, color: 'var(--green)', soft: 'var(--green-soft)', spark: '#16a34a', numColor: 'var(--green)', seed: 2 },
  { num: '98%', label: 'Success Rate', icon: CircleCheck, color: 'var(--orange)', soft: 'var(--orange-soft)', spark: '#f97316', numColor: 'var(--orange)', seed: 4 },
]

const feed = [
  { name: 'Lead Qualification Agent', meta: '5 steps · OpenAI + HubSpot', time: '08:42 PM', icon: BrainCircuit, bg: '#16a34a', status: 'Success', kind: 'ok' as const },
  { name: 'Weekly Report Generator', meta: '3 steps · Notion + Slack', time: '08:31 PM', icon: FileText, bg: '#4f46e5', status: 'Paused', kind: 'paused' as const },
]

const tools = [
  { name: 'OpenAI', desc: 'Language models & AI assistants', icon: Sparkles, bg: '#0f9d76', on: true },
  { name: 'Stripe', desc: 'Payments, billing & subscriptions', icon: CreditCard, bg: '#635bff', on: true },
  { name: 'Notion', desc: 'Docs, databases, workspace sync', icon: BookOpen, bg: '#23202e', on: false },
]

const servers = [
  {
    name: 'App Server - Singapore', flag: '🇸🇬', spec: 'Ubuntu 24.04 · 4 GB · 2 vCPU',
    state: 'Running', kind: 'run' as const,
    gauges: [{ frac: 0.42, val: '42%', label: 'CPU', color: '#7c5cff' }, { frac: 0.68, val: '68%', label: 'RAM', color: '#f59e0b' }, { frac: 0.5, val: '124 GB', label: 'Bandwidth', color: '#3b82f6' }],
    acts: [{ label: 'Restart', icon: RotateCw }, { label: 'SSH', icon: Terminal }, { label: 'Scale', icon: Settings2 }],
  },
  {
    name: 'Backup Node - New York', flag: '🇺🇸', spec: 'Ubuntu 22.04 · 2 GB · 1 vCPU',
    state: 'Stopped', kind: 'stop' as const,
    acts: [{ label: 'Start', icon: Play }, { label: 'Configure', icon: Settings2 }, { label: 'Delete', icon: Trash2, danger: true }],
  },
  {
    name: 'App Server - Singapore', flag: '🇸🇬', spec: 'Ubuntu 24.04 · 4 GB · 2 vCPU',
    state: 'Running', kind: 'run' as const,
    gauges: [{ frac: 0.42, val: '42%', label: 'CPU', color: '#7c5cff' }, { frac: 0.68, val: '68%', label: 'RAM', color: '#f59e0b' }, { frac: 0.5, val: '124 GB', label: 'Bandwidth', color: '#3b82f6' }],
  },
]

export default function RefBotrix() {
  return (
    <div className="botrix-stage">
      <div className="botrix">
        {/* 탑바 */}
        <div className="bx-top">
          <div className="bx-brand">
            <div className="bx-logo"><Bot size={22} /></div>
            Botrix
          </div>
          <div className="bx-nav">
            {nav.map((n) => (
              <div key={n.label} className={`bx-navitem${n.active ? ' is-active' : ''}`}>
                <n.icon size={16} /> {n.label}
              </div>
            ))}
          </div>
          <div className="bx-topicons">
            <div className="bx-iconbtn"><Settings size={19} /></div>
            <div className="bx-iconbtn"><Bell size={19} /><span className="bx-badge">3</span></div>
            <img className="bx-avatar" alt="user"
              src="https://i.pravatar.cc/80?img=13" />
          </div>
        </div>

        {/* 헤더 */}
        <div className="bx-header">
          <div>
            <h1 className="bx-h1">AI Command Center</h1>
            <div className="bx-sub">Real-time overview of your AI infrastructure</div>
          </div>
          <div className="bx-actions">
            <button className="bx-btn"><RefreshCw size={15} /> Refresh</button>
            <button className="bx-btn"><SlidersHorizontal size={15} /> Filter</button>
            <button className="bx-btn bx-btn--primary"><Plus size={16} /> Create Agent</button>
          </div>
        </div>

        {/* 스탯 카드 */}
        <div className="bx-stats">
          {stats.map((s) => (
            <div key={s.label} className="bx-card bx-stat">
              <div className="bx-stat__top">
                <div className="bx-stat__num" style={{ color: s.numColor }}>{s.num}</div>
                <div className="bx-stat__ico" style={{ background: s.soft, color: s.color }}>
                  <s.icon size={19} />
                </div>
              </div>
              <div className="bx-stat__label">{s.label}</div>
              <Spark color={s.spark} seed={s.seed} />
            </div>
          ))}
        </div>

        {/* 메인 */}
        <div className="bx-main">
          {/* 좌측 */}
          <div className="bx-col">
            {/* Agent Activity */}
            <div className="bx-card bx-panel">
              <div className="bx-panel__head">
                <div className="bx-panel__title">Agent Activity</div>
                <div className="bx-seg bx-seg--soft">
                  <span className="is-active">Daily</span>
                  <span>Weekly</span>
                  <span>Monthly</span>
                </div>
              </div>
              <div className="bx-chart">
                <svg viewBox="0 0 700 260">
                  {[40, 80, 120, 160].map((v) => (
                    <g key={v}>
                      <line x1="60" y1={yFor(v)} x2="690" y2={yFor(v)} stroke="#f0eff6" strokeWidth="1" />
                      <text x="42" y={yFor(v) + 4} textAnchor="end" fontSize="12" fill="#b3b0c2">{v}</text>
                    </g>
                  ))}
                  {['04:00', '08:00', '12:00', '16:00', '20:00', '23:59'].map((t, i) => (
                    <text key={t} x={XS[i]} y="250" textAnchor="middle" fontSize="12" fill="#b3b0c2">{t}</text>
                  ))}
                  {/* dashed marker */}
                  <line x1="490" y1="20" x2="490" y2="214" stroke="#cfcadf" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d={smooth(lineGreen)} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                  <path d={smooth(lineOrange)} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                  <path d={smooth(lineIndigo)} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="490" cy={yFor(139)} r="5" fill="#4f46e5" stroke="#fff" strokeWidth="2.5" />
                </svg>
                <div className="bx-tip">
                  <X className="bx-tip__x" size={13} />
                  <div className="bx-tip__big">+28.4%</div>
                  <div className="bx-tip__lb">Agent Executions</div>
                  <div className="bx-tip__sm">(vs yesterday 16:00)</div>
                </div>
              </div>
            </div>

            {/* 하단 2열 */}
            <div className="bx-duo">
              {/* Live Activity Feed */}
              <div className="bx-card bx-panel">
                <div className="bx-panel__head">
                  <div className="bx-panel__title">Live Activity Feed</div>
                </div>
                <div className="bx-seg" style={{ marginBottom: 6 }}>
                  <span className="is-active">All</span>
                  <span>Success</span>
                  <span>Failed</span>
                  <span>Paused</span>
                </div>
                {feed.map((f) => (
                  <div key={f.name} className="bx-feed__item">
                    <div className="bx-appico" style={{ background: f.bg }}><f.icon size={19} /></div>
                    <div className="bx-feed__mid">
                      <div className="bx-feed__name">{f.name}</div>
                      <div className="bx-feed__meta">{f.meta}</div>
                      <div className="bx-feed__time">{f.time}</div>
                    </div>
                    <div className="bx-feed__right">
                      <span className={`bx-pill bx-pill--${f.kind}`}><i />{f.status}</span>
                      <ChevronDown size={15} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected tools */}
              <div className="bx-card bx-panel">
                <div className="bx-panel__head">
                  <div className="bx-panel__title">Connected tools and services</div>
                </div>
                {tools.map((t) => (
                  <div key={t.name} className="bx-tool">
                    <div className="bx-appico" style={{ background: t.bg }}><t.icon size={19} /></div>
                    <div className="bx-tool__mid">
                      <div className="bx-tool__name">{t.name}</div>
                      <div className="bx-tool__desc">{t.desc}</div>
                    </div>
                    <div className={`bx-toggle${t.on ? ' is-on' : ''}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 우측 — Server Status */}
          <div className="bx-col">
            <div className="bx-server-title">Server Status</div>
            {servers.map((sv, i) => (
              <div key={i} className="bx-card bx-server">
                <div className="bx-server__head">
                  <div>
                    <div className="bx-server__name">{sv.name} <span>{sv.flag}</span></div>
                    <div className="bx-server__spec">{sv.spec}</div>
                  </div>
                  <span className={`bx-pill bx-pill--${sv.kind}`}><i />{sv.state}</span>
                </div>
                {sv.gauges && (
                  <div className="bx-gauges">
                    {sv.gauges.map((g) => <Gauge key={g.label} {...g} />)}
                  </div>
                )}
                {sv.acts && (
                  <div className="bx-server__acts" style={{ marginTop: sv.gauges ? 0 : 16 }}>
                    {sv.acts.map((a) => (
                      <button key={a.label} className={`bx-sbtn${(a as { danger?: boolean }).danger ? ' bx-sbtn--danger' : ''}`}>
                        <a.icon size={14} /> {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
