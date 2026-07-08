import { X, Briefcase, Building2, MapPin, Calendar } from 'lucide-react'
import PhoneFrame from '../components/PhoneFrame'
import data from '../data/careerData.json'
import './p3.css'

// 실데이터: 설명이 있는 국외 공고 1건
const P = data.postings.find((p) => p.pool === '국외' && p.desc) ?? data.postings[data.postings.length - 1]
const SRC: Record<string, string> = { wanted: '원티드', jumpit: '점핏', himalayas: 'Himalayas', hn: 'Hacker News', wwr: 'WeWorkRemotely' }

function careerText(min: number | null, max: number | null) {
  if (min == null && max == null) return '경력 무관'
  if (!min) return `경력 ~${max}년`
  if (!max || max === min) return `경력 ${min}년+`
  return `경력 ${min}~${max}년`
}

export default function P3Detail() {
  return (
    <PhoneFrame stage="gray" statusTheme="light" homeIndicator="dark" screenBg="#ffffff">
      <div className="p3d">
        <div className="p3d__handle">
          <span className="p3d__close"><X size={20} /></span>
        </div>

        <div className="p3d__logo" style={{ fontSize: 30, fontWeight: 800, color: '#17181c' }}>
          {P.company.slice(0, 1)}
        </div>
        <div className="p3d__co">{P.company} · {P.pool}</div>
        <div className="p3d__role">{P.title}</div>

        <div className="p3d__pills">
          <span className="p3d__pill"><Briefcase size={18} /> {careerText(P.careerMin, P.careerMax)}</span>
          <span className="p3d__pill"><Building2 size={18} /> {SRC[P.source] || P.source}</span>
        </div>

        <div className="p3d__map">
          <div className="p3d__map-grid" />
          <MapPin className="p3d__map-pin" size={30} fill="#17181c" />
        </div>

        <div className="p3d__payrow">
          <span className="p3d__pay">
            {P.matchPct}<small>% 매칭</small>
          </span>
          <span className="p3d__ago">
            <Calendar size={18} /> {P.postDate}
          </span>
        </div>

        <div className="p3d__h">상세 설명</div>
        <div className="p3d__li">
          <p>{P.desc || '이 공고의 요구 기술 스택을 기반으로 매칭도를 계산했어요.'}</p>
        </div>

        <div className="p3d__h">요구 기술 ({P.matchHeld}/{P.matchTotal} 보유)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {P.techs.map((s) => (
            <span
              key={s}
              style={{
                fontSize: 13,
                borderRadius: 9,
                padding: '7px 12px',
                background: data.resume.skills.includes(s) ? '#eceef4' : '#fdeceb',
                color: data.resume.skills.includes(s) ? '#3b6bff' : '#f0413e',
              }}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="p3d__actions">
          <button className="p3d__apply">지원하기</button>
          <button className="p3d__save">저장</button>
        </div>
      </div>
    </PhoneFrame>
  )
}
