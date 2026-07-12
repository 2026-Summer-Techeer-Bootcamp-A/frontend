import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Bookmark, MapPin, Briefcase, Calendar } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PhoneFrame from '../components/PhoneFrame'
import CompanyLogo from './CompanyLogo'
import { matchGrad } from './kit'
import { THEME, themeVars } from './themes'
import { useIsDesktop } from '../shared/useMediaQuery'
import data from '../data/careerData.json'
import marketData from '../data/marketData.json'
import { useResumesState } from './state'
import './career.css'

type MapPin = { id: string; lat: number; lng: number }

/** 공고 id로 marketData.map.pins에서 좌표를 찾는다. 백엔드 lat/lng가 아직 라이브로
 * 연결되지 않아(별도 태스크 진행 중) 지금은 mock 지도 데이터를 매핑해 쓴다.
 * 매칭되는 pin이 없으면 undefined — 호출부에서 지도 카드를 조용히 숨긴다. */
function findPinCoord(id: string): MapPin | undefined {
  return (marketData.map.pins as MapPin[]).find((pp) => pp.id === id)
}

/** 공고 상세 하단 — 근무 위치 미니 지도. MapScreen.tsx의 L.map/L.tileLayer 초기화 패턴을
 * 그대로 이식하되, 단일 pin만 그리는 축소판(정적 미리보기 톤 — 드래그/줌 비활성)이다. */
