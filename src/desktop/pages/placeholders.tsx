import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, ArrowUpRight, FileText } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MiniScore, SectionHeader, SegmentedControl, SkillChip,
  TechIcon, HeroStat, PreviewBadge, WidgetSettingsMenu,
} from '../../career/kit'
import {
  TechCoNetworkGraph, TrendPropagationGraph, TechYearlyTrendChart,
  TechMoversBar, TierCompareChart, GenerationTrendChart,
  getNetworkTopConnections, getPropagationTopLeaders,
} from '../../career/insights'
import { useWidgetData } from '../../career/useWidgetData'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, ddayInfo } from '../../career/state'
import { useAuth } from '../../career/authStore'
import { useDashboardConfig, isWidgetHidden, getWidgetSize } from '../../career/dashboardConfig'
import { MARKET_WIDGETS } from '../../career/widgetCatalog'
import marketData from '../../data/marketData.json'
import data from '../../data/careerData.json'
import './placeholders.css'
import './market.css'
import './jobs.css'
import '../../career/widgetGrid.css'

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
   region/tier/careerMin·Max/pool 뿐). title/techs로부터 결정론적 키워드 매칭으로 직무를
   유추한다(derivePosition) — LLM 추론이 아니라 고정 규칙이라 채용시장 통계와 항상 일관된
   결과를 낸다. */
const POSITION_CATS = ['백엔드', '프론트엔드', '풀스택', '데이터/AI', '모바일', '인프라/DevOps', '기획/PM', '디자인', 'QA', '기타'] as const
type PositionCat = typeof POSITION_CATS[number]

