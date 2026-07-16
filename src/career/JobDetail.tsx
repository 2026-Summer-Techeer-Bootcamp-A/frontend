import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Bookmark, MapPin, Briefcase, Calendar, Sparkles, GitCompareArrows } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PhoneFrame from '../components/PhoneFrame'
import CompanyLogo from './CompanyLogo'
import { matchGrad, MiniScore } from './kit'
import { THEME, themeVars } from './themes'
import { useIsDesktop } from '../shared/useMediaQuery'
import data from '../data/careerData.json'
import marketData from '../data/marketData.json'
import { getDynamicPostings, useResumesState } from './state'
import { isBookmarked, toggleBookmark, useBookmarks } from './bookmarkStore'
import { recordView } from './viewHistoryStore'
import { jobsApi, type PostingCard } from './api'
import { getAuthToken } from './authStore'
import { addMapTileLayer } from './mapTiles'
import type { ChatAttachment } from '../rag/chatContract'
import {
  setAttachmentIntent,
  setPendingComparePosting,
  usePendingComparePosting,
  clearPendingComparePosting,
} from '../rag/attachmentIntentStore'
import './career.css'

type MapPin = { id: string; lat: number; lng: number }

/** 공고 id로 marketData.map.pins에서 좌표를 찾는다. 백엔드 lat/lng가 아직 라이브로
 * 연결되지 않아(별도 태스크 진행 중) 지금은 mock 지도 데이터를 매핑해 쓴다.
 * 매칭되는 pin이 없으면 undefined — 호출부에서 지도 카드를 조용히 숨긴다. */
function findPinCoord(id: string): MapPin | undefined {
  return (marketData.map.pins as MapPin[]).find((pp) => pp.id === id)
}

/** 두 좌표 사이의 대략적인 거리(km) — haversine 공식. "주변 채용공고" 거리 뱃지 계산용. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 두 pin 좌표로 거리 뱃지 문구를 만든다. 좌표가 없으면(백엔드 미연동 등) undefined —
 * 호출부에서 거리 뱃지를 조용히 생략한다. 아주 가까우면(0.1km 미만) "인근"으로 표기. */
function distanceLabel(a: MapPin | undefined, b: MapPin | undefined): string | undefined {
  if (!a || !b) return undefined
  const km = haversineKm(a.lat, a.lng, b.lat, b.lng)
  if (km < 0.1) return '인근'
  return `~${km.toFixed(1)}km`
}

/** 공고 상세 하단 — 근무 위치 미니 지도. MapScreen.tsx의 L.map/L.tileLayer 초기화 패턴을
 * 그대로 이식하되, 단일 pin만 그리는 축소판(정적 미리보기 톤 — 드래그/줌 비활성)이다. */
