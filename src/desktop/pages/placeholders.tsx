import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, ArrowUpRight, FileText } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MiniScore, SectionHeader, SegmentedControl, SkillChip,
  TechIcon, HeroStat, PreviewBadge,
} from '../../career/kit'
import {
  TechCoNetworkGraph, TrendPropagationGraph, TechYearlyTrendChart,
  TechMoversBar, TierCompareChart, GenerationTrendChart,
} from '../../career/insights'
import { useWidgetData } from '../../career/useWidgetData'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from '../../career/state'
import { useAuth } from '../../career/authStore'
import marketData from '../../data/marketData.json'
import data from '../../data/careerData.json'
import './placeholders.css'
import './market.css'
import './jobs.css'

/* 데스크톱 페이지 — 모바일 단일컬럼과 분리된 PC 레이아웃 틀.
   대시보드(홈)는 DesktopOverview.tsx가 담당. 여기는 공고·시장·지도·마이. */

const TIER_RANK: Record<string, number> = { 대기업: 0, 중견: 1, 중소: 2 }
const tierRank = (t: string | null) => (t && t in TIER_RANK ? TIER_RANK[t] : 3)
function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

/* ───────────────── 검색(구 맞춤 공고) — 필터 전면 + 이력서 자동주입 ─────────────────
   postings에는 "직무"에 해당하는 별도 필드가 없다(careerData.json 확인 완료 — title/techs/
   region/tier/careerMin·Max/pool 뿐). title에서 직무를 유추하면 데이터에 없는 사실을
   만들어내는 셈이라, 브리핑 지시대로 직무 필터는 스킵하고 리포트 우려사항에 남긴다. */
const TIERS = ['대기업', '중견', '중소'] as const
const TOP_TECHS = data.topTechs.slice(0, 20).map((t) => t.tech)
const JOBS_AS_OF = data.meta.asOf
const CAREER_PRESETS: { key: string; label: string; min: number | null; max: number | null }[] = [
  { key: 'all', label: '전체', min: null, max: null },
  { key: 'new', label: '신입', min: 0, max: 0 },
  { key: '1-3', label: '1-3년', min: 1, max: 3 },
  { key: '3-5', label: '3-5년', min: 3, max: 5 },
  { key: '5+', label: '5년+', min: 5, max: null },
]

