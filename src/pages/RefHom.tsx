import {
  Home, Settings, Sofa, UtensilsCrossed, ChefHat, BedDouble, Bath,
  Waves, Fence, Lightbulb, Speaker, Blinds, Power, Snowflake, Wind,
  Fan, Wifi, Timer, Gauge, SlidersHorizontal, MoveDiagonal2,
  CloudSun, MoreHorizontal, BookOpen,
} from 'lucide-react'
import './refHom.css'

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

/* ---------- 데이터 타입 ---------- */
type IconType = typeof Home
interface NavItem { label: string; icon: IconType; active?: boolean }
interface Device {
  name: string; model: string; icon: IconType; state: string
  temp?: string; sub?: string; on: boolean; selected?: boolean
  rows?: { l: string; r: string }[]
}
interface Mode { label: string; icon: IconType; active?: boolean }
interface ActionCard { label: string; sub: string; icon: IconType }
interface Feed { name: string; action: string; time: string; img?: string; sys?: boolean }
interface WStat { val: string; label: string }

/* ---------- 데이터 ---------- */
const nav: NavItem[] = [
  { label: 'Living Room', icon: Sofa, active: true },
  { label: 'Dining Room', icon: UtensilsCrossed },
  { label: 'Kitchen', icon: ChefHat },
  { label: 'Bed Room', icon: BedDouble },
  { label: 'Bath Room', icon: Bath },
  { label: 'Back Yard & Pool', icon: Waves },
  { label: 'Exteriors', icon: Fence },
]

const devices: Device[] = [
  {
    name: 'Air Conditioner', model: 'Panasonic N73', icon: Snowflake,
    state: 'ON', temp: '20° C', sub: 'Swing', on: true, selected: true,
  },
  { name: 'Smart Lamp', model: 'Xiaomi Yeelight', icon: Lightbulb, state: 'ON', on: true },
  { name: 'Google Home', model: 'Smart Speaker', icon: Speaker, state: 'OFF', on: false },
  {
    name: 'Smart Curtain', model: 'Bardi WiFi Curtain', icon: Blinds,
    state: 'OFF', on: false,
    rows: [{ l: 'Front', r: 'Opened' }, { l: 'Left', r: 'Closed' }],
  },
]

const modes: Mode[] = [
  { label: 'Cool', icon: Snowflake, active: true },
  { label: 'Dry', icon: Wind },
  { label: 'Fan', icon: Fan },
  { label: 'Auto', icon: Gauge },
]

const actions: ActionCard[] = [
  { label: 'M. Swing', sub: 'Swing', icon: MoveDiagonal2 },
  { label: 'Smart', sub: 'S. Mode', icon: Wifi },
  { label: '3 Hours', sub: 'Timer', icon: Timer },
]

const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const EX = [24, 92, 160, 228, 296, 364, 432]
const eVals = [40, 78, 30, 62, 48, 44, 42]
const eY = (v: number) => 118 - (v / 100) * 92
const ePts = EX.map((x, i) => [x, eY(eVals[i])] as [number, number])

const feed: Feed[] = [
  { name: 'Alex', action: 'turn on the device', time: 'Just now', img: 'https://i.pravatar.cc/60?img=13' },
  { name: 'System', action: 'turn off by timer', time: '45 minutes ago', sys: true },
  { name: 'Jessica', action: 'set timer for 45 minutes', time: '1 hour 30 minutes ago', img: 'https://i.pravatar.cc/60?img=47' },
  { name: 'Jessica', action: 'turn on the device', time: '3 hours ago', img: 'https://i.pravatar.cc/60?img=45' },
]

const wstats: WStat[] = [
  { val: '32°', label: 'Sensible' },
  { val: '48%', label: 'Humidity' },
  { val: '0.5', label: 'W. Force' },
  { val: '829 hPa', label: 'Pressure' },
]