function LocationMapCard({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!elRef.current) return
    const map = L.map(elRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
    L.marker([lat, lng], {
      icon: L.divIcon({ className: 'lpin-wrap', html: '<div class="crd-map__pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(map)
    const tid = window.setTimeout(() => map.invalidateSize(), 60)
    return () => {
      window.clearTimeout(tid)
      map.remove()
    }
  }, [lat, lng])

  return (
    <div className="crd-map">
      <div className="crd-map__label">근무 위치</div>
      <div className="crd-map__addr">{address}</div>
      <div ref={elRef} className="crd-map__canvas" />
    </div>
  )
}

function careerText(min: number | null, max: number | null) {
  if (min == null && max == null) return '경력 무관'
  if (!min) return `경력 ~${max}년`
  if (!max || max === min) return `경력 ${min}년+`
  return `경력 ${min}~${max}년`
}

/** [텍스트] 형태의 라벨을 볼드 처리 */
function renderBold(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? <b key={i}>{part}</b> : part,
  )
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const t = THEME
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [tab, setTab] = useState<'desc' | 'company'>('desc')
  const [bookmarked, setBookmarked] = useState(false)
  const { activeResume } = useResumesState()
  const activeSkills = activeResume ? activeResume.skills : []

  // 이전엔 배열 인덱스(data.postings.indexOf(dynamicCopy))로 찾았는데, 매칭 배지가 붙은
  // 동적 복사본은 원본 배열과 참조가 달라 indexOf가 항상 -1이 나오는 버그가 있었다 —
  // 안정적인 id로 직접 찾도록 수정.
  const p = data.postings.find((x) => x.id === decodeURIComponent(id ?? ''))

  if (!p) {
    return (
      <div className="stage stage--app">
        <PhoneFrame app stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="none">
          <div className="crd" style={themeVars(t)}>공고를 찾을 수 없어요.</div>
        </PhoneFrame>
      </div>
    )
  }

  const held = p.techs.filter((x) => activeSkills.includes(x))
  const gap = p.techs.filter((x) => !activeSkills.includes(x))
  const matchHeld = held.length
  const matchTotal = p.techs.length
  const matchPct = matchTotal ? Math.round((matchHeld / matchTotal) * 100) : 100

  const ci = p.companyInfo ?? { industry: '', homepage: '', established: '', location: '', tags: [] as string[] }
  // 국외 공고는 지도 카드를 아예 렌더하지 않는다. id 매칭 pin이 없으면(백엔드 좌표 미연동
  // 등) 에러 대신 조용히 숨긴다.
  const pinCoord = p.pool === '국내' ? findPinCoord(p.id) : undefined
  const bookmarkBtn = (
    <Bookmark
      size={21}
      style={{
        cursor: 'pointer',
        color: bookmarked ? 'var(--c-accent)' : 'var(--c-muted)',
        fill: bookmarked ? 'var(--c-accent)' : 'none',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setBookmarked(!bookmarked)}
    />
  )

  // 회사 로고 + 제목 헤더 — 모바일·데스크톱 공용 조각
  const headerBlock = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
      <CompanyLogo logo={p.logo} name={p.company} size={54} radius={14} />
      <div>
        <div className="crd__co">
          {p.company} · {p.pool}
        </div>
        <div className="crd__role" style={{ margin: '2px 0 0' }}>{p.title}</div>
      </div>
    </div>
  )

  // 지역·경력·마감 메타 — 모바일에선 헤더 아래 칩, 데스크톱에선 사이드 메타 카드 안으로 이동
  const pillsBlock = (
    <div className="crd__pills">
      <span className="crd__pill"><MapPin size={15} /> {p.region || 'Remote'}</span>
      <span className="crd__pill"><Briefcase size={15} /> {careerText(p.careerMin, p.careerMax)}</span>
      {p.closeDate && (() => {
        const d = Math.round((new Date(p.closeDate).getTime() - new Date(data.meta.asOf).getTime()) / 86400000)
        if (d < 0) return null
        const [, m, dd] = p.closeDate.split('-')
        return (
          <span className="crd__pill" style={{ color: '#e0693a' }}>
            <Calendar size={15} /> ~{Number(m)}/{Number(dd)} 마감 D-{d}
          </span>
        )
      })()}
    </div>
  )

  // 매칭 섹션 — 모바일에선 본문 흐름 안, 데스크톱에선 사이드 카드로 이동
  const matchBlock = (
    <div className="crd__match">
      <h4>
        <span>내 매칭 (요구 {matchTotal}개 중 {matchHeld}개 보유)</span>
        <b>{matchPct}%</b>
      </h4>
      <div className="cr-track">
        <i style={{ width: `${matchPct}%`, background: matchGrad(matchPct) }} />
      </div>
      <div className="cr-chips">
        {held.map((s) => (
          <span key={s} className="cr-chip held">{s}</span>
        ))}
        {gap.map((s) => (
          <span key={s} className="cr-chip gap">+{s}</span>
        ))}
      </div>
    </div>
  )

  const tabsNavBlock = (
    <div className="crd__tabs">
      <span className={`crd__tab ${tab === 'desc' ? 'on' : ''}`} onClick={() => setTab('desc')}>상세 설명</span>
      <span className={`crd__tab ${tab === 'company' ? 'on' : ''}`} onClick={() => setTab('company')}>회사</span>
    </div>
  )

  const tabsBodyBlock = (
    <div className="crd__body">
      {tab === 'desc' ? (
        <>
          {p.descSections && p.descSections.length ? (
            p.descSections.map((s, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div className="crd-sec">{s.title}</div>
                <p style={{ whiteSpace: 'pre-line' }}>{renderBold(s.text)}</p>
              </div>
            ))
          ) : (
            <p>이 공고의 요구 기술 스택을 기반으로 매칭도를 계산했어요.</p>
          )}
          <div className="crd-sec">요구 기술</div>
          <p>{p.techs.join(' · ')}</p>
        </>
      ) : (
        <>
          <div className="kv"><span>회사</span><b>{p.company}</b></div>
          {ci.industry && <div className="kv"><span>업종</span><b>{ci.industry}</b></div>}
          {ci.established && <div className="kv"><span>설립</span><b>{ci.established}</b></div>}
          <div className="kv"><span>지역</span><b>{ci.location || p.region || 'Remote'}</b></div>
          <div className="kv"><span>채용 풀</span><b>{p.pool}</b></div>
          {ci.homepage && (
            <div className="kv">
              <span>홈페이지</span>
              <a href={ci.homepage} target="_blank" rel="noreferrer" style={{ color: 'var(--c-accent)', fontWeight: 600 }}>
                바로가기 ↗
              </a>
            </div>
          )}
          {ci.tags && ci.tags.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {ci.tags.map((tg) => (
                <span key={tg} className="cr-chip held" style={{ marginRight: 6 }}>{tg}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  const mapBlock = pinCoord && (
    <LocationMapCard lat={pinCoord.lat} lng={pinCoord.lng} address={ci.location || p.region || '주소 정보 없음'} />
  )

  const detail = (
    <>
      {headerBlock}
      {pillsBlock}
      {matchBlock}
      {tabsNavBlock}
      {tabsBodyBlock}
      {mapBlock}
      <div className="crd__actions">
        <button className="crd__apply">지원하기</button>
      </div>
    </>
  )

  // 데스크톱 셸 크롬은 라우트 레이아웃(ResponsiveProductLayout)이 씌운다.
  // 본문(회사·제목+탭)과 사이드(매칭·메타·지원 액션)를 2열로 나눠 가로 공간을 쓴다.
  if (isDesktop) {
    return (
      <div className="dsub">
        <button className="dsub__back" onClick={() => navigate(-1)}><ChevronLeft size={17} /> 뒤로</button>
        <div className="djd">
          <div className="djd-main crd">
            {headerBlock}
            {tabsNavBlock}
            {tabsBodyBlock}
            {mapBlock}
          </div>
          <aside className="djd-side">
            {matchBlock}
            <div className="djd-card djd-meta">{pillsBlock}</div>
            <div className="djd-applyrow">
              <button className="djd-apply">지원하기</button>
              <button
                type="button"
                className="djd-bookmark"
                aria-label={bookmarked ? '북마크 해제' : '북마크'}
                onClick={() => setBookmarked(!bookmarked)}
              >
                <Bookmark size={18} style={{ color: bookmarked ? 'var(--c-accent)' : 'var(--c-muted)', fill: bookmarked ? 'var(--c-accent)' : 'none' }} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="stage stage--app">
      <PhoneFrame app stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="dark">
        <div className="crd kit-trans kit-trans--push" style={themeVars(t)}>
          <div className="crd__head">
            <span className="crd__back" onClick={() => navigate(-1)}>
              <ChevronLeft size={24} />
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, margin: '0 auto' }}>채용 상세</span>
            {bookmarkBtn}
          </div>
          {detail}
        </div>
      </PhoneFrame>
    </div>
  )
}
