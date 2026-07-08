import { ChevronLeft, Save, Share, MapPin, Briefcase, Building2 } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import data from '../data/careerData.json'
import './p1detail.css'

// 실데이터: 국내 공고 1건
const P = data.postings.find((p) => p.pool === '국내') ?? data.postings[0]
const RESUME: string[] = data.resume.skills
const HELD = P.techs.filter((t) => RESUME.includes(t))
const SRC: Record<string, string> = { wanted: '원티드', jumpit: '점핏', himalayas: 'Himalayas', hn: 'Hacker News', wwr: 'WeWorkRemotely' }

function careerText(min: number | null, max: number | null) {
  if (min == null && max == null) return '경력 무관'
  if (!min) return `~${max}년`
  if (!max || max === min) return `${min}년+`
  return `${min}~${max}년`
}

function Gauge({ pct }: { pct: number }) {
  const purple = Math.max(4, Math.round(pct * 0.97))
  const r = 92, cx = 110, cy = 110
  return (
    <div className="p1d__gauge">
      <svg viewBox="0 0 220 220" width="220" height="220">
        <g transform="rotate(90 110 110)">
          <circle cx={cx} cy={cy} r={r} pathLength={100} fill="none" stroke="#ecebef" strokeWidth={18} strokeLinecap="round" strokeDasharray="97 3" />
          <circle cx={cx} cy={cy} r={r} pathLength={100} fill="none" stroke="#6a6cf0" strokeWidth={18} strokeLinecap="round" strokeDasharray={`${purple} ${100 - purple}`} />
          <circle cx={cx} cy={cy} r={r} pathLength={100} fill="none" stroke="#ffffff" strokeWidth={26} strokeLinecap="round" strokeDasharray="0.1 99.9" strokeDashoffset={-purple} />
          <circle cx={cx} cy={cy} r={r} pathLength={100} fill="none" stroke="#6a6cf0" strokeWidth={13} strokeLinecap="round" strokeDasharray="0.1 99.9" strokeDashoffset={-purple} />
        </g>
      </svg>
      <div className="p1d__gauge-center">
        <span className="p1d__gauge-pct">{pct}%</span>
        <span className="p1d__gauge-lbl">매칭 점수</span>
      </div>
    </div>
  )
}

export default function P1Detail() {
  return (
    <PhoneFrame stage="purple" statusTheme="light" homeIndicator="dark" screenBg="#fbfbfe">
      <div className="p1d">
        <div className="p1d__topglow" />
        <div className="p1d__inner">
          <div className="p1d__header">
            <span className="p1d__hicon"><ChevronLeft size={24} /></span>
            <span className="p1d__htitle">채용 상세</span>
            <span className="p1d__hright"><Save size={21} /><Share size={21} /></span>
          </div>

          <div className="p1d__brand">
            <div className="p1d__logo" style={{ fontSize: 34, fontWeight: 800, color: '#6a6cf0' }}>
              {P.company.slice(0, 1)}
            </div>
            <div className="p1d__role" style={{ fontSize: 19, textAlign: 'center', padding: '0 16px' }}>{P.title}</div>
            <div className="p1d__co">{P.company} · {P.pool}</div>
          </div>

          <div className="p1d__pills">
            <span className="p1d__pill"><MapPin size={16} /> {P.region || 'Remote'}</span>
            <span className="p1d__pill"><Briefcase size={16} /> {careerText(P.careerMin, P.careerMax)}</span>
            <span className="p1d__pill"><Building2 size={16} /> {SRC[P.source] || P.source}</span>
          </div>

          <div className="p1d__tabs">
            <span className="p1d__tab">상세 설명</span>
            <span className="p1d__tab">회사</span>
            <span className="p1d__tab p1d__tab--active">내 매칭</span>
          </div>

          <div className="p1d__review">
            <h3>매칭 개요</h3>
            <Gauge pct={P.matchPct} />
            <div className="p1d__rating">요구 {P.matchTotal}개 중 {P.matchHeld}개 보유</div>
            <div className="p1d__based" style={{ marginTop: 8 }}>
              {HELD.slice(0, 4).map((s) => (
                <span key={s} style={{ display: 'inline-block', background: '#e5e6fb', color: '#4a4cc0', borderRadius: 8, padding: '4px 9px', margin: '2px 3px', fontSize: 12 }}>{s}</span>
              ))}
              {P.gap.slice(0, 3).map((s) => (
                <span key={s} style={{ display: 'inline-block', background: '#fdeceb', color: '#c0413e', borderRadius: 8, padding: '4px 9px', margin: '2px 3px', fontSize: 12 }}>+{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}