/* ---------- 온도 다이얼 (270도 게이지) ---------- */
function TempDial() {
  const r = 120
  const C = 2 * Math.PI * r
  const arc = 0.75 // 270도
  const frac = 0.74
  const track = `${arc * C} ${C}`
  const prog = `${arc * frac * C} ${C}`
  return (
    <div className="hom-dial">
      <svg viewBox="0 0 300 300" width="300" height="300">
        <defs>
          <linearGradient id="hom-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f8cf5" />
            <stop offset="45%" stopColor="#8a7cf0" />
            <stop offset="75%" stopColor="#e089b8" />
            <stop offset="100%" stopColor="#f0a878" />
          </linearGradient>
        </defs>
        <g transform="rotate(135 150 150)">
          <circle cx="150" cy="150" r={r} fill="none" stroke="#2b2f40"
            strokeWidth="10" strokeDasharray={track} strokeLinecap="round" />
          <circle cx="150" cy="150" r={r} fill="none" stroke="url(#hom-arc)"
            strokeWidth="10" strokeDasharray={prog} strokeLinecap="round" />
        </g>
        {/* 눈금 */}
        {Array.from({ length: 60 }, (_, i) => {
          const a = (135 + i * (270 / 59)) * (Math.PI / 180)
          const x1 = 150 + Math.cos(a) * 104
          const y1 = 150 + Math.sin(a) * 104
          const x2 = 150 + Math.cos(a) * 96
          const y2 = 150 + Math.sin(a) * 96
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3a3f52" strokeWidth="1.5" />
        })}
        {/* 노브 */}
        <circle cx="65" cy="65" r="9" fill="#fff" stroke="#4f8cf5" strokeWidth="4" />
      </svg>
      <div className="hom-dial__center">
        <div className="hom-dial__temp">20<span>°</span></div>
        <div className="hom-dial__unit">Celsius</div>
      </div>
    </div>
  )
}

