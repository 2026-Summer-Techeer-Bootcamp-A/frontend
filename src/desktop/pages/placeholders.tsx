import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, ArrowUpRight, FileText } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MiniScore, SectionHeader, SegmentedControl, SkillChip,
  OpportunityQuadrant, TechIcon, HeroStat, PreviewBadge, type QuadItem,
} from '../../career/kit'
import {
  TechCoNetworkGraph, TrendPropagationGraph, TechYearlyTrendChart,
  TechMoversBar, TierCompareChart, GenerationTrendChart,
} from '../../career/insights'
import { useWidgetData } from '../../career/useWidgetData'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage } from '../../career/state'
import { useAuth } from '../../career/authStore'
import marketData from '../../data/marketData.json'
import './placeholders.css'
import './market.css'

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
  const navigate = useNavigate()
  const { activeResume } = useResumesState()
  const skills = activeResume?.skills ?? []
  const [pool, setPool] = useState<'국내' | '국외'>('국내')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'match' | 'tier' | 'latest'>('match')
  const [selId, setSelId] = useState<string | null>(null)

  const postings = useMemo(() => getDynamicPostings(skills), [skills])
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
          {list.slice(0, 40).map((p) => (
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
              <button className="djobs__pv-cta" onClick={() => navigate(`/job/${encodeURIComponent(sel.id)}`)}>
                상세 보기 <ArrowUpRight size={16} />
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ───────────────── 채용 시장 — 시장 흐름 인텔리전스 보드 ─────────────────
   개인 진단(내 커버리지·매칭 등)은 대시보드(DesktopOverview) 담당이라 이 페이지에는
   두지 않는다. 여기는 순수 시장 신호: 수요 리더보드 · 공동출현 네트워크 ·
   트렌드 전파 · 연도별 추이 · 무버스 · 티어별 요구 · 세대별 변화 · 기회 사분면.
   재사용 컴포넌트(TechCoNetworkGraph 등)는 skills=[] 로 호출해 보유(owned) 오버레이를
   끄고 순수 시장뷰로만 그린다. */
type ShareItem = { tech: string; count: number; share: number; owned: boolean }
type CooccurrenceMap = typeof marketData.cooccurrence
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || ''
const NO_SKILLS: string[] = []

/** GET {API}/api/v1/stats/skill-share?pool=domestic&top_k=14 — 응답 형태가 다를 수 있어
 * 방어적으로 매핑한다. 실패/빈 응답이면 useWidgetData가 자동으로 mock으로 폴백. */
async function fetchSkillShareLive(): Promise<ShareItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/stats/skill-share?pool=domestic&top_k=14`)
  if (!res.ok) throw new Error(`skill-share ${res.status}`)
  const json = await res.json()
  const rows: unknown[] = Array.isArray(json) ? json : (json.items ?? [])
  return rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      tech: String(row.tech ?? row.name ?? ''),
      count: Number(row.count ?? row.n ?? 0),
      share: Number(row.share ?? row.pct ?? 0),
      owned: false,
    }
  })
}

/** GET {API}/api/v1/stats/cooccurrence?pool=domestic&top_k=40 — 훅 배선만 마련해둔다.
 * TechCoNetworkGraph는 재사용 원칙상 pearl/n.json 기반 노드/엣지를 그대로 쓰므로
 * 이 값은 아직 그래프에 주입되지 않는다(§리포트 우려사항 참고). */
async function fetchCooccurrenceLive(): Promise<CooccurrenceMap> {
  const res = await fetch(`${API_BASE}/api/v1/stats/cooccurrence?pool=domestic&top_k=40`)
  if (!res.ok) throw new Error(`cooccurrence ${res.status}`)
  return res.json()
}

export function DesktopMarket() {
  const navigate = useNavigate()
  const domestic = marketData.skillShare['국내'] as { asOf: string; N: number; items: ShareItem[] }
  const top14Mock = useMemo(() => domestic.items.slice(0, 14), [])

  const leaderboard = useWidgetData(fetchSkillShareLive, top14Mock)
  useWidgetData(fetchCooccurrenceLive, marketData.cooccurrence) // 배선 준비 — 아래 §우려사항

  const top = leaderboard.value
  const leader = top[0]
  const maxShare = Math.max(...top.map((i) => i.share), 1)

  const quad: QuadItem[] = useMemo(() => domestic.items.slice(0, 16).map((i) => ({
    tech: i.tech, demand: i.share, owned: false, count: i.count,
  })), [])

  return (
    <div className="dpage dmkt2">
      <header className="dmkt2__head">
        <h1 className="dmkt2__title">채용 시장</h1>
        <div className="dmkt2__sub">국내 채용공고 {domestic.N.toLocaleString()}건 기준 시장 흐름 · 기준일 {domestic.asOf}</div>
      </header>

      <div className="dmkt2__grid">
        {/* 1. 수요 리더보드 — 검정 히어로 */}
        <section className="dmkt2__cell dmkt2__cell--hero">
          <HeroStat
            eyebrow="수요 리더보드 1위"
            value={leader?.share ?? 0}
            unit="%"
            caption={leader && <>가장 많이 요구되는 기술은 <b>{leader.tech}</b> · 공고 <b>{leader.count.toLocaleString()}건</b></>}
            footChips={leaderboard.source === 'mock' && <PreviewBadge />}
          />
        </section>

        <section className="dcard dmkt2__cell dmkt2__cell--bars">
          <SectionHeader title="상위 요구 기술 Top14" hint="국내" />
          <div className="dmkt2__bars">
            {top.map((i) => (
              <button key={i.tech} className="dmkt2__bar" onClick={() => navigate(`/tech/${encodeURIComponent(i.tech)}`)}>
                <TechIcon tech={i.tech} size={20} />
                <span className="dmkt2__bar-t">{i.tech}</span>
                <span className="dmkt2__bar-track"><i style={{ width: `${(i.share / maxShare) * 100}%` }} /></span>
                <span className="dmkt2__bar-v">{i.share}%</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. 기술 공동출현 네트워크 */}
        <section className="dcard dmkt2__cell dmkt2__cell--wide">
          <SectionHeader title="기술 공동출현 네트워크" hint="함께 요구되는 기술 · force graph" />
          <TechCoNetworkGraph skills={NO_SKILLS} />
        </section>

        {/* 3. 트렌드 전파 네트워크 */}
        <section className="dcard dmkt2__cell dmkt2__cell--wide">
          <SectionHeader title="트렌드 전파 네트워크" hint="선행 기술 → 후행 기술 시차" />
          <TrendPropagationGraph />
        </section>

        {/* 4. 연도별 점유율 추이 */}
        <section className="dcard dmkt2__cell">
          <SectionHeader title="연도별 점유율 추이" hint="국내 · 단일 소스" />
          <TechYearlyTrendChart skills={NO_SKILLS} />
        </section>

        {/* 5. 급상승 · 급감 */}
        <section className="dcard dmkt2__cell">
          <SectionHeader title="급상승 · 급감 Top" />
          <TechMoversBar />
        </section>

        {/* 6. 기업 규모별 요구 차이 */}
        <section className="dcard dmkt2__cell">
          <SectionHeader title="기업 규모별 요구 차이" hint="대기업 · 중견 · 중소" />
          <TierCompareChart />
        </section>

        {/* 7. 레거시 → 신진 스택 변화 */}
        <section className="dcard dmkt2__cell">
          <SectionHeader title="레거시 → 신진 스택 변화" hint="설립 세대별" />
          <GenerationTrendChart skills={NO_SKILLS} />
        </section>

        {/* 8. 기회 사분면 — 순수 수요 × 공고량 */}
        <section className="dcard dmkt2__cell">
          <SectionHeader title="기회 사분면" hint="수요 × 공고량" />
          <OpportunityQuadrant items={quad} onPick={(t) => navigate(`/tech/${encodeURIComponent(t)}`)} />
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
  const pins = marketData.map.pins as Pin[]

  useEffect(() => {
    if (!elRef.current) return
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView([37.55, 126.99], 11)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(map)
    pins.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 7, weight: 2, color: '#fff',
        fillColor: p.matchPct >= 50 ? '#0b0b0c' : '#a1a1aa', fillOpacity: 0.9,
      }).addTo(map)
      marker.on('click', () => setSel(p))
    })
    return () => { map.remove() }
  }, [pins])

  return (
    <div className="dpage dmap">
      <div className="dmap__grid">
        <div className="dcard dmap__map">
          <div ref={elRef} className="dmap__leaflet" />
          <div className="dmap__legend">
            <span><i style={{ background: '#0b0b0c' }} /> 매칭 50% 이상</span>
            <span><i style={{ background: '#a1a1aa' }} /> 50% 미만</span>
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