function derivePosition(title: string, techs: string[]): PositionCat {
  const t = title.toLowerCase()
  const hasAny = (words: string[]) => words.some((w) => t.includes(w))
  const techHas = (words: string[]) => techs.some((tc) => words.includes(tc))

  const isBackend = hasAny(['백엔드', 'backend', 'server', '서버'])
  const isFrontend = hasAny(['프론트', 'frontend'])
  const isFullstack = hasAny(['풀스택', 'fullstack', 'full-stack'])
  const isData = hasAny(['데이터', 'data engineer', 'data scientist', 'ml ', 'ai ', '머신러닝', '인공지능', 'llm'])
  const isMobile = hasAny(['ios', 'android', '모바일', 'flutter', 'react native'])
  const isInfra = hasAny(['devops', 'infra', '인프라', 'sre', 'platform engineer', '플랫폼'])
  const isPM = hasAny(['기획', 'pm ', 'product manager', '프로덕트'])
  const isDesign = hasAny(['디자이너', 'design', 'ux', 'ui/ux'])
  const isQA = hasAny(['qa', '품질', 'test engineer'])

  if (isFullstack || (isBackend && isFrontend)) return '풀스택'
  if (isBackend) return '백엔드'
  if (isFrontend) return '프론트엔드'
  if (isData) return '데이터/AI'
  if (isMobile) return '모바일'
  if (isInfra) return '인프라/DevOps'
  if (isPM) return '기획/PM'
  if (isDesign) return '디자인'
  if (isQA) return 'QA'
  if (techHas(['React', 'Vue', 'Next.js', 'TypeScript', 'HTML', 'CSS'])) return '프론트엔드'
  if (techHas(['Spring', 'Django', 'FastAPI', 'Node.js', 'Java', 'Kotlin', 'Go'])) return '백엔드'
  if (techHas(['Python', 'TensorFlow', 'PyTorch', 'Pandas'])) return '데이터/AI'
  if (techHas(['Docker', 'Kubernetes', 'Terraform', 'AWS', 'GCP', 'Azure'])) return '인프라/DevOps'
  return '기타'
}

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
  const [positionFilter, setPositionFilter] = useState<PositionCat | ''>('')
  const [pvTab, setPvTab] = useState<'desc' | 'company'>('desc')

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
    if (techFilter.size > 0) arr = arr.filter((p) => [...techFilter].some((t) => p.techs.includes(t)))
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
    if (positionFilter) arr = arr.filter((p) => derivePosition(p.title, p.techs) === positionFilter)
    return [...arr].sort((a, b) =>
      sort === 'tier' ? tierRank(a.tier) - tierRank(b.tier) || b.matchPct - a.matchPct
        : sort === 'latest' ? (b.postDate || '').localeCompare(a.postDate || '')
          : b.matchPct - a.matchPct)
  }, [byPool, q, techFilter, region, careerMin, careerMax, deadlineOnly, tierFilter, positionFilter, sort])

  const sel = list.find((p) => p.id === selId) ?? list[0]
  const activePresetKey = CAREER_PRESETS.find((c) => c.min === careerMin && c.max === careerMax)?.key ?? null

  useEffect(() => setPvTab('desc'), [sel?.id])

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
            <span className="djobs__fld-l">직무</span>
            <select className="djobs__select" value={positionFilter} onChange={(e) => setPositionFilter(e.target.value as PositionCat | '')}>
              <option value="">전체</option>
              {POSITION_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <div className="djobs__pv-head-r">
                  <MiniScore pct={sel.matchPct} size={54} />
                  <span
                    className="djobs__pv-full"
                    title="전체 화면에서 보기"
                    onClick={() => navigate(`/job/${encodeURIComponent(sel.id)}`)}
                  >
                    <ArrowUpRight size={15} />
                  </span>
                </div>
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

              <div className="djobs__pv-tabs">
                <span className={`djobs__pv-tab${pvTab === 'desc' ? ' on' : ''}`} onClick={() => setPvTab('desc')}>상세 공고</span>
                <span className={`djobs__pv-tab${pvTab === 'company' ? ' on' : ''}`} onClick={() => setPvTab('company')}>회사 정보</span>
              </div>
              <div className="djobs__pv-body">
                {pvTab === 'desc' ? (
                  <>
                    {sel.descSections && sel.descSections.length ? (
                      sel.descSections.map((s, i) => (
                        <div key={i}>
                          <div className="djobs__pv-dsec">{s.title}</div>
                          <p style={{ whiteSpace: 'pre-line' }}>{s.text}</p>
                        </div>
                      ))
                    ) : (
                      <p>이 공고의 요구 기술 스택을 기반으로 매칭도를 계산했어요.</p>
                    )}
                    <div className="djobs__pv-dsec">요구 기술</div>
                    <p>{sel.techs.join(' · ')}</p>
                  </>
                ) : (() => {
                  const ci = sel.companyInfo ?? { industry: '', homepage: '', established: '', location: '', tags: [] as string[] }
                  return (
                    <>
                      <div className="djobs__pv-kv"><span>회사</span><b>{sel.company}</b></div>
                      {ci.industry && <div className="djobs__pv-kv"><span>업종</span><b>{ci.industry}</b></div>}
                      {ci.established && <div className="djobs__pv-kv"><span>설립</span><b>{ci.established}</b></div>}
                      <div className="djobs__pv-kv"><span>지역</span><b>{ci.location || sel.region || 'Remote'}</b></div>
                      <div className="djobs__pv-kv"><span>채용 풀</span><b>{sel.pool}</b></div>
                      {ci.homepage && (
                        <div className="djobs__pv-kv">
                          <span>홈페이지</span>
                          <a href={ci.homepage} target="_blank" rel="noreferrer" className="djobs__pv-link">바로가기 ↗</a>
                        </div>
                      )}
                      {ci.tags && ci.tags.length > 0 && (
                        <div className="djobs__pv-techs" style={{ marginTop: 12 }}>
                          {ci.tags.map((tg) => (
                            <span key={tg} className="djobs__tech held">{tg}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
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

/** 기업 규모(대기업/중견/중소) 분포 도넛 — 모노톤 3단계(진한 그레이 → 연한 그레이). */
function TierDonutChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const segments = [
    { key: '대기업', color: '#18181b' },
    { key: '중견', color: '#71717a' },
    { key: '중소', color: '#d4d4d8' },
  ]
  const r = 34
  const cx = 42
  const cy = 42
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="dmkt2__donut">
      <svg viewBox="0 0 84 84" width={84} height={84}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f6" strokeWidth={12} />
        {segments.map((seg) => {
          const value = counts[seg.key] ?? 0
          const frac = total ? value / total : 0
          const dash = frac * circumference
          const el = (
            <circle
              key={seg.key} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={12}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          )
          offset += dash
          return el
        })}
      </svg>
      <div className="dmkt2__donut-legend">
        {segments.map((seg) => (
          <span key={seg.key}><i style={{ background: seg.color }} />{seg.key} {(counts[seg.key] ?? 0).toLocaleString()}</span>
        ))}
      </div>
    </div>
  )
}

export function DesktopMarket() {
  const navigate = useNavigate()
  useDashboardConfig() // 위젯 표시/숨김 변경 시 리렌더 트리거
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

  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false)

  const widgetSize = (id: string) => {
    const item = MARKET_WIDGETS.find((w) => w.id === id)!
    return getWidgetSize('market', id, item.defaultSize)
  }

  const hotCompanies = useMemo(() => {
    const cutoff = new Date(data.meta.asOf)
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const domestic30 = (data.postings as { pool: string; company: string; postDate: string }[])
      .filter((p) => p.pool === '국내' && p.postDate >= cutoffStr)
    const counts: Record<string, number> = {}
    domestic30.forEach((p) => { counts[p.company] = (counts[p.company] ?? 0) + 1 })
    return Object.entries(counts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [])
  const maxHot = Math.max(...hotCompanies.map((c) => c.count), 1)

  const regionDensity = useMemo(() => {
    const domesticPostings = (data.postings as { pool: string; district: string }[]).filter((p) => p.pool === '국내')
    const counts: Record<string, number> = {}
    domesticPostings.forEach((p) => { if (p.district) counts[p.district] = (counts[p.district] ?? 0) + 1 })
    return Object.entries(counts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [])
  const maxRegion = Math.max(...regionDensity.map((r) => r.count), 1)

  const tierDonut = useMemo(() => {
    const domesticPostings = (data.postings as { pool: string; tier: string | null }[]).filter((p) => p.pool === '국내')
    const counts: Record<string, number> = { 대기업: 0, 중견: 0, 중소: 0 }
    domesticPostings.forEach((p) => { if (p.tier && p.tier in counts) counts[p.tier] += 1 })
    const total = counts['대기업'] + counts['중견'] + counts['중소']
    return { counts, total }
  }, [])

  const leaderboardSize = widgetSize('leaderboard')
  const leaderboardShowAll = leaderboardSize === '2x2' || leaderboardExpanded
  const leaderboardVisible = leaderboardShowAll ? top : top.slice(0, 8)

  return (
    <div className="dpage dmkt2">
      <header className="dmkt2__head">
        <div className="dmkt2__head-l">
          <h1 className="dmkt2__title">채용 시장</h1>
          <div className="dmkt2__sub">국내 채용공고 {domestic.N.toLocaleString()}건 기준 시장 흐름 · 기준일 {domestic.asOf} · 개인화된 내 진단은 대시보드에서 확인하세요</div>
        </div>
        <WidgetSettingsMenu section="market" items={MARKET_WIDGETS} />
      </header>

      <div className="wgrid">
        {/* 1. 수요 리더보드 — 검정 히어로 */}
        {!isWidgetHidden('market', 'hero-demand') && (
          <section className={`wcell wcell--${widgetSize('hero-demand')}`}>
            <HeroStat
              eyebrow="수요 리더보드 1위"
              value={leader?.share ?? 0}
              unit="%"
              chart={<SkillShareSparkline items={top} />}
              caption={leader && <>가장 많이 요구되는 기술은 <b>{leader.tech}</b> · 공고 <b>{leader.count.toLocaleString()}건</b></>}
              footChips={leaderboard.source === 'mock' && <PreviewBadge />}
            />
          </section>
        )}

        {!isWidgetHidden('market', 'leaderboard') && (
          <section className={`dcard wcell wcell--${leaderboardSize}`}>
            <SectionHeader title="상위 요구 기술 Top14" hint="국내" />
            <div className="dmkt2__bars">
              {leaderboardVisible.map((i) => (
                <button key={i.tech} className="dmkt2__bar" onClick={() => navigate(`/tech/${encodeURIComponent(i.tech)}`)}>
                  <TechIcon tech={i.tech} size={20} />
                  <span className="dmkt2__bar-t">{i.tech}</span>
                  <span className="dmkt2__bar-track"><i style={{ width: `${(i.share / maxShare) * 100}%` }} /></span>
                  <span className="dmkt2__bar-v">{i.share}%</span>
                </button>
              ))}
            </div>
            {leaderboardSize !== '2x2' && top.length > 8 && (
              <button className="dmkt2__more" onClick={() => setLeaderboardExpanded((v) => !v)}>
                {leaderboardExpanded ? '접기' : `더 보기 (${top.length - 8})`}
              </button>
            )}
          </section>
        )}

        {/* 2. 기술 공동출현 네트워크 */}
        {!isWidgetHidden('market', 'network') && (
          <section className="dcard wcell wcell--2x2 dmkt2__netcell">
            <SectionHeader title="기술 공동출현 네트워크" hint="함께 요구되는 기술 · force graph" />
            <div className="dmkt2__netsplit">
              <div className="dmkt2__netgraph"><TechCoNetworkGraph skills={NO_SKILLS} /></div>
              <aside className="dmkt2__netsummary">
                <div className="dmkt2__netsummary-t">최다 연결 기술 Top 5</div>
                {getNetworkTopConnections(5).map((it, i) => (
                  <div key={it.tech} className="dmkt2__netsummary-row">
                    <span className="dmkt2__netsummary-rank">{i + 1}</span>
                    <span className="dmkt2__netsummary-tech">{it.tech}</span>
                    <span className="dmkt2__netsummary-n">{it.n.toLocaleString()}건</span>
                  </div>
                ))}
              </aside>
            </div>
          </section>
        )}

        {/* 3. 트렌드 전파 네트워크 */}
        {!isWidgetHidden('market', 'propagation') && (
          <section className="dcard wcell wcell--2x2 dmkt2__netcell">
            <SectionHeader title="트렌드 전파 네트워크" hint="선행 기술 → 후행 기술 시차" />
            <div className="dmkt2__netsplit">
              <div className="dmkt2__netgraph"><TrendPropagationGraph /></div>
              <aside className="dmkt2__netsummary">
                <div className="dmkt2__netsummary-t">선도 기술 Top 5</div>
                {getPropagationTopLeaders(5).map((it, i) => (
                  <div key={it.tech} className="dmkt2__netsummary-row">
                    <span className="dmkt2__netsummary-rank">{i + 1}</span>
                    <span className="dmkt2__netsummary-tech">{it.tech}</span>
                    <span className="dmkt2__netsummary-n">{it.count.toLocaleString()}건 파급</span>
                  </div>
                ))}
              </aside>
            </div>
          </section>
        )}

        {/* 4. 연도별 점유율 추이 */}
        {!isWidgetHidden('market', 'yearly-trend') && (
          <section className={`dcard wcell wcell--${widgetSize('yearly-trend')}`}>
            <SectionHeader title="연도별 점유율 추이" hint="국내 · 단일 소스" />
            <TechYearlyTrendChart skills={NO_SKILLS} />
          </section>
        )}

        {/* 5. 급상승 · 급감 */}
        {!isWidgetHidden('market', 'movers') && (
          <section className={`dcard wcell wcell--${widgetSize('movers')}`}>
            <SectionHeader title="급상승 · 급감 Top" />
            <TechMoversBar />
          </section>
        )}

        {/* 6. 기업 규모별 요구 차이 */}
        {!isWidgetHidden('market', 'tier-compare') && (
          <section className={`dcard wcell wcell--${widgetSize('tier-compare')}`}>
            <SectionHeader title="기업 규모별 요구 차이" hint="대기업 · 중견 · 중소" />
            <TierCompareChart />
          </section>
        )}

        {/* 7. 레거시 → 신진 스택 변화 */}
        {!isWidgetHidden('market', 'generation-trend') && (
          <section className={`dcard wcell wcell--${widgetSize('generation-trend')}`}>
            <SectionHeader title="레거시 → 신진 스택 변화" hint="설립 세대별" />
            <GenerationTrendChart skills={NO_SKILLS} />
          </section>
        )}

        {/* 8. 수요 × 빈도 분포 — 순수 시장 산점도(보유 개념 없음) */}
        {!isWidgetHidden('market', 'scatter') && (
          <section className={`dcard wcell wcell--${widgetSize('scatter')}`}>
            <SectionHeader title="수요 × 빈도 분포" hint="국내 · 상위 16개 기술" />
            <MarketScatter items={scatterItems} />
          </section>
        )}

        {/* 9. 이번 달 활발 기업 */}
        {!isWidgetHidden('market', 'hot-companies') && (
          <section className={`dcard wcell wcell--${widgetSize('hot-companies')}`}>
            <SectionHeader title="이번 달 활발 기업" hint="최근 30일 · 신규 공고 수" />
            <div className="dmkt2__bars">
              {hotCompanies.map((c) => (
                <div key={c.company} className="dmkt2__bar">
                  <span className="dmkt2__bar-t">{c.company}</span>
                  <span className="dmkt2__bar-track"><i style={{ width: `${(c.count / maxHot) * 100}%` }} /></span>
                  <span className="dmkt2__bar-v">{c.count}건</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 10. 지역별 공고 밀도 */}
        {!isWidgetHidden('market', 'region-density') && (
          <section className={`dcard wcell wcell--${widgetSize('region-density')}`}>
            <SectionHeader title="지역별 공고 밀도" hint="구 단위 · 국내" />
            <div className="dmkt2__bars">
              {regionDensity.map((r) => (
                <div key={r.district} className="dmkt2__bar">
                  <span className="dmkt2__bar-t">{r.district}</span>
                  <span className="dmkt2__bar-track"><i style={{ width: `${(r.count / maxRegion) * 100}%` }} /></span>
                  <span className="dmkt2__bar-v">{r.count}건</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 11. 기업 규모 분포 */}
        {!isWidgetHidden('market', 'tier-donut') && (
          <section className={`dcard wcell wcell--${widgetSize('tier-donut')}`}>
            <SectionHeader title="기업 규모 분포" hint="국내" />
            <TierDonutChart counts={tierDonut.counts} total={tierDonut.total} />
          </section>
        )}
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