export default function RefHom() {
  return (
    <div className="hom-stage">
      <div className="hom">
        {/* ===== 사이드바 ===== */}
        <aside className="hom-side">
          <div className="hom-side__top">
            <div className="hom-logo"><Home size={17} /> HOM</div>
            <button className="hom-gear"><Settings size={18} /></button>
          </div>

          <div className="hom-profile">
            <img className="hom-profile__img" alt="user" src="https://i.pravatar.cc/120?img=12" />
            <div className="hom-profile__name">Alex&apos;s House</div>
            <div className="hom-profile__date">Monday - April 18, 2022</div>
          </div>

          <nav className="hom-nav">
            {nav.map((n) => (
              <div key={n.label} className={`hom-navitem${n.active ? ' is-active' : ''}`}>
                <n.icon size={18} /> <span>{n.label}</span>
                {n.active && <i className="hom-navitem__bar" />}
              </div>
            ))}
          </nav>

          <div className="hom-side__foot">
            <div className="hom-standby">Standby Mode</div>
            <div className="hom-setup">
              <div className="hom-setup__ico"><BookOpen size={20} /></div>
              <div>
                <div className="hom-setup__t">Setup instructions</div>
                <div className="hom-setup__s">Read instructions →</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== 디바이스 목록 ===== */}
        <section className="hom-devices">
          <div className="hom-dev__head">
            <span>Living Room</span>
            <SlidersHorizontal size={16} />
          </div>
          {devices.map((d) => (
            <div key={d.name} className={`hom-devcard${d.selected ? ' is-selected' : ''}`}>
              <div className="hom-devcard__ico"><d.icon size={20} /></div>
              <div className="hom-devcard__name">{d.name}</div>
              <div className="hom-devcard__model">{d.model}</div>
              {d.temp && (
                <div className="hom-devcard__temp">
                  <b>{d.temp}</b> <span>{d.sub}</span>
                </div>
              )}
              {d.rows && (
                <div className="hom-devcard__rows">
                  {d.rows.map((r) => (
                    <div key={r.l} className="hom-devcard__row"><span>{r.l}</span><span>{r.r}</span></div>
                  ))}
                </div>
              )}
              <div className="hom-devcard__foot">
                <span className="hom-devcard__state">{d.state}</span>
                <button className={`hom-power${d.on ? ' is-on' : ''}`}><Power size={15} /></button>
              </div>
            </div>
          ))}
        </section>

        {/* ===== 메인 컨트롤 ===== */}
        <main className="hom-main">
          <div className="hom-main__head">
            <div className="hom-main__id">
              <div className="hom-main__idico"><Snowflake size={22} /></div>
              <div>
                <div className="hom-main__title">Air Conditioner</div>
                <div className="hom-main__sub">Panasonic N73 Inverter</div>
              </div>
            </div>
            <button className="hom-power hom-power--lg is-on"><Power size={18} /></button>
          </div>

          <TempDial />

          <div className="hom-mode">
            <div className="hom-mode__lb">Mode</div>
            <div className="hom-mode__row">
              {modes.map((m) => (
                <button key={m.label} className={`hom-modebtn${m.active ? ' is-active' : ''}`}>
                  <m.icon size={17} /> {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hom-actions">
            {actions.map((a) => (
              <div key={a.label} className="hom-actioncard">
                <div className="hom-actioncard__ico"><a.icon size={24} /></div>
                <div className="hom-actioncard__t">{a.label}</div>
                <div className="hom-actioncard__s">{a.sub}</div>
              </div>
            ))}
          </div>
        </main>

        {/* ===== 우측 위젯 ===== */}
        <aside className="hom-right">
          {/* 에너지 소비 */}
          <div className="hom-card hom-energy">
            <div className="hom-energy__lb">Energy consumption for 1-23 Aprill</div>
            <div className="hom-energy__big">104.68 kWh</div>
            <div className="hom-energy__chart">
              <div className="hom-energy__tag">3.5 kWh</div>
              <svg viewBox="0 0 456 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hom-earea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b8cf0" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#5b8cf0" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${smooth(ePts)} L 432 140 L 24 140 Z`} fill="url(#hom-earea)" />
                <path d={smooth(ePts)} fill="none" stroke="#7aa4f5" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={EX[3]} cy={eY(eVals[3])} r="5" fill="#fff" stroke="#5b8cf0" strokeWidth="3" />
              </svg>
            </div>
            <div className="hom-energy__days">
              {week.map((d, i) => (
                <span key={d} className={i === 3 ? 'is-active' : ''}>{d}</span>
              ))}
            </div>
            <div className="hom-energy__cost">
              <div className="hom-energy__costhead">
                <span><Timer size={14} /> Cost for 1-23 April</span>
                <MoreHorizontal size={16} />
              </div>
              <div className="hom-energy__costval">$ 2.35<span>89273</span></div>
            </div>
          </div>

          {/* 액티비티 */}
          <div className="hom-card hom-activity">
            <div className="hom-activity__head">
              <span>Activity</span>
              <a>See more</a>
            </div>
            {feed.map((f, i) => (
              <div key={i} className="hom-feed">
                {f.sys
                  ? <div className="hom-feed__sys"><Settings size={15} /></div>
                  : <img className="hom-feed__img" alt={f.name} src={f.img} />}
                <div className="hom-feed__mid">
                  <div className="hom-feed__txt"><b>{f.name}</b> {f.action}</div>
                  <div className="hom-feed__time"><Timer size={11} /> {f.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 날씨 */}
          <div className="hom-weather">
            <div className="hom-weather__top">
              <div>
                <div className="hom-weather__head"><CloudSun size={22} /> Partly Cloudy</div>
                <div className="hom-weather__loc">Walnut Creek, CA, USA</div>
              </div>
              <div className="hom-weather__temp">28<span>°C</span></div>
            </div>
            <div className="hom-weather__stats">
              {wstats.map((s) => (
                <div key={s.label} className="hom-wstat">
                  <div className="hom-wstat__v">{s.val}</div>
                  <div className="hom-wstat__l">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