/* ───────────────── 맞춤 공고 — 마스터-디테일 ───────────────── */
export function DesktopJobs() {
  const navigate = useNavigate()
  const { resumes, activeId, activeResume, selectResume } = useResumesState()
  const skills = activeResume?.skills ?? []

  const [pool, setPool] = useState<'국내' | '국외'>('국내')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'match' | 'tier' | 'latest'>('match')
  const [selId, setSelId] = useState<string | null>(null)
  const [techFilter, setTechFilter] = useState<Set<string>>(new Set())
  const [region, setRegion] = useState('')
  const [careerMin, setCareerMin] = useState<number | null>(null)
  const [careerMax, setCareerMax] = useState<number | null>(null)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  const [tierFilter, setTierFilter] = useState<Set<string>>(new Set(TIERS))

  // 이력서 셀렉터 → 필터 자동주입(헤드라인 기능). 이력서를 "선택"할 때 1회만 초기값을
  // 채워 넣고, 그 뒤로는 사용자가 자유롭게 덮어쓸 수 있어야 하므로 activeId(선택 이벤트)에만
  // 반응한다 — activeResume 객체 참조가 다른 이유(예: 다른 화면에서 resume-state-change)로
  // 바뀌어도 여기서 재실행되어 사용자가 손댄 필터를 되돌리면 안 된다.
  useEffect(() => {
    if (!activeResume) return
    setTechFilter(new Set(activeResume.skills))
    setCareerMin(activeResume.careerMin)
    setCareerMax(activeResume.careerMax)
    if (activeResume.pool) setPool(activeResume.pool)
    // 직무(position) 필터는 위 사유로 존재하지 않아 자동주입 대상에서도 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const postings = useMemo(() => getDynamicPostings(skills), [skills])
  const byPool = useMemo(() => postings.filter((p) => p.pool === pool), [postings, pool])
  const regions = useMemo(
    () => [...new Set(byPool.map((p) => p.region).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b, 'ko')),
    [byPool],
  )

  const list = useMemo(() => {
    let arr = byPool
    const s = q.trim().toLowerCase()
    if (s) arr = arr.filter((p) => (p.company + ' ' + p.title).toLowerCase().includes(s))
    if (techFilter.size > 0) arr = arr.filter((p) => [...techFilter].every((t) => p.techs.includes(t)))
    if (region) arr = arr.filter((p) => p.region === region)
    if (careerMin != null) arr = arr.filter((p) => (p.careerMax ?? Infinity) >= careerMin)
    if (careerMax != null) arr = arr.filter((p) => (p.careerMin ?? 0) <= careerMax)
    if (deadlineOnly) {
      arr = arr.filter((p) => {
        const dd = ddayInfo(p.closeDate || '', JOBS_AS_OF)
        return dd != null && dd.d <= 7
      })
    }
    arr = arr.filter((p) => tierFilter.has(p.tier || '중소'))
    return [...arr].sort((a, b) =>
      sort === 'tier' ? tierRank(a.tier) - tierRank(b.tier) || b.matchPct - a.matchPct
        : sort === 'latest' ? (b.postDate || '').localeCompare(a.postDate || '')
          : b.matchPct - a.matchPct)
  }, [byPool, q, techFilter, region, careerMin, careerMax, deadlineOnly, tierFilter, sort])

  const sel = list.find((p) => p.id === selId) ?? list[0]
  const activePresetKey = CAREER_PRESETS.find((c) => c.min === careerMin && c.max === careerMax)?.key ?? null

  const toggleTech = (t: string) => setTechFilter((s) => {
    const next = new Set(s)
    if (next.has(t)) next.delete(t); else next.add(t)
    return next
  })
  const toggleTier = (t: string) => setTierFilter((s) => {
    const next = new Set(s)
    if (next.has(t)) next.delete(t); else next.add(t)
    return next
  })

  return (
    <div className="dpage djobs">
      <div className="djobs__grid">
        {/* 필터 */}
        <aside className="dcard djobs__filters">
          {resumes.length === 0 ? (
            <div className="djobs__resume-cta">
              <span>이력서를 등록하면 필터가 자동으로 채워져요</span>
              <button onClick={() => navigate('/resume/submit')}>이력서 등록하기</button>
            </div>
          ) : (
            <div className="djobs__fld">
              <span className="djobs__fld-l">이력서로 자동 채우기</span>
              <div className="djobs__chiprow">
                {resumes.map((r, i) => (
                  <button
                    key={r.id}
                    className={activeId === r.id ? 'on' : ''}
                    onClick={() => selectResume(r.id)}
                  >
                    이력서 {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            <span className="djobs__fld-l">기술 스택</span>
            <div className="djobs__chiprow">
              {TOP_TECHS.map((t) => (
                <button key={t} className={techFilter.has(t) ? 'on' : ''} onClick={() => toggleTech(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="djobs__fld">
            <span className="djobs__fld-l">지역</span>
            <select className="djobs__select" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">전체</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="djobs__fld">
            <span className="djobs__fld-l">경력</span>
            <div className="djobs__chiprow">
              {CAREER_PRESETS.map((c) => (
                <button
                  key={c.key}
                  className={activePresetKey === c.key ? 'on' : ''}
                  onClick={() => { setCareerMin(c.min); setCareerMax(c.max) }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="djobs__fld">
            <span className="djobs__fld-l">기업 규모</span>
            <div className="djobs__chiprow">
              {TIERS.map((t) => (
                <button key={t} className={tierFilter.has(t) ? 'on' : ''} onClick={() => toggleTier(t)}>{t}</button>
              ))}
            </div>
          </div>

          <label className="djobs__toggle">
            <input type="checkbox" checked={deadlineOnly} onChange={(e) => setDeadlineOnly(e.target.checked)} />
            마감 임박(7일 이내)만
          </label>

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
          {list.length === 0 && <div className="dpage__empty">조건에 맞는 공고가 없어요.</div>}
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

/** 기회 사분면(OpportunityQuadrant)은 보유/미보유 이분법 위젯이라, 시장 페이지처럼
 * 전 항목이 owned:false인 맥락에서 쓰면 "보유" 밴드가 항상 텅 비어 버그처럼 보인다.
 * 여기서는 그 대신 수요(점유율) × 빈도(공고량) 두 실수치 축을 그대로 흩뿌리는
 * 순수 시장 산점도를 쓴다 — 빈 밴드 자체가 없다. */
function MarketScatter({ items }: { items: { tech: string; share: number; count: number }[] }) {
  const W = 320, H = 200
  const shares = items.map((i) => i.share)
  const counts = items.map((i) => i.count)
  const maxShare = Math.max(...shares, 1)
  const minShare = Math.min(...shares, 0)
  const maxCount = Math.max(...counts, 1)
  const minCount = Math.min(...counts, 0)
  const laid = items.map((it) => {
    const nx = maxShare === minShare ? 0.5 : (it.share - minShare) / (maxShare - minShare)
    const ny = maxCount === minCount ? 0.5 : (it.count - minCount) / (maxCount - minCount)
    const isTop = it.share === maxShare
    const isPeak = it.count === maxCount && !isTop
    return {
      ...it,
      x: 20 + nx * (W - 40),
      y: H - 18 - ny * (H - 34),
      isTop, isPeak,
    }
  })
  return (
    <div className="dmkt2__scatter">
      <svg viewBox={`0 0 ${W} ${H}`} className="dmkt2__scatter-svg">
        <line x1="16" y1={H - 18} x2={W - 8} y2={H - 18} stroke="#e7e7ea" strokeWidth="1" />
        <line x1="16" y1="6" x2="16" y2={H - 18} stroke="#e7e7ea" strokeWidth="1" />
        <text x={W - 8} y={H - 6} textAnchor="end" className="dmkt2__scatter-ax">수요 →</text>
        <text x="16" y="15" className="dmkt2__scatter-ax">공고량 ↑</text>
        {laid.map((p) => (
          <g key={p.tech}>
            <circle
              cx={p.x} cy={p.y} r={p.isTop || p.isPeak ? 6.5 : 4.5}
              fill={p.isTop ? '#1f9d57' : p.isPeak ? '#d9822b' : 'var(--c-accent)'}
              fillOpacity={p.isTop || p.isPeak ? 0.95 : 0.45}
            />
            {(p.isTop || p.isPeak) && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="dmkt2__scatter-lbl">{p.tech}</text>
            )}
          </g>
        ))}
      </svg>
      <div className="dmkt2__scatter-legend">
        <span><i style={{ background: '#1f9d57' }} />최고 수요</span>
        <span><i style={{ background: '#d9822b' }} />최다 공고</span>
        <span><i style={{ background: 'var(--c-accent)', opacity: 0.45 }} />그 외 기술</span>
      </div>
    </div>
  )
}

function SkillShareSparkline({ items }: { items: ShareItem[] }) {
  const sparkItems = items.slice(1, 6)
  const maxShare = Math.max(...sparkItems.map((i) => i.share), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '5px', height: '48px', padding: '8px 0' }}>
      {sparkItems.map((item, idx) => (
        <div
          key={item.tech}
          style={{
            width: '8px',
            height: `${20 + (item.share / maxShare) * 28}px`,
            borderRadius: '2px',
            background: idx === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
            flexShrink: 0,
          }}
        />
      ))}
      <div
        style={{
          width: '10px',
          height: `${20 + ((items[0]?.share ?? 0) / maxShare) * 28}px`,
          borderRadius: '2px',
          background: '#1f9d57',
          flexShrink: 0,
        }}
      />
    </div>
  )
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

  const scatterItems = useMemo(() => domestic.items.slice(0, 16).map((i) => ({
    tech: i.tech, share: i.share, count: i.count,
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
            chart={<SkillShareSparkline items={top} />}
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
        <section className="dcard dmkt2__cell dmkt2__cell--net">
          <SectionHeader title="기술 공동출현 네트워크" hint="함께 요구되는 기술 · force graph" />
          <TechCoNetworkGraph skills={NO_SKILLS} />
        </section>

        {/* 3. 트렌드 전파 네트워크 */}
        <section className="dcard dmkt2__cell dmkt2__cell--prop">
          <SectionHeader title="트렌드 전파 네트워크" hint="선행 기술 → 후행 기술 시차" />
          <TrendPropagationGraph />
        </section>

        {/* 4. 연도별 점유율 추이 */}
        <section className="dcard dmkt2__cell dmkt2__cell--third">
          <SectionHeader title="연도별 점유율 추이" hint="국내 · 단일 소스" />
          <TechYearlyTrendChart skills={NO_SKILLS} />
        </section>

        {/* 5. 급상승 · 급감 */}
        <section className="dcard dmkt2__cell dmkt2__cell--third">
          <SectionHeader title="급상승 · 급감 Top" />
          <TechMoversBar />
        </section>

        {/* 6. 기업 규모별 요구 차이 */}
        <section className="dcard dmkt2__cell dmkt2__cell--third">
          <SectionHeader title="기업 규모별 요구 차이" hint="대기업 · 중견 · 중소" />
          <TierCompareChart />
        </section>

        {/* 7. 레거시 → 신진 스택 변화 */}
        <section className="dcard dmkt2__cell dmkt2__cell--half">
          <SectionHeader title="레거시 → 신진 스택 변화" hint="설립 세대별" />
          <GenerationTrendChart skills={NO_SKILLS} />
        </section>

        {/* 8. 수요 × 빈도 분포 — 순수 시장 산점도(보유 개념 없음) */}
        <section className="dcard dmkt2__cell dmkt2__cell--half">
          <SectionHeader title="수요 × 빈도 분포" hint="국내 · 상위 16개 기술" />
          <MarketScatter items={scatterItems} />
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
