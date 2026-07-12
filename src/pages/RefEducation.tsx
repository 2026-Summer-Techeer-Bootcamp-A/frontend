import {
  Home, PieChart, Calendar, Folder, ChevronDown, Settings,
  Search, Bell, Maximize2, ArrowUp, FileText, BookOpen, Clock, Flame,
  type LucideIcon,
} from 'lucide-react'
import './refEducation.css'

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

/* ---------- 차트 좌표계 ---------- */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PX = DAYS.map((_, i) => 30 + i * 100) // 30..630
const yPct = (p: number) => 250 - (p / 100) * 230
const mk = (vals: number[]) => vals.map((v, i) => [PX[i], yPct(v)] as [number, number])

const theory = mk([10, 13, 22, 19, 40, 55, 60])
const practice = mk([18, 23, 33, 30, 62, 76, 79])
const lexicon = mk([25, 31, 43, 41, 78, 88, 90])

const areaPath = (pts: [number, number][]) =>
  `${smooth(pts)} L ${pts[pts.length - 1][0]} 250 L ${pts[0][0]} 250 Z`

const HL = 4 // Thu 강조 인덱스

const GRID: { p: number; label: string }[] = [
  { p: 100, label: '100%' },
  { p: 80, label: '80%' },
  { p: 40, label: '40%' },
  { p: 0, label: '0%' },
]

const STRIP: { x: number; w: number; c: string }[] = [
  { x: 30, w: 90, c: '#bfe3cb' },
  { x: 130, w: 90, c: '#cfe6f7' },
  { x: 230, w: 90, c: '#cdb8f0' },
  { x: 330, w: 90, c: '#e7e3ef' },
  { x: 430, w: 90, c: '#f6c9c8' },
  { x: 530, w: 100, c: '#cfe6f7' },
]

/* ---------- 데이터 ---------- */
type RailItem = { icon: LucideIcon; active?: boolean }
const RAIL: RailItem[] = [
  { icon: Home, active: true },
  { icon: PieChart },
  { icon: Calendar },
  { icon: Folder },
  { icon: ChevronDown },
  { icon: Settings },
]

const NAV = ['Dashboard', 'Speaking', 'Progress', 'Courses']

type Legend = { label: string; color: string }
const LEGEND: Legend[] = [
  { label: 'Theory', color: '#5b9be8' },
  { label: 'Practice', color: '#9b7cf0' },
  { label: 'Lexicon', color: '#ef9a9a' },
]

type Course = { title: string; desc: string; date: string; bg: string; imgs: [number, number] }
const COURSES: Course[] = [
  {
    title: 'Speak with Confidence',
    desc: 'Learn how to speak English clearly and confidently in everyday situations.',
    date: '27 Apr 2025', bg: 'var(--c-lav)', imgs: [47, 32],
  },
  {
    title: 'Master the Basics',
    desc: 'Build a strong foundation with essential grammar and vocabulary.',
    date: '30 Apr 2025', bg: 'var(--c-blue)', imgs: [12, 15],
  },
  {
    title: 'Sound Like a Native',
    desc: 'Refine pronunciation and rhythm to sound natural.',
    date: '05 May 2025', bg: 'var(--c-green)', imgs: [56, 33],
  },
]

type Task = { label: string; pct: number; icon: LucideIcon }
const TASKS: Task[] = [
  { label: 'Learn 10 new words today', pct: 57, icon: FileText },
  { label: 'Do 1 grammar task today', pct: 42, icon: FileText },
]

type Stat = { icon: LucideIcon; val: string }
type Friend = { name: string; score: string; img: number; stats: Stat[] }
const FRIENDS: Friend[] = [
  {
    name: 'Anna Morgan', score: '10,568', img: 5,
    stats: [{ icon: BookOpen, val: '25' }, { icon: Clock, val: '832h' }, { icon: Flame, val: '48' }],
  },
  {
    name: 'Jake Thompson', score: '10,234', img: 13,
    stats: [{ icon: BookOpen, val: '23' }, { icon: Clock, val: '778h' }, { icon: Flame, val: '39' }],
  },
  {
    name: 'Sofia Bennett', score: '9,892', img: 20,
    stats: [{ icon: BookOpen, val: '20' }, { icon: Clock, val: '742h' }, { icon: Flame, val: '33' }],
  },
]

