import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, ArrowUpRight, FileText } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MiniScore, SectionHeader, SegmentedControl, SkillChip,
  OpportunityQuadrant, TechIcon, type QuadItem,
} from '../../career/kit'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, calculateCoverage } from '../../career/state'
import { getAuthToken, useAuth } from '../../career/authStore'
import { recruitmentApi, type PostingCardDto } from '../../career/recruitmentApi'
import marketData from '../../data/marketData.json'
import './placeholders.css'

/* 데스크톱 페이지 — 모바일 단일컬럼과 분리된 PC 레이아웃 틀.
   대시보드(홈)는 DesktopOverview.tsx가 담당. 여기는 공고·시장·지도·마이. */

const TIER_RANK: Record<string, number> = { 대기업: 0, 중견: 1, 중소: 2 }
const tierRank = (t: string | null) => (t && t in TIER_RANK ? TIER_RANK[t] : 3)
function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

/* ───────────────── 맞춤 공고 — 마스터-디테일 ───────────────── */
export function DesktopJobs() {
  const { activeResume } = useResumesState()
  const skills = activeResume?.skills ?? []
  const [pool, setPool] = useState<'국내' | '국외'>('국내')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'match' | 'tier' | 'latest'>('match')
  const [selId, setSelId] = useState<string | null>(null)
  const [remotePostings, setRemotePostings] = useState<PostingCardDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    const resumeId = Number(activeResume?.id)
    const hasMatchedResume = Number.isInteger(resumeId) && !!getAuthToken()
    recruitmentApi.postings({
      pool: pool === '국내' ? 'domestic' : 'global', page_size: 100, sort: 'latest',
      ...(hasMatchedResume ? { resume_id: resumeId, match_only: true } : {}),
    })
      .then((result) => { if (!cancelled) setRemotePostings(result.items) })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : '공고를 불러오지 못했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pool, activeResume?.id])
  const postings = useMemo(() => remotePostings.map((p) => {
    const held = p.skills.filter((skill) => skills.includes(skill))
    const matched = p.matched_count ?? held.length
    return { id: String(p.id), title: p.title, company: p.company ?? '회사명 미상', pool, postDate: p.post_date ?? '', closeDate: p.close_date ?? '', techs: p.skills, matchPct: p.skills.length ? Math.round(matched / p.skills.length * 100) : 0, careerMin: null, careerMax: null, tier: null, region: null, logo: '', url: p.url }
  }), [remotePostings, skills, pool])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    let arr = postings.filter((p) => p.pool === pool)
    if (s) arr = arr.filter((p) => (p.company + ' ' + p.title).toLowerCase().includes(s))
    return [...arr].sort((a, b) =>
      sort === 'tier' ? tierRank(a.tier) - tierRank(b.tier) || b.matchPct - a.matchPct
        : sort === 'latest' ? (b.postDate || '').localeCompare(a.postDate || '')
          : b.matchPct - a.matchPct)
  }, [postings, pool, q, sort])

  const sel = list.find((p) => p.id === selId) ?? list[0]

  return (
    <div className="dpage djobs">
      <header className="dpage__head">
        <h1 className="dpage__title">맞춤 공고</h1>
        <p className="dpage__desc">필터 · 결과 · 상세를 한 화면에서</p>
      </header>

      <div className="djobs__grid">
        {/* 필터 */}
        <aside className="dcard djobs__filters">
          <div className="djobs__search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="회사 · 공고 검색" />
          </div>
          <div className="djobs__fld">
            <span className="djobs__fld-l">채용 풀</span>
            <SegmentedControl value={pool} onChange={(v) => setPool(v as '국내' | '국외')}
              options={[{ key: '국내', label: '국내' }, { key: '국외', label: '글로벌' }]} />
          </div>
          <div className="djobs__fld">
            <span className="djobs__fld-l">정렬</span>
            <div className="djobs__sorts">
              {([['match', '매칭순'], ['tier', '규모순'], ['latest', '최신순']] as const).map(([k, lb]) => (
                <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{lb}</button>
              ))}
            </div>
          </div>
          <div className="djobs__count">{list.length.toLocaleString()}건</div>
        </aside>

        {/* 결과 리스트 */}
        <div className="dcard djobs__list">
          {loading ? <div className="dpage__empty">채용공고를 불러오는 중입니다.</div>
            : error ? <div className="dpage__empty" role="alert">{error}</div>
              : list.slice(0, 40).map((p) => (
            <button
              key={p.id}
              className={`djobs__row${sel?.id === p.id ? ' on' : ''}`}
              onClick={() => setSelId(p.id)}
            >
              <CompanyLogo logo={p.logo} name={p.company} size={38} radius={10} />
              <span className="djobs__row-b">
                <span className="djobs__row-t">{p.title}</span>
                <span className="djobs__row-c">{p.company} · {careerLabel(p.careerMin, p.careerMax)}</span>
              </span>
              <MiniScore pct={p.matchPct} size={40} />
            </button>
              ))}
        </div>

        {/* 상세 프리뷰 */}
        <aside className="dcard djobs__preview">
          {!sel ? <div className="dpage__empty">공고가 없어요.</div> : (
            <>
              <div className="djobs__pv-head">
                <CompanyLogo logo={sel.logo} name={sel.company} size={52} radius={14} />
                <MiniScore pct={sel.matchPct} size={54} />
              </div>
              <h2 className="djobs__pv-title">{sel.title}</h2>
              <div className="djobs__pv-meta">{sel.company} · {sel.region ?? '지역 미상'} · {careerLabel(sel.careerMin, sel.careerMax)}</div>
              <div className="djobs__pv-sec">요구 기술</div>
              <div className="djobs__pv-techs">
                {sel.techs.map((t) => (
                  <span key={t} className={`djobs__tech${skills.includes(t) ? ' held' : ''}`}>
                    <TechIcon tech={t} size={18} />{t}
                  </span>
                ))}
              </div>
              <button className="djobs__pv-cta" onClick={() => window.open(sel.url, '_blank', 'noopener,noreferrer')}>
                상세 보기 <ArrowUpRight size={16} />
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ───────────────── 채용 시장 — 분석 보드 ───────────────── */
type ShareItem = { tech: string; count: number; share: number; owned: boolean }
export function DesktopMarket() {
  const navigate = useNavigate()
  const { activeResume } = useResumesState()
  const skills = activeResume?.skills ?? []
  const items = (marketData.skillShare['국내'].items as ShareItem[])
  const top = items.slice(0, 14)
  const maxShare = Math.max(...top.map((i) => i.share), 1)
  const coverage = calculateCoverage(skills, '국내')
  const quad: QuadItem[] = items.slice(0, 16).map((i) => ({
    tech: i.tech, demand: i.share, owned: skills.includes(i.tech), count: i.count,
  }))

  return (
    <div className="dpage dmkt">
      <header className="dpage__head">
        <h1 className="dpage__title">채용 시장</h1>
        <p className="dpage__desc">수요 · 기회 · 커버리지를 분석 보드로 (기준일 {marketData.asOf})</p>
      </header>

      <div className="dmkt__grid">
        <section className="dcard dmkt__quad">
          <SectionHeader title="기회 사분면" hint="수요 × 보유" />
          <OpportunityQuadrant items={quad} onPick={(t) => navigate(`/tech/${encodeURIComponent(t)}`)} />
        </section>

        <section className="dcard dmkt__cov">
          <span className="dcard__eyebrow">내 기술 커버리지 (국내 Top20)</span>
          <div className="dmkt__cov-num">{coverage}<span>%</span></div>
          <div className="dmkt__cov-bar"><i style={{ width: `${coverage}%` }} /></div>
          <p className="dmkt__cov-desc">상위 요구 기술 20개 중 보유 비율이에요.</p>
        </section>

        <section className="dcard dmkt__top">
          <SectionHeader title="가장 많이 요구되는 기술" hint="국내" />
          <div className="dmkt__bars">
            {top.map((i) => (
              <button key={i.tech} className="dmkt__bar" onClick={() => navigate(`/tech/${encodeURIComponent(i.tech)}`)}>
                <TechIcon tech={i.tech} size={22} />
                <span className="dmkt__bar-t">{i.tech}</span>
                <span className="dmkt__bar-track"><i className={skills.includes(i.tech) ? 'held' : ''} style={{ width: `${(i.share / maxShare) * 100}%` }} /></span>
                <span className="dmkt__bar-v">{i.share}%</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ───────────────── 지도 — 지도 + 리스트 ───────────────── */
type Pin = { id: string; lat: number; lng: number; company: string; title: string; district: string; matchPct: number; tier: string; logo: string }
export function DesktopMap() {
  const elRef = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<Pin | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const { activeResume } = useResumesState()

  useEffect(() => {
    let cancelled = false
    const resumeId = Number(activeResume?.id)
    recruitmentApi.map(Number.isInteger(resumeId) ? { resume_id: resumeId } : {})
      .then((result) => {
        if (cancelled) return
        setPins(result.pins.map((p) => ({ id: String(p.id), lat: p.lat, lng: p.lng, company: p.company ?? '회사명 미상', title: p.title, district: '', matchPct: Math.round(p.match_pct ?? 0), tier: '', logo: '' })))
      })
      .catch(() => { if (!cancelled) setPins([]) })
    return () => { cancelled = true }
  }, [activeResume?.id])

  useEffect(() => {
    if (!elRef.current) return
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView([37.55, 126.99], 11)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(map)
    pins.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 7, weight: 2, color: '#fff',
        fillColor: p.matchPct >= 50 ? '#2f61b8' : '#8fa0b8', fillOpacity: 0.9,
      }).addTo(map)
      marker.on('click', () => setSel(p))
    })
    return () => { map.remove() }
  }, [pins])

  return (
    <div className="dpage dmap">
      <header className="dpage__head">
        <h1 className="dpage__title">지도</h1>
        <p className="dpage__desc">국내 채용 공고를 지도와 리스트로 (핀 {pins.length}개)</p>
      </header>
      <div className="dmap__grid">
        <div className="dcard dmap__map">
          <div ref={elRef} className="dmap__leaflet" />
          <div className="dmap__legend">
            <span><i style={{ background: '#2f61b8' }} /> 매칭 50% 이상</span>
            <span><i style={{ background: '#8fa0b8' }} /> 50% 미만</span>
          </div>
        </div>
        <aside className="dcard dmap__list">
          <SectionHeader title={sel ? '선택한 공고' : '공고 리스트'} hint={sel ? sel.district : `${pins.length}개`} />
          {sel && (
            <button className="dmap__sel" onClick={() => setSel(null)}>
              <CompanyLogo logo={sel.logo} name={sel.company} size={40} radius={11} />
              <span className="djobs__row-b">
                <span className="djobs__row-t">{sel.title}</span>
                <span className="djobs__row-c">{sel.company} · {sel.district} · {sel.tier}</span>
              </span>
              <MiniScore pct={sel.matchPct} size={40} />
            </button>
          )}
          <div className="dmap__rows kit-scroll">
            {pins.slice(0, 30).map((p) => (
              <button key={p.id} className={`djobs__row${sel?.id === p.id ? ' on' : ''}`} onClick={() => setSel(p)}>
                <CompanyLogo logo={p.logo} name={p.company} size={34} radius={9} />
                <span className="djobs__row-b">
                  <span className="djobs__row-t">{p.title}</span>
                  <span className="djobs__row-c"><MapPin size={11} /> {p.company} · {p.district}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ───────────────── 마이 — 프로필 · 기술 · 설정 ───────────────── */
export function DesktopMy() {
  const navigate = useNavigate()
  const { user, isAuthed } = useAuth()
  const { activeResume } = useResumesState()
  const skills = activeResume?.skills ?? []
  const coverage = activeResume?.coveragePct ?? calculateCoverage(skills, '국내')
  const name = user?.nickname ?? '리버'
  const email = user?.email ?? 'bootcamp@example.com'
  const initial = (user ? (user.nickname || user.email) : 'RV').slice(0, 2).toUpperCase()

  return (
    <div className="dpage dmy">
      <header className="dpage__head">
        <h1 className="dpage__title">마이</h1>
        <p className="dpage__desc">이력서 · 내 기술 · 설정</p>
      </header>

      <div className="dmy__grid">
        <section className="dcard dmy__profile">
          <span className="dmy__avatar">{initial}</span>
          <div className="dmy__id">
            <span className="dmy__nm">{name}</span>
            <span className="dmy__em">{email}</span>
          </div>
          <button className="dmy__edit" onClick={() => navigate(isAuthed ? '/settings/account' : '/login')}>
            {isAuthed ? '내 정보 수정' : '로그인'}
          </button>
        </section>

        <section className="dcard">
          <SectionHeader title="활성 이력서" right={<button className="dpage__more" onClick={() => navigate('/resume/submit')}>편집</button>} />
          <button className="dmy__resume" onClick={() => navigate('/resume/submit')}>
            <span className="dmy__resume-ic"><FileText size={18} /></span>
            <span className="djobs__row-b">
              <span className="djobs__row-t">{activeResume?.title ?? '이력서'}</span>
              <span className="djobs__row-c">{activeResume?.position ?? '직무 미정'} · 보유 기술 {skills.length}개 · 커버리지 {coverage}%</span>
            </span>
          </button>
        </section>

        <section className="dcard">
          <SectionHeader title="보유 기술" hint={`${skills.length}개`} />
          <div className="dmy__skills">
            {skills.map((s) => <SkillChip key={s} tech={s} />)}
            {skills.length === 0 && <div className="dpage__empty">등록된 기술이 없어요.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}