function LocationMapCard({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const elRef = useRef<HTMLDivElement>(null)
  const [tileStatus, setTileStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!elRef.current) return
    setTileStatus('loading')
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
    const removeTiles = addMapTileLayer(map, setTileStatus)
    L.marker([lat, lng], {
      icon: L.divIcon({ className: 'lpin-wrap', html: '<div class="crd-map__pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(map)
    const tid = window.setTimeout(() => map.invalidateSize(), 60)
    return () => {
      window.clearTimeout(tid)
      removeTiles()
      map.remove()
    }
  }, [lat, lng])

  return (
    <div className="crd-map">
      <div className="crd-map__label">근무 위치</div>
      <div className="crd-map__addr">{address}</div>
      <div className="crd-map__viewport">
        <div ref={elRef} className="crd-map__canvas" />
        {tileStatus === 'loading' && (
          <div className="crd-map__status" role="status">지도를 불러오는 중…</div>
        )}
        {tileStatus === 'error' && (
          <div className="crd-map__status">지도를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.</div>
        )}
      </div>
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

type RecoPosting = ReturnType<typeof getDynamicPostings>[number]

/** 데스크톱 3열 레일(.djd-reco) 한 행 — 로고 + 제목/회사(+위치·거리 뱃지) + 겹치는 기술(선택) + 미니 점수. */
function JobRecoRow({
  job, techChips, locationBadge, distanceBadge, onOpen,
}: {
  job: RecoPosting
  techChips?: string[]
  locationBadge?: string
  distanceBadge?: string
  onOpen: () => void
}) {
  return (
    <button type="button" className="djd-reco-row" onClick={onOpen}>
      <CompanyLogo logo={job.logo} name={job.company} size={36} radius={10} />
      <div className="djd-reco-row__body">
        <div className="djd-reco-row__title">{job.title}</div>
        {locationBadge || distanceBadge ? (
          <div className="djd-reco-row__co djd-reco-row__co--badged">
            <span className="djd-reco-row__co-name">{job.company}</span>
            {locationBadge && <span className="djd-reco-badge">{locationBadge}</span>}
            {distanceBadge && <span className="djd-reco-dist">{distanceBadge}</span>}
          </div>
        ) : (
          <div className="djd-reco-row__co">{job.company}</div>
        )}
        {techChips && techChips.length > 0 && (
          <div className="djd-reco-row__techs">
            {techChips.slice(0, 2).map((tc) => (
              <span key={tc} className="djd-reco-tech">{tc}</span>
            ))}
          </div>
        )}
      </div>
      <MiniScore pct={job.matchPct} size={32} />
    </button>
  )
}

/** 데스크톱 3열 레일 카드 — "주변 채용공고" / "비슷한 채용공고" 공용. 비면 빈 상태 문구. */
function JobRecoCard({
  title, hint, jobs, onOpen, techOverlap, locationOf,
}: {
  title: string
  hint: string
  jobs: RecoPosting[]
  onOpen: (id: string) => void
  techOverlap?: (job: RecoPosting) => string[]
  /** 위치·거리 뱃지(주변 채용공고 전용) — "비슷한 채용공고"에는 넘기지 않는다. */
  locationOf?: (job: RecoPosting) => { location?: string; distance?: string }
}) {
  return (
    <div className="djd-card djd-reco-card">
      <div className="djd-reco-card__head">
        <h4>{title}</h4>
        <span className="djd-reco-card__hint">{hint}</span>
      </div>
      {jobs.length === 0 ? (
        <div className="djd-reco-empty">해당 공고가 없어요</div>
      ) : (
        <div className="djd-reco-list">
          {jobs.map((job) => {
            const badge = locationOf?.(job)
            return (
              <JobRecoRow
                key={job.id}
                job={job}
                techChips={techOverlap?.(job)}
                locationBadge={badge?.location}
                distanceBadge={badge?.distance}
                onOpen={() => onOpen(job.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const t = THEME
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [tab, setTab] = useState<'desc' | 'company'>('desc')
  // 북마크 상태 자체는 bookmarkStore가 정본(localStorage) — 여기서는 구독만 걸어
  // 다른 탭/컴포넌트에서 토글돼도 리렌더되도록 한다(반환값은 쓰지 않는다).
  useBookmarks()
  // 공고↔공고 비교 2단계 담기 흐름의 현재 상태(다른 공고 상세에서 "비교할 공고 담기"를
  // 눌러둔 게 있는지) — 있으면 이 공고 쪽 버튼이 "이 공고와 비교"로 바뀐다.
  const pendingCompare = usePendingComparePosting()
  const [justStashed, setJustStashed] = useState(false)
  const { activeResume } = useResumesState()
  const activeSkills = activeResume ? activeResume.skills : []
  const [desktopDetail, setDesktopDetail] = useState<Awaited<ReturnType<typeof jobsApi.detail>> | null>(null)
  const [desktopNearby, setDesktopNearby] = useState<PostingCard[] | null>(null)
  const [desktopSimilar, setDesktopSimilar] = useState<Array<PostingCard & { overlap_count?: number }> | null>(null)
  const [desktopPin, setDesktopPin] = useState<MapPin | undefined>()
  // 데스크톱은 실 API로 상세를 새로 불러오는데, 이 요청이 끝나기 전엔 아직 desktopDetail이
  // 비어서 p가 mockP(대부분 매칭 안 됨=undefined)로 떨어져 "공고를 찾을 수 없어요"가
  // 잠깐 번쩍이고 사라지는 문제가 있었다 — 로딩 중엔 그 대신 스켈레톤을 보여준다.
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!isDesktop || !id) return
    let cancelled = false
    setDetailLoading(true)
    const numericResumeId = Number(activeResume?.id)
    Promise.allSettled([
      jobsApi.detail(id),
      jobsApi.nearby(id, 5),
      jobsApi.similar(id, 5),
      jobsApi.map(Number.isInteger(numericResumeId) ? { resume_id: numericResumeId } : {}, getAuthToken()),
    ]).then(([detail, nearby, similar, map]) => {
      if (cancelled) return
      if (detail.status === 'fulfilled') setDesktopDetail(detail.value)
      if (nearby.status === 'fulfilled') setDesktopNearby(nearby.value.items)
      if (similar.status === 'fulfilled') setDesktopSimilar(similar.value.items)
      if (map.status === 'fulfilled') {
        const pin = map.value.pins.find((item) => String(item.id) === decodeURIComponent(id))
        if (pin) setDesktopPin({ id: String(pin.id), lat: pin.lat, lng: pin.lng })
      }
      setDetailLoading(false)
    })
    return () => { cancelled = true }
  }, [isDesktop, id, activeResume?.id])

  // 이전엔 배열 인덱스(data.postings.indexOf(dynamicCopy))로 찾았는데, 매칭 배지가 붙은
  // 동적 복사본은 원본 배열과 참조가 달라 indexOf가 항상 -1이 나오는 버그가 있었다 —
  // 안정적인 id로 직접 찾도록 수정.
  const mockP = data.postings.find((x) => x.id === decodeURIComponent(id ?? ''))
  const fallbackP = mockP ?? data.postings[0]
  const p = isDesktop && desktopDetail ? {
    ...fallbackP,
    ...mockP,
    id: String(desktopDetail.id),
    source: desktopDetail.source,
    pool: desktopDetail.pool === 'domestic' ? '국내' : desktopDetail.pool === 'global' ? '국외' : fallbackP.pool,
    company: desktopDetail.company ?? '회사명 미상',
    title: desktopDetail.title,
    logo: desktopDetail.logo_url ?? mockP?.logo ?? '',
    postDate: desktopDetail.post_date ?? '',
    closeDate: desktopDetail.close_date ?? '',
    careerMin: desktopDetail.career_min,
    careerMax: desktopDetail.career_max,
    region: desktopDetail.region,
    techs: desktopDetail.skills,
    url: desktopDetail.url,
    district: mockP?.district ?? '',
    descSections: desktopDetail.desc_sections?.length ? desktopDetail.desc_sections : (mockP?.descSections ?? []),
    companyInfo: {
      industry: desktopDetail.industry ?? mockP?.companyInfo?.industry ?? '',
      location: desktopDetail.region ?? mockP?.companyInfo?.location ?? '',
      homepage: mockP?.companyInfo?.homepage ?? '',
      established: mockP?.companyInfo?.established ?? '',
      tags: mockP?.companyInfo?.tags ?? [],
    },
  } : mockP
  const bookmarked = isBookmarked(p?.id ?? '')

  // 조회 기록 — 훅 규칙을 지키기 위해 얼리리턴보다 위에서 항상 호출하고, 내부에서 p 유무를 체크한다.
  useEffect(() => {
    if (p) recordView(p.id)
  }, [p?.id])

  // 데스크톱 3열 레일(주변/비슷한 채용공고) 계산 — 훅 규칙을 지키기 위해 얼리리턴보다
  // 위에서 항상 호출하고, 내부에서 p 유무를 가드한다. matchPct가 반영된 동적 postings
  // (getDynamicPostings) 기준으로 계산해 사이드 매칭 카드와 수치가 어긋나지 않게 한다.
  const { nearby: mockNearby, similar: mockSimilar, hasLocationKey } = useMemo(() => {
    if (!p) return { nearby: [] as RecoPosting[], similar: [] as RecoPosting[], hasLocationKey: false }
    const pool = getDynamicPostings(activeSkills)
    const others = pool.filter((o) => o.id !== p.id)
    const districtKey = p.district || p.region
    const nearbyList = districtKey
      ? others.filter((o) => o.pool === '국내' && (o.district || o.region) === districtKey).slice(0, 5)
      : []
    const similarList = others
      .map((o) => ({ o, overlap: o.techs.filter((tc) => p.techs.includes(tc)).length }))
      .filter((x) => x.overlap >= 1)
      .sort((a, b) => b.overlap - a.overlap || b.o.matchPct - a.o.matchPct)
      .slice(0, 5)
      .map((x) => x.o)
    return { nearby: nearbyList, similar: similarList, hasLocationKey: Boolean(districtKey) }
  }, [p, activeSkills])

  const apiCardToPosting = (card: PostingCard): RecoPosting => {
    const existing = getDynamicPostings(activeSkills).find((item) => String(item.id) === String(card.id))
    const base = existing ?? getDynamicPostings(activeSkills)[0]
    const held = card.skills.filter((skill) => activeSkills.includes(skill))
    return { ...base, ...existing, id: String(card.id), title: card.title, company: card.company ?? '회사명 미상', logo: card.logo_url ?? existing?.logo ?? '', postDate: card.post_date ?? '', closeDate: card.close_date ?? '', techs: card.skills, matchHeld: card.matched_count ?? held.length, matchTotal: card.skills.length, matchPct: card.skills.length ? Math.round(((card.matched_count ?? held.length) / card.skills.length) * 100) : 0, gap: card.skills.filter((skill) => !activeSkills.includes(skill)) }
  }
  const nearby = desktopNearby?.map(apiCardToPosting) ?? mockNearby
  const similar = desktopSimilar?.map(apiCardToPosting) ?? mockSimilar

  if (!p) {
    if (isDesktop && detailLoading) {
      return (
        <div className="dsub djd-loading" aria-busy="true" aria-live="polite">
          <div className="djd">
            <div className="djd-main crd">
              <div className="crd-skeleton">
                <div className="djd-loading__head">
                  <span className="crd-skel djd-loading__logo" />
                  <span className="djd-loading__titles">
                    <span className="crd-skel" />
                    <span className="crd-skel crd-skel--lg" />
                  </span>
                </div>
                <span className="crd-skel" style={{ width: '34%', marginTop: 24 }} />
                <span className="crd-skel crd-skel--block" />
                <span className="crd-skel crd-skel--block" style={{ height: 180 }} />
              </div>
            </div>
            <aside className="djd-side">
              <div className="djd-card djd-loading__side-card crd-skeleton">
                <span className="crd-skel djd-loading__score" />
                <span className="crd-skel" />
                <span className="crd-skel" style={{ width: '72%' }} />
              </div>
              <div className="djd-card djd-loading__side-card crd-skeleton">
                <span className="crd-skel" />
                <span className="crd-skel" />
                <span className="crd-skel" style={{ width: '58%' }} />
              </div>
            </aside>
            <aside className="djd-reco">
              <div className="djd-card djd-loading__reco crd-skeleton">
                <span className="crd-skel crd-skel--lg" style={{ width: '52%' }} />
                <span className="crd-skel crd-skel--block" style={{ height: 210 }} />
              </div>
            </aside>
          </div>
        </div>
      )
    }
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
  const pinCoord = p.pool === '국내' ? desktopPin ?? (desktopDetail?.lat != null && desktopDetail.lng != null ? { id: p.id, lat: desktopDetail.lat, lng: desktopDetail.lng } : findPinCoord(p.id)) : undefined

  // 어시스턴트 딥링크 트리거 — chat 백엔드는 posting_ids로 실제 DB의 숫자 공고 id를 요구한다.
  // 모바일 화면은 mock careerData.json(문자열 id, 원본 채용 URL)만 쓰고 라이브 API를 아예
  // 호출하지 않아 숫자 id가 없다 — desktopDetail(실 API 응답)이 있을 때만 트리거를 노출한다.
  const realPosting = desktopDetail ? { id: desktopDetail.id, title: desktopDetail.title, company: desktopDetail.company } : null
  const resumeAttachment: ChatAttachment | undefined = activeResume
    ? { kind: 'resume', id: Number(activeResume.id), title: activeResume.title, subtitle: activeResume.position || undefined }
    : undefined

  const compareWithResume = () => {
    if (!realPosting) return
    const postingAttachment: ChatAttachment = {
      kind: 'posting',
      id: realPosting.id,
      title: realPosting.title,
      subtitle: realPosting.company ?? undefined,
    }
    setAttachmentIntent({
      attachments: resumeAttachment ? [resumeAttachment, postingAttachment] : [postingAttachment],
      seedQuestion: '이 이력서로 이 공고에 지원하면 뭐가 부족할까?',
    })
    navigate('/assistant')
  }

  const isThisPostingStashed = !!realPosting && pendingCompare?.id === realPosting.id

  const stashForCompare = () => {
    if (!realPosting) return
    setPendingComparePosting({ id: realPosting.id, title: realPosting.title })
    setJustStashed(true)
    window.setTimeout(() => setJustStashed(false), 2200)
  }

  const compareWithStashed = () => {
    if (!realPosting || !pendingCompare || pendingCompare.id === realPosting.id) return
    setAttachmentIntent({
      attachments: [
        { kind: 'posting', id: pendingCompare.id, title: pendingCompare.title },
        { kind: 'posting', id: realPosting.id, title: realPosting.title, subtitle: realPosting.company ?? undefined },
      ],
      seedQuestion: '두 공고의 요구 기술을 비교해줘',
    })
    clearPendingComparePosting()
    navigate('/assistant')
  }

  const assistantTriggerBlock = realPosting && (
    <div className="djd-assist-row">
      <button type="button" className="djd-assist-btn" onClick={compareWithResume}>
        <Sparkles size={15} /> 내 이력서와 비교
      </button>
      {pendingCompare && !isThisPostingStashed ? (
        <button type="button" className="djd-assist-btn" onClick={compareWithStashed}>
          <GitCompareArrows size={15} /> "{pendingCompare.title}"와 비교
        </button>
      ) : (
        <button
          type="button"
          className={`djd-assist-btn${isThisPostingStashed ? ' djd-assist-btn--on' : ''}`}
          onClick={stashForCompare}
          disabled={isThisPostingStashed}
        >
          <GitCompareArrows size={15} />
          {isThisPostingStashed ? (justStashed ? '담았어요 · 다른 공고에서 비교해보세요' : '비교 대기 중') : '비교할 공고 담기'}
        </button>
      )}
    </div>
  )

  const bookmarkBtn = (
    <Bookmark
      size={21}
      style={{
        cursor: 'pointer',
        color: bookmarked ? 'var(--c-accent)' : 'var(--c-muted)',
        fill: bookmarked ? 'var(--c-accent)' : 'none',
        transition: 'all 0.2s ease',
      }}
      onClick={() => toggleBookmark(p.id)}
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
        const now = isDesktop && desktopDetail ? new Date() : new Date(data.meta.asOf)
        const d = Math.round((new Date(p.closeDate).getTime() - now.getTime()) / 86400000)
        const [, m, dd] = p.closeDate.split('-')
        if (d < 0) {
          return (
            <span className="crd__pill" style={{ color: '#a2a6b0' }}>
              <Calendar size={15} /> {Number(m)}/{Number(dd)} 마감됨
            </span>
          )
        }
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
            <div className="djd-head">
              <CompanyLogo logo={p.logo} name={p.company} size={60} radius={16} />
              <div className="djd-head__meta">
                <div className="crd__co">{p.company} · {p.pool}</div>
                <h1 className="djd-title">{p.title}</h1>
              </div>
            </div>
            {tabsNavBlock}
            {tabsBodyBlock}
          </div>
          <aside className="djd-side">
            <div className="djd-card djd-match">
              <div className="djd-match__head">
                <MiniScore pct={matchPct} size={60} />
                <div className="djd-match__sub">요구 {matchTotal}개 중 {matchHeld}개 보유</div>
              </div>
              <div className="djd-match__chips">
                {held.map((s) => (
                  <span key={s} className="djd-chip djd-chip--held">{s}</span>
                ))}
                {gap.map((s) => (
                  <span key={s} className="djd-chip djd-chip--gap">+{s}</span>
                ))}
              </div>
            </div>
            <div className="djd-card djd-meta">{pillsBlock}</div>
            {mapBlock && (
              <div className="djd-map">
                {mapBlock}
                <div className="djd-map__cap">{p.region || ci.location || '위치 정보 없음'}</div>
              </div>
            )}
            <div className="djd-applyrow">
              <button className="djd-apply">지원하기</button>
              <button
                type="button"
                className="djd-bookmark"
                aria-label={bookmarked ? '북마크 해제' : '북마크'}
                onClick={() => toggleBookmark(p.id)}
              >
                <Bookmark size={18} style={{ color: bookmarked ? 'var(--c-accent)' : 'var(--c-muted)', fill: bookmarked ? 'var(--c-accent)' : 'none' }} />
              </button>
            </div>
            {assistantTriggerBlock}
          </aside>
          <aside className="djd-reco">
            {hasLocationKey && (
              <JobRecoCard
                title="주변 채용공고"
                hint={`${p.district || p.region} 인근`}
                jobs={nearby}
                onOpen={(jid) => navigate('/job/' + encodeURIComponent(jid))}
                locationOf={(job) => ({
                  location: job.district || job.region,
                  distance: distanceLabel(pinCoord, findPinCoord(job.id)),
                })}
              />
            )}
            <JobRecoCard
              title="비슷한 채용공고"
              hint="요구 기술 유사"
              jobs={similar}
              onOpen={(jid) => navigate('/job/' + encodeURIComponent(jid))}
              techOverlap={(job) => job.techs.filter((tc) => p.techs.includes(tc))}
            />
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