const av = (n: number, s = 80) => `https://i.pravatar.cc/${s}?img=${n}`

export default function RefEducation() {
  return (
    <div className="edu-stage">
      <div className="edu">
        {/* 탑바 */}
        <div className="ed-top">
          <div className="ed-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6 4h12v4l-6 3-6-3V4z" fill="#fff" />
              <path d="M6 12l6 3 6-3v4l-6 3-6-3v-4z" fill="#fff" opacity="0.75" />
            </svg>
          </div>
          <div className="ed-nav">
            {NAV.map((n, i) => (
              <div key={n} className={`ed-navitem${i === 0 ? ' is-active' : ''}`}>{n}</div>
            ))}
          </div>
          <div className="ed-topicons">
            <button className="ed-iconbtn"><Search size={18} /></button>
            <button className="ed-iconbtn"><Bell size={18} /><span className="ed-dot" /></button>
            <img className="ed-avatar" alt="me" src={av(45)} />
          </div>
        </div>

        {/* 본문 */}
        <div className="ed-body">
          {/* 좌측 아이콘 레일 */}
          <div className="ed-rail">
            {RAIL.map((r, i) => (
              <button key={i} className={`ed-railbtn${r.active ? ' is-active' : ''}`}>
                <r.icon size={20} />
              </button>
            ))}
          </div>

          {/* 콘텐츠 */}
          <div className="ed-content">
            <div className="ed-head">
              <h1 className="ed-h1">Dashboard</h1>
              <div className="ed-headctrl">
                <button className="ed-drop">Weekly <ChevronDown size={16} /></button>
                <button className="ed-expand"><Maximize2 size={17} /></button>
              </div>
            </div>

            <div className="ed-main">
              {/* Select a course */}
              <div className="ed-card ed-course">
                <div className="ed-course__head">
                  <div>
                    <div className="ed-card__title">Select a course</div>
                    <div className="ed-card__sub">Start learning today.</div>
                  </div>
                  <button className="ed-expand ed-expand--sm"><Maximize2 size={15} /></button>
                </div>
                <div className="ed-searchfield">
                  <input placeholder="Search" readOnly />
                  <button className="ed-searchbtn"><Search size={16} /></button>
                </div>
                <div className="ed-courses">
                  {COURSES.map((c) => (
                    <div key={c.title} className="ed-coursecard" style={{ background: c.bg }}>
                      <div className="ed-coursecard__title">{c.title}</div>
                      <div className="ed-coursecard__desc">{c.desc}</div>
                      <div className="ed-coursecard__foot">
                        <span className="ed-datechip"><Calendar size={13} /> {c.date}</span>
                        <div className="ed-thumbs">
                          <img alt="" src={av(c.imgs[0], 48)} />
                          <img alt="" src={av(c.imgs[1], 48)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 우측 영역 */}
              <div className="ed-right">
                {/* Performance Chart */}
                <div className="ed-card ed-perf">
                  <div className="ed-perf__head">
                    <div>
                      <div className="ed-card__title">Performance Chart</div>
                      <div className="ed-card__sub">Track results and watch your progress rise</div>
                    </div>
                    <div className="ed-legend">
                      {LEGEND.map((l) => (
                        <span key={l.label} className="ed-legend__item">
                          <i style={{ background: l.color }} />{l.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="ed-chart">
                    <svg viewBox="0 0 700 300" preserveAspectRatio="none">
                      {/* 그리드 */}
                      {GRID.map((g) => (
                        <g key={g.p}>
                          <line x1="30" y1={yPct(g.p)} x2="640" y2={yPct(g.p)}
                            stroke="#eef0f5" strokeWidth="1" />
                          <text x="648" y={yPct(g.p) + 4} fontSize="12" fill="#b3b0c2">{g.label}</text>
                        </g>
                      ))}

                      {/* 강조 세로선 */}
                      <line x1={PX[HL]} y1="20" x2={PX[HL]} y2="250"
                        stroke="#c8b8f0" strokeWidth="1.5" strokeDasharray="4 5" />

                      {/* 영역 (뒤→앞) */}
                      <path d={areaPath(lexicon)} fill="rgba(239,154,153,0.30)" stroke="none" />
                      <path d={areaPath(practice)} fill="rgba(155,124,240,0.28)" stroke="none" />
                      <path d={areaPath(theory)} fill="rgba(91,155,232,0.30)" stroke="none" />

                      {/* 라인 */}
                      <path d={smooth(lexicon)} fill="none" stroke="#ef9a9a" strokeWidth="2.5" strokeLinecap="round" />
                      <path d={smooth(practice)} fill="none" stroke="#9b7cf0" strokeWidth="2.5" strokeLinecap="round" />
                      <path d={smooth(theory)} fill="none" stroke="#5b9be8" strokeWidth="2.5" strokeLinecap="round" />

                      {/* 강조 포인트 */}
                      <circle cx={PX[HL]} cy={practice[HL][1]} r="6" fill="#9b7cf0" stroke="#fff" strokeWidth="3" />

                      {/* 세그먼트 스트립 */}
                      {STRIP.map((s) => (
                        <rect key={s.x} x={s.x} y="262" width={s.w} height="6" rx="3" fill={s.c} />
                      ))}

                      {/* x축 라벨 */}
                      {DAYS.map((d, i) => (
                        <text key={d} x={PX[i]} y="288" textAnchor="middle" fontSize="12.5" fill="#a7a4b6">{d}</text>
                      ))}
                    </svg>

                    {/* 다크 툴팁 */}
                    <div className="ed-tip">
                      <span className="ed-tip__arr"><ArrowUp size={16} /></span>
                      <div>
                        <div className="ed-tip__big">+12</div>
                        <div className="ed-tip__lb">More practise</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 하단 2열 */}
                <div className="ed-duo">
                  {/* Homework */}
                  <div className="ed-card ed-hw">
                    <div className="ed-perf__head">
                      <div>
                        <div className="ed-card__title">Homework</div>
                        <div className="ed-card__sub">Check and complete tasks</div>
                      </div>
                      <button className="ed-drop ed-drop--sm">Day <ChevronDown size={15} /></button>
                    </div>
                    <div className="ed-tasks">
                      {TASKS.map((t) => (
                        <div key={t.label} className="ed-task">
                          <div className="ed-task__ico"><t.icon size={16} /></div>
                          <div className="ed-task__mid">
                            <div className="ed-task__label">{t.label}</div>
                            <div className="ed-bar"><span style={{ width: `${t.pct}%` }} /></div>
                          </div>
                          <div className="ed-task__pct">{t.pct}%</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Friends Score */}
                  <div className="ed-card ed-friends">
                    <div className="ed-perf__head">
                      <div>
                        <div className="ed-card__title">Friends Score</div>
                        <div className="ed-card__sub">See how you rank among friends</div>
                      </div>
                      <button className="ed-chip">All</button>
                    </div>
                    <div className="ed-friendlist">
                      {FRIENDS.map((f) => (
                        <div key={f.name} className="ed-friend">
                          <img className="ed-friend__av" alt="" src={av(f.img, 64)} />
                          <div className="ed-friend__mid">
                            <div className="ed-friend__name">{f.name}</div>
                            <div className="ed-friend__stats">
                              {f.stats.map((s, i) => (
                                <span key={i} className="ed-friend__stat">
                                  <s.icon size={12} /> {s.val}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="ed-friend__score">{f.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
