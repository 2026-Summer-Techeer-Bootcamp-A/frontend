import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, MapPin, ArrowUpRight, FileText, Settings, Award, User } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import catData from '../../data/pearl/n.json'
import {
  MiniScore, SectionHeader, SegmentedControl, SkillChip,
  TechIcon, WidgetSettingsMenu,
  StatTile, JobCardCompact, MenuRow,
} from '../../career/kit'
import {
  TechCoNetworkGraph, TechMoversBar, getNetworkTopConnections, getNetworkTopPairs,
} from '../../career/insights'
import {
  HypeVsHireWidget, GithubChronicleWidget, GlobalDomesticGapWidget,
  GroupShareCard, DemandRaceChart, DemandGrowthScatter, CooccurrenceBarWidget,
  SkillCountStatWidget, SkillCountHistogramWidget, ConceptTechSankeyWidget,
  GlobalDomesticLagWidget, MarketChangeStrip,
  type GroupKey, type PoolChoice,
} from '../../career/wowWidgets'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, resumeToUpsertPayload } from '../../career/state'
import { getAuthToken, useAuth } from '../../career/authStore'
import { useDashboardConfig, isWidgetHidden, getWidgetSize, type WidgetSize } from '../../career/dashboardConfig'
import { MARKET_WIDGETS } from '../../career/widgetCatalog'
import { useBookmarks } from '../../career/bookmarkStore'
import { useRecentViews } from '../../career/viewHistoryStore'
import { SkillManagerModal } from '../SkillManagerModal'
import { recruitmentApi } from '../../career/recruitmentApi'
import JobsPagination, { parseJobPage, parseJobPageSize, type JobPageSize } from '../../career/JobsPagination'
import { jobsApi, marketApi, type ApiPool } from '../../career/api'
import { addMapTileLayer } from '../../career/mapTiles'
import marketData from '../../data/marketData.json'
import data from '../../data/careerData.json'
import newcomerGate from '../../data/pearl/h.json'
import './placeholders.css'
import './market.css'
import './jobs.css'
import '../../career/widgetGrid.css'

/* 데스크톱 페이지 — 모바일 단일컬럼과 분리된 PC 레이아웃 틀.
   대시보드(홈)는 DesktopOverview.tsx가 담당. 여기는 공고·시장·지도·마이. */

function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

function CompanyLocationMap({ lat, lng, address }: { lat: number; lng: number; address: string }) {
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
      icon: L.divIcon({
        className: 'djobs__company-map-marker-wrap',
        html: '<div class="djobs__company-map-marker"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    }).addTo(map)
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 60)
    return () => {
      window.clearTimeout(resizeTimer)
      removeTiles()
      map.remove()
    }
  }, [lat, lng])

  return (
    <div className="djobs__company-map">
      <div className="djobs__company-map-viewport">
        <div ref={elRef} className="djobs__company-map-canvas" aria-label={`${address} 근무 위치 지도`} />
        {tileStatus === 'loading' && <div className="djobs__company-map-status" role="status">지도를 불러오는 중…</div>}
        {tileStatus === 'error' && <div className="djobs__company-map-status" role="status">지도를 불러오지 못했습니다.</div>}
      </div>
      <div className="djobs__company-map-address"><MapPin size={13} /> {address}</div>
    </div>
  )
}

/* ───────────────── 검색(구 맞춤 공고) — 실 API 전용 ─────────────────
   목록 API가 제공하는 title/skills로 직무와 매칭도를 계산한다. API에 없는 필드는 목 데이터로
   보완하지 않으며, 해당 필드를 요구하는 필터도 노출하지 않는다. */
const POSITION_CATS = ['백엔드', '프론트엔드', '풀스택', '데이터/AI', '모바일', '인프라/DevOps', '기획/PM', '디자인', 'QA', '기타'] as const
type PositionCat = typeof POSITION_CATS[number]
const POSITION_API: Record<PositionCat, string> = {
  '백엔드': 'backend', '프론트엔드': 'frontend', '풀스택': 'fullstack', '데이터/AI': 'data',
  '모바일': 'mobile', '인프라/DevOps': 'devops', '기획/PM': 'pm', '디자인': 'design', 'QA': 'qa', '기타': 'other',
}

/* 기술 스택 필터 카테고리 그룹핑 — SkillManagerModal.tsx와 동일하게 pearl/n.json(기술
   코-네트워크 그래프 데이터)의 {tech, category} 노드를 재사용한다. 별도 매핑 새로 안 만듦. */
const TECH_CATEGORY_NODES = (catData as { data: { nodes: { tech: string; category: string }[] } }).data.nodes
const TECH_CATEGORY: Record<string, string> = Object.fromEntries(TECH_CATEGORY_NODES.map((n) => [n.tech, n.category]))
const TECH_CATEGORY_LABEL: Record<string, string> = {
  language: '언어', backend: '백엔드', frontend: '프론트엔드', data_db: '데이터·DB',
  cloud_services: '클라우드', devops: 'DevOps', mobile: '모바일', ai_llm: 'AI·LLM',
}
const TECH_CATEGORY_ORDER = ['language', 'backend', 'frontend', 'data_db', 'cloud_services', 'devops', 'mobile', 'ai_llm', 'etc']
function techCategoryOf(tech: string): string { return TECH_CATEGORY[tech] ?? 'etc' }
function techCategoryLabel(cat: string): string { return TECH_CATEGORY_LABEL[cat] ?? '기타' }
function groupTechOptions(options: string[]): Array<{ cat: string; label: string; techs: string[] }> {
  const byCat = new Map<string, string[]>()
  options.forEach((t) => {
    const cat = techCategoryOf(t)
    if (!byCat.has(cat)) byCat.set(cat, [])
    byCat.get(cat)!.push(t)
  })
  return TECH_CATEGORY_ORDER
    .filter((cat) => byCat.has(cat))
    .map((cat) => ({ cat, label: techCategoryLabel(cat), techs: byCat.get(cat)! }))
}

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

/* ───────────────── 맞춤 공고 — 마스터-디테일 ───────────────── */
export function DesktopJobs() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { resumes, activeResume } = useResumesState()
  const skills = activeResume?.skills ?? []

  const [pool, setPool] = useState<'국내' | '국외'>(() => searchParams.get('pool') === 'global' ? '국외' : '국내')
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<'match' | 'latest'>(() => searchParams.get('sort') === 'latest' ? 'latest' : 'match')
  const [page, setPage] = useState(() => parseJobPage(searchParams.get('page')))
  const [pageSize, setPageSize] = useState<JobPageSize>(() => parseJobPageSize(searchParams.get('page_size')))
  const [selId, setSelId] = useState<string | null>(null)
  const [techFilter, setTechFilter] = useState<Set<string>>(() => new Set((searchParams.get('tech') ?? '').split(',').filter(Boolean)))
  const [deadlineOnly, setDeadlineOnly] = useState(searchParams.get('deadline') === '1')
  const [positionFilter, setPositionFilter] = useState<PositionCat | ''>(() => {
    const value = searchParams.get('position')
    return POSITION_CATS.includes(value as PositionCat) ? value as PositionCat : ''
  })
  const [pvTab, setPvTab] = useState<'desc' | 'company'>('desc')
  const [remoteCards, setRemoteCards] = useState<Awaited<ReturnType<typeof jobsApi.list>> | null>(null)
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState('')
  const [selectedDetail, setSelectedDetail] = useState<Awaited<ReturnType<typeof jobsApi.detail>> | null>(null)

  useEffect(() => {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    next.set('pool', pool === '국내' ? 'domestic' : 'global')
    next.set('page', String(page))
    next.set('page_size', String(pageSize))
    next.set('sort', sort)
    if (techFilter.size) next.set('tech', [...techFilter].sort().join(','))
    if (positionFilter) next.set('position', positionFilter)
    if (deadlineOnly) next.set('deadline', '1')
    setSearchParams(next, { replace: true })
  }, [q, pool, page, pageSize, sort, techFilter, positionFilter, deadlineOnly, setSearchParams])

  useEffect(() => {
    let cancelled = false
    setJobsLoading(true)
    setJobsError('')
    setRemoteCards(null)
    const resumeId = Number(activeResume?.id)
    const hasMatchedResume = Number.isInteger(resumeId) && !!getAuthToken()
    jobsApi.list({
      pool: pool === '국내' ? 'domestic' : 'global',
      q: q.trim() || undefined,
      skills: techFilter.size ? [...techFilter].join(',') : undefined,
      position: positionFilter ? POSITION_API[positionFilter] : undefined,
      sort,
      deadline_within_days: deadlineOnly ? 7 : undefined,
      page,
      page_size: pageSize,
      resume_id: hasMatchedResume ? resumeId : undefined,
    }, getAuthToken()).then((result) => {
      if (!cancelled) setRemoteCards(result)
    }).catch((reason) => {
      if (!cancelled) setJobsError(reason instanceof Error ? reason.message : '공고를 불러오지 못했습니다.')
    }).finally(() => { if (!cancelled) setJobsLoading(false) })
    return () => { cancelled = true }
  }, [pool, q, sort, techFilter, deadlineOnly, positionFilter, page, pageSize, activeResume?.id])

  useEffect(() => {
    if (!remoteCards) return
    const lastPage = Math.max(1, Math.ceil(remoteCards.total / remoteCards.page_size))
    if (page > lastPage) setPage(lastPage)
  }, [remoteCards, page])

  const postings = useMemo(() => {
    if (!remoteCards) return []
    return remoteCards.items.map((card) => {
      const techs = card.skills ?? []
      const held = techs.filter((tech) => skills.includes(tech))
      return {
        id: String(card.id),
        title: card.title,
        company: card.company ?? '회사명 미상',
        pool,
        postDate: card.post_date ?? '',
        closeDate: card.close_date ?? '',
        techs,
        url: card.url,
        logo: card.logo_url ?? '',
        matchHeld: card.matched_count ?? held.length,
        matchTotal: techs.length,
        matchPct: techs.length ? Math.round(((card.matched_count ?? held.length) / techs.length) * 100) : 0,
        gap: techs.filter((tech) => !skills.includes(tech)),
      }
    })
  }, [remoteCards, skills, pool])
  const techOptions = useMemo(
    () => [...new Set([...techFilter, ...postings.flatMap((posting) => posting.techs)])].sort((a, b) => a.localeCompare(b)),
    [postings, techFilter],
  )
  const techGroups = useMemo(() => groupTechOptions(techOptions), [techOptions])
  const list = postings

  const positionFacets = useMemo(() => {
    const counts = new Map<PositionCat, number>()
    list.forEach((p) => {
      const cat = derivePosition(p.title, p.techs)
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [list])

  const sel = list.find((p) => p.id === selId) ?? list[0]

  useEffect(() => setPvTab('desc'), [sel?.id])

  useEffect(() => {
    if (!sel?.id) {
      setSelectedDetail(null)
      return
    }
    let cancelled = false
    setSelectedDetail(null)

    jobsApi.detail(sel.id)
      .then((result) => { if (!cancelled) setSelectedDetail(result) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [sel?.id])

  const toggleTech = (t: string) => setTechFilter((s) => {
    const next = new Set(s)
    if (next.has(t)) next.delete(t); else next.add(t)
    setPage(1)
    return next
  })
  // 링크드인/사람인식 스킬 매치 미니 줄 — "요구 N개 중 M개 보유" 텍스트 +
  // 보유(그린) > 필터에서 고름(중립) > 안 고름(옅게+옅은 빨강) 3단 칩.
  const renderSkillMatch = (techs: string[]) => {
    const held = techs.filter((t) => skills.includes(t))
    const missing = techs.filter((t) => !skills.includes(t))
    const heldShown = held.slice(0, 3)
    const missingShown = missing.slice(0, 2)
    return (
      <span className="djobs__matchline">
        <span className="djobs__matchline-txt">요구 {techs.length}개 중 {held.length}개 보유</span>
        {heldShown.map((t) => <span key={`h-${t}`} className="djobs__mtech held">{t}</span>)}
        {held.length > heldShown.length && <span className="djobs__mtech more">+{held.length - heldShown.length}</span>}
        {missingShown.map((t) => (
          <span key={`m-${t}`} className={`djobs__mtech ${techFilter.has(t) ? 'picked' : 'extra'}`}>{t}</span>
        ))}
        {missing.length > missingShown.length && <span className="djobs__mtech more">+{missing.length - missingShown.length}</span>}
      </span>
    )
  }

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
              <span className="djobs__fld-l">이력서 자동 적용</span>
              <div className="djobs__resume-active">
                <FileText size={14} /> {activeResume.title} 기준으로 필터가 채워졌어요
              </div>
            </div>
          )}

          <div className="djobs__search">
            <Search size={16} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="회사 · 공고 검색" />
          </div>

          <div className="djobs__fld">
            <span className="djobs__fld-l">채용 풀</span>
            <SegmentedControl value={pool} onChange={(v) => { setPool(v as '국내' | '국외'); setPage(1) }}
              options={[{ key: '국내', label: '국내' }, { key: '국외', label: '글로벌' }]} />
          </div>

          <div className="djobs__fld">
            <span className="djobs__fld-l">기술 스택</span>
            <div className="djobs__techgroups">
              {techGroups.map((g) => (
                <div className="djobs__techgroup" key={g.cat}>
                  <span className="djobs__techgroup-l">{g.label}</span>
                  <div className="djobs__chiprow">
                    {g.techs.map((t) => (
                      <button key={t} className={techFilter.has(t) ? 'on' : ''} onClick={() => toggleTech(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="djobs__fld">
            <span className="djobs__fld-l">직무</span>
            <select
              className="djobs__select"
              value={positionFilter}
              onChange={(e) => { setPositionFilter(e.target.value as PositionCat | ''); setPage(1) }}
            >
              <option value="">전체</option>
              {POSITION_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label className="djobs__toggle">
            <input type="checkbox" checked={deadlineOnly} onChange={(e) => { setDeadlineOnly(e.target.checked); setPage(1) }} />
            마감 임박(7일 이내)만
          </label>

          <div className="djobs__fld">
            <span className="djobs__fld-l">정렬</span>
            <div className="djobs__sorts">
              {([['match', '매칭순'], ['latest', '최신순']] as const).map(([k, lb]) => (
                <button key={k} className={sort === k ? 'on' : ''} onClick={() => { setSort(k); setPage(1) }}>{lb}</button>
              ))}
            </div>
          </div>

          <div className="djobs__count">{(remoteCards?.total ?? 0).toLocaleString()}건</div>
        </aside>

        {/* 결과 리스트 */}
        <div className="dcard djobs__list">
          <div className="djobs__listhead">
            <div className="djobs__facets">
              <span className="djobs__facets-count">전체 {(remoteCards?.total ?? 0).toLocaleString()}건</span>
              <span className="djobs__facets-sep" />
              {positionFacets.map(([cat, n]) => (
                <span key={cat} className="djobs__facet djobs__facet--static">{cat} {n}</span>
              ))}
            </div>
          </div>
          {jobsLoading && <div className="dpage__empty">공고를 불러오는 중이에요.</div>}
          {jobsError && <div className="dpage__empty">{jobsError}</div>}
          {!jobsLoading && !jobsError && list.length === 0 && <div className="dpage__empty">조건에 맞는 공고가 없어요.</div>}
          {list.map((p) => (
            <button
              key={p.id}
              className={`djobs__row${sel?.id === p.id ? ' on' : ''}`}
              onClick={() => setSelId(p.id)}
            >
              <CompanyLogo logo={p.logo} name={p.company} size={38} radius={10} />
              <span className="djobs__row-b">
                <span className="djobs__row-t">{p.title}</span>
                <span className="djobs__row-c">
                  {p.company} · <span className="djobs__badge">{derivePosition(p.title, p.techs)}</span>
                </span>
                {renderSkillMatch(p.techs)}
              </span>
              <MiniScore pct={p.matchPct} size={40} />
            </button>
              ))}
          {!jobsLoading && !jobsError && (
            <JobsPagination
              page={remoteCards?.page ?? page}
              pageSize={remoteCards ? remoteCards.page_size as JobPageSize : pageSize}
              total={remoteCards?.total ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
            />
          )}
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
              <div className="djobs__pv-meta">{sel.company}{sel.postDate ? ` · 등록 ${sel.postDate}` : ''}{sel.closeDate ? ` · 마감 ${sel.closeDate}` : ''}</div>
              <div className="djobs__pv-sec">요구 기술</div>
              <div className="djobs__pv-techs">
                {sel.techs.map((t) => (
                  <span
                    key={t}
                    className={`djobs__tech ${skills.includes(t) ? 'held' : techFilter.has(t) ? 'picked' : 'extra'}`}
                  >
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
                    {String(selectedDetail?.id) === String(sel.id) && selectedDetail?.desc_sections?.length ? (
                      selectedDetail.desc_sections.map((s, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div className="djobs__pv-dsec">{s.title}</div>
                          <p style={{ whiteSpace: 'pre-line' }}>{s.text}</p>
                        </div>
                      ))
                    ) : (
                      <p>실제 공고 API가 제공한 요구 기술을 기준으로 매칭도를 계산했어요.</p>
                    )}
                    <div className="djobs__pv-dsec">요구 기술</div>
                    <p>{sel.techs.join(' · ')}</p>
                  </>
                ) : (
                    <>
                      <div className="djobs__pv-kv"><span>회사</span><b>{sel.company}</b></div>
                      {selectedDetail?.industry && <div className="djobs__pv-kv"><span>업종</span><b>{selectedDetail.industry}</b></div>}
                      <div className="djobs__pv-kv"><span>지역</span><b>{selectedDetail?.region ?? '정보 없음'}</b></div>
                      <div className="djobs__pv-kv"><span>채용 풀</span><b>{sel.pool}</b></div>
                      {String(selectedDetail?.id) === String(sel.id)
                        && selectedDetail?.lat != null
                        && selectedDetail.lng != null && (
                        <CompanyLocationMap
                          lat={selectedDetail.lat}
                          lng={selectedDetail.lng}
                          address={selectedDetail.region || '위치 정보 없음'}
                        />
                      )}
                    </>
                  )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ───────────────── 채용 시장 — 시장 흐름 인텔리전스 보드(v8, 2026-07-14 재구성) ─────────────────
   확정 설계 v8: 상단 국내/글로벌/전체 풀 셀렉터 + 검정 변화 스트립 + ①시장 흐름 ②기술
   수요·성장 ③기술 지형·관계 ④지역·기업 ⑤글로벌·해외 트렌드(pool≠domestic 전용).
   개인 진단(내 커버리지·매칭 등)은 대시보드(DesktopOverview) 담당이라 이 페이지엔 두지 않는다.
   재사용 컴포넌트(TechCoNetworkGraph 등)는 skills=[] 로 호출해 보유(owned) 오버레이를
   끄고 순수 시장뷰로만 그린다. */
const NO_SKILLS: string[] = []

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

const CALENDAR_POSITION_API: Record<PositionCat, string | undefined> = {
  '백엔드': 'Developer', '프론트엔드': 'Developer', '풀스택': 'Developer', '데이터/AI': 'Data Science',
  '모바일': 'Developer', '인프라/DevOps': 'Developer', '기획/PM': 'Product', '디자인': 'Design',
  'QA': 'Developer', '기타': undefined,
}

type PostingCalendarDay = {
  date: string
  count: number
  intensity: number
  isFuture: boolean
}

type PostingCalendarWeek = {
  monthLabel?: string
  days: PostingCalendarDay[]
}

const DAY_MS = 24 * 60 * 60 * 1000

/** API 날짜는 Asia/Seoul의 달력 날짜다. UTC 산술로 다뤄 브라우저 타임존이 바뀌어도 재해석하지 않는다. */
function parseSeoulDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toSeoulDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

/** GitHub contribution graph와 같은 53주 × 7일 공고 등록 캘린더. */
function PostingCalendar({
  daily,
  asOf,
  scopeLabel,
}: {
  daily: Array<{ date: string; total: number }>
  asOf: string
  scopeLabel: string
}) {
  const { weeks, total, activeDays, peak, isDumpDayOutlier } = useMemo(() => {
    const counts = new Map(daily.map((day) => [day.date, day.total]))

    const endDate = parseSeoulDateKey(asOf)
    const rangeStart = new Date(endDate.getTime() - 364 * DAY_MS)
    const startSunday = new Date(rangeStart.getTime() - rangeStart.getUTCDay() * DAY_MS)
    const endSaturday = new Date(endDate.getTime() + (6 - endDate.getUTCDay()) * DAY_MS)
    const rangeStartKey = toSeoulDateKey(rangeStart)
    const visibleCounts = Array.from(counts.entries())
      .filter(([date]) => date >= rangeStartKey && date <= asOf)
      .map(([, count]) => count)
    const peak = Math.max(...visibleCounts, 0)
    // 단일 덤프일 캡(winsorize) — 스크래핑 배치가 하루에 몰리는 날(예: 2026-07-10)이
    // 실제 요일 패턴(평일↑·9월 성수기)을 압도해버리는 걸 막는다. 시각화 강도(intensity)만
    // 상위 5%tile로 캡하고, "하루 최대" 통계(peak)는 실측 그대로 보여준다(과장/은폐 아님).
    const nonZeroSorted = visibleCounts.filter((c) => c > 0).sort((a, b) => a - b)
    const p95Idx = Math.floor(nonZeroSorted.length * 0.95)
    const winsorCap = nonZeroSorted.length ? nonZeroSorted[Math.min(p95Idx, nonZeroSorted.length - 1)] : 0
    const scaleMax = Math.max(winsorCap, 1)
    const isDumpDayOutlier = peak > scaleMax * 2
    const result: PostingCalendarWeek[] = []

    for (let cursor = startSunday.getTime(), weekIndex = 0; cursor <= endSaturday.getTime(); cursor += 7 * DAY_MS, weekIndex += 1) {
      const weekStart = new Date(cursor)
      const previousWeek = new Date(cursor - 7 * DAY_MS)
      const monthChanged = weekIndex === 0 || weekStart.getUTCMonth() !== previousWeek.getUTCMonth()
      const days = Array.from({ length: 7 }, (_, dayIndex) => {
        const date = new Date(cursor + dayIndex * DAY_MS)
        const dateKey = toSeoulDateKey(date)
        const count = counts.get(dateKey) ?? 0
        const cappedCount = Math.min(count, scaleMax)
        const intensity = count && scaleMax ? Math.max(1, Math.ceil(Math.sqrt(cappedCount / scaleMax) * 4)) : 0
        return { date: dateKey, count, intensity, isFuture: date > endDate }
      })
      result.push({
        monthLabel: monthChanged ? `${weekStart.getUTCMonth() + 1}월` : undefined,
        days,
      })
    }

    return {
      weeks: result,
      total: visibleCounts.reduce((sum, count) => sum + count, 0),
      activeDays: visibleCounts.filter((count) => count > 0).length,
      peak,
      isDumpDayOutlier,
    }
  }, [daily, asOf])

  return (
    <div className="dmkt2__calendar">
      <div className="dmkt2__calendar-summary">
        <strong>{total.toLocaleString()}건</strong>
        <span>{activeDays}일에 등록</span>
        <span>하루 최대 {peak.toLocaleString()}건</span>
        {isDumpDayOutlier && <span className="dmkt2__calendar-outlier">특이값 1일 캡 처리(상위 5%tile)</span>}
      </div>
      <div className="dmkt2__calendar-scroll" tabIndex={0} aria-label={`${scopeLabel} 최근 1년 채용 공고 등록 캘린더`}>
        <div className="dmkt2__calendar-chart">
          <div className="dmkt2__calendar-months" aria-hidden="true" style={{ gridTemplateColumns: `26px repeat(${weeks.length}, 11px)` }}>
            <span className="dmkt2__calendar-month-spacer" />
            {weeks.map((week, index) => <span key={index}>{week.monthLabel}</span>)}
          </div>
          <div className="dmkt2__calendar-body">
            <div className="dmkt2__calendar-weekdays" aria-hidden="true">
              <span />
              <span>월</span>
              <span />
              <span>수</span>
              <span />
              <span>금</span>
              <span />
            </div>
            <div className="dmkt2__calendar-weeks" role="grid" aria-label="날짜별 신규 채용 공고 수">
              {weeks.map((week, weekIndex) => (
                <div className="dmkt2__calendar-week" role="row" key={weekIndex}>
                  {week.days.map((day) => {
                    const [, month, date] = day.date.split('-').map(Number)
                    const label = day.count > 0
                      ? `${month}월 ${date}일 · 신규 공고 ${day.count.toLocaleString()}건`
                      : `${month}월 ${date}일 · 등록 공고 없음`
                    return (
                      <span
                        key={day.date}
                        className={`dmkt2__calendar-day level-${day.intensity}${day.count > 0 ? ' has-postings' : ''}${day.isFuture ? ' is-future' : ''}`}
                        role="gridcell"
                        aria-label={label}
                        title={label}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="dmkt2__calendar-foot">
        <span>기준 {asOf} · {scopeLabel}</span>
        <span className="dmkt2__calendar-legend" aria-label="공고 수 범례">
          적음
          {[0, 1, 2, 3, 4].map((level) => <i key={level} className={`level-${level}`} />)}
          많음
        </span>
      </div>
    </div>
  )
}

const DOMESTIC_TOTAL = 442768 // §1 실측 — 국내 442,768건(2014-07~2026-07)
const GLOBAL_TOTAL = 122423 // §1 실측 — 글로벌 122,423건

function spanStyle(size: WidgetSize): CSSProperties {
  const [w, h] = size.split('x')
  return { gridColumn: `span ${w}`, gridRow: `span ${h}` }
}

function poolsForQuery(pool: PoolChoice): ApiPool[] {
  return pool === 'all' ? ['domestic', 'global'] : [pool]
}

function mergeCounts<T extends { count: number }>(lists: Array<Array<T & { key: string }>>): Array<{ key: string; count: number }> {
  const map = new Map<string, number>()
  lists.forEach((list) => list.forEach((item) => map.set(item.key, (map.get(item.key) ?? 0) + item.count)))
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

export function DesktopMarket() {
  useDashboardConfig() // 위젯 표시/숨김 변경 시 리렌더 트리거
  const { activeResume } = useResumesState()
  const domestic = marketData.skillShare['국내'] as { asOf: string; N: number; items: { tech: string; share: number; count: number }[] }

  // 국내/글로벌/전체 풀 셀렉터(v8 §4-1) — pool-지원 위젯의 marketApi 호출에 그대로 매핑.
  // 'all'은 점유율 합산 금지 — 병렬 조회 후 병렬 표기(마다 위젯 내부에서 처리).
  const [pool, setPool] = useState<PoolChoice>('domestic')

  // "내 직무 / 전체" 스코프 — 풀 셀렉터와는 다른 축으로 공존한다(스펙 §4-1). 캘린더·활발기업처럼
  // position 파라미터를 지원하는 위젯에만 적용, 나머지는 전역 집계 그대로.
  const myCategory = activeResume ? derivePosition('', activeResume.skills) : null
  const [scope, setScope] = useState<'mine' | 'all'>(activeResume ? 'mine' : 'all')
  const scoped = scope === 'mine' && !!myCategory

  // 신입 문호 — 6년 연속 하락(41.5%→15.5%)·전 직무 10~21%로 좁아 사용자 판단상 상단 노출을
  // 보류한다(스펙 §6). 데이터 파이프라인·컴포넌트는 그대로 두고 렌더만 끈다 — 복구하려면
  // 이 값을 true로 뒤집으면 된다(코드 삭제 불필요).
  const SHOW_NEWCOMER_GATE = false
  const [liveNewcomer, setLiveNewcomer] = useState<typeof newcomerGate.data.items | null>(null)
  useEffect(() => {
    let cancelled = false
    marketApi.newcomerGate().then((r) => {
      if (!cancelled && r.items.length) setLiveNewcomer(r.items.map((item) => ({ tech: item.canonical, open_rate: item.open_rate, postings: item.postings, newcomer_n: item.newcomer_postings })))
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const newcomerTop = useMemo(() => (
    [...(liveNewcomer ?? newcomerGate.data.items)].sort((a, b) => b.open_rate - a.open_rate).slice(0, 8)
  ), [liveNewcomer])
  const maxOpenRate = Math.max(...newcomerTop.map((i) => i.open_rate), 1)

  const [liveHotCompanies, setLiveHotCompanies] = useState<Array<{ company: string; count: number }> | null>(null)
  const [liveRegionDensity, setLiveRegionDensity] = useState<Array<{ district: string; count: number }> | null>(null)
  const [calendarState, setCalendarState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; daily: Array<{ date: string; total: number }>; asOf: string }
  >({ status: 'loading' })
  const [calendarRetry, setCalendarRetry] = useState(0)

  const widgetSize = (id: string) => {
    const item = MARKET_WIDGETS.find((w) => w.id === id)!
    return getWidgetSize('market', id, item.defaultSize)
  }

  // ④-b 최근 90일 활발 기업 — 풀 셀렉터에 반응(스펙: "국내/글로벌 모두"). 'all'은 회사별 건수를
  // 합산해서 상위 5개를 뽑는다(점유율%이 아닌 원 건수 합산이라 §4-1의 "합산 금지"에 해당하지 않음).
  // P2 — days는 백엔드 hot-companies 엔드포인트 상한(le=90)에 맞춘다. 과거 3650(누적)을 보내면
  // 422로 실패해 목 폴백(2건 등 거의 빈 값)으로 떨어졌었다 — "누적"이 아니라 "최근 90일"로
  // 라벨도 정직하게 맞춘다(실측이 정상적으로 뜨므로 목 폴백보다 실데이터 우선).
  useEffect(() => {
    let cancelled = false
    Promise.allSettled(poolsForQuery(pool).map((p) => marketApi.hotCompanies({ pool: p, days: 90, limit: 8 })))
      .then((results) => {
        if (cancelled) return
        const lists = results.flatMap((r) => (r.status === 'fulfilled' && r.value.items.length
          ? [r.value.items.map((i) => ({ key: i.company, count: i.posting_count }))]
          : []))
        if (lists.length) setLiveHotCompanies(mergeCounts(lists).slice(0, 5).map((r) => ({ company: r.key, count: r.count })))
        else setLiveHotCompanies(null)
      })
    return () => { cancelled = true }
  }, [pool])

  const mockHotCompanies = useMemo(() => {
    const domesticAll = (data.postings as { pool: string; company: string; title: string; techs: string[] }[])
      .filter((p) => p.pool === '국내' && (!scoped || derivePosition(p.title, p.techs) === myCategory))
    const counts: Record<string, number> = {}
    domesticAll.forEach((p) => { counts[p.company] = (counts[p.company] ?? 0) + 1 })
    return Object.entries(counts).map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [scoped, myCategory])
  const hotCompanies = liveHotCompanies ?? mockHotCompanies
  const maxHot = Math.max(...hotCompanies.map((c) => c.count), 1)

  // ④-a 지역별 공고 밀도 — 국내 전용(§1: 글로벌 region_district 전 행 NULL). pool과 무관하게
  // 항상 국내로 조회하고, 글로벌/전체 탭에서는 카드를 dim 처리한다.
  useEffect(() => {
    let cancelled = false
    marketApi.regionDensity({ pool: 'domestic', limit: 6 }).then((r) => {
      if (!cancelled && r.items.length) setLiveRegionDensity(r.items.map((i) => ({ district: i.region_district, count: i.posting_count })))
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  const mockRegionDensity = useMemo(() => {
    const domesticPostings = (data.postings as { pool: string; district: string; title: string; techs: string[] }[])
      .filter((p) => p.pool === '국내' && (!scoped || derivePosition(p.title, p.techs) === myCategory))
    const counts: Record<string, number> = {}
    domesticPostings.forEach((p) => { if (p.district) counts[p.district] = (counts[p.district] ?? 0) + 1 })
    return Object.entries(counts).map(([district, count]) => ({ district, count })).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [scoped, myCategory])
  const regionDensity = liveRegionDensity ?? mockRegionDensity
  const maxRegion = Math.max(...regionDensity.map((r) => r.count), 1)
  const regionDisabled = pool !== 'domestic'

  const scatterItems = useMemo(() => domestic.items.slice(0, 16).map((i) => ({
    tech: i.tech, share: i.share, count: i.count,
  })), [domestic])

  // ①-f 채용 공고 등록 캘린더 — pool 반응(post_date는 국내·글로벌 모두 존재). 'all'은 날짜별
  // 원 건수를 합산(카운트라 §4-1 합산 금지 대상 아님, "덤프일 캡"은 PostingCalendar 내부에서 처리).
  useEffect(() => {
    let cancelled = false
    setCalendarState({ status: 'loading' })
    const position = scoped && myCategory ? CALENDAR_POSITION_API[myCategory] : undefined
    Promise.allSettled(poolsForQuery(pool).map((p) => marketApi.postingTimeline({ pool: p, days: 365, position: p === 'domestic' ? position : undefined })))
      .then((results) => {
        if (cancelled) return
        const fulfilled = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
        if (!fulfilled.length) {
          setCalendarState({ status: 'error', message: '캘린더 데이터를 불러오지 못했습니다.' })
          return
        }
        const merged = mergeCounts(fulfilled.map((r) => r.daily.map((d) => ({ key: d.date, count: d.total }))))
        setCalendarState({ status: 'ready', daily: merged.map((m) => ({ date: m.key, total: m.count })), asOf: fulfilled[0].as_of })
      })
    return () => { cancelled = true }
  }, [scoped, myCategory, calendarRetry, pool])

  // 전역 집계 위젯에 붙이는 "전체 시장 기준" 배지 — scope='mine'일 때만 노출.
  const scopeBadge = scoped ? <span className="dmkt2__scopebadge">전체 시장 기준</span> : undefined

  // 라벨 섹션 표시 여부 — 섹션 내 위젯이 전부 숨겨지면 섹션 헤더째로 렌더하지 않는다.
  const sec1Visible = !isWidgetHidden('market', 'yearly-trend') || !isWidgetHidden('market', 'group-share-frontend')
    || !isWidgetHidden('market', 'group-share-backend') || !isWidgetHidden('market', 'group-share-database')
    || !isWidgetHidden('market', 'movers') || !isWidgetHidden('market', 'posting-calendar')
  const sec2Visible = !isWidgetHidden('market', 'demand-growth-scatter') || !isWidgetHidden('market', 'cooccurrence-bar')
    || !isWidgetHidden('market', 'skill-count-stat') || !isWidgetHidden('market', 'skill-count-dist')
  const sec3Visible = !isWidgetHidden('market', 'network') || !isWidgetHidden('market', 'concept-tech-sankey')
  const sec4Visible = !isWidgetHidden('market', 'region-density') || !isWidgetHidden('market', 'hot-companies')
    || !isWidgetHidden('market', 'scatter')
  // ⑤ 글로벌·해외 트렌드는 pool≠'domestic'일 때만 렌더(스펙 §4-1 — 국내 탭에선 섹션째 숨김).
  const sec5Visible = pool !== 'domestic' && (
    !isWidgetHidden('market', 'global-domestic-lag') || !isWidgetHidden('market', 'hype-vs-hire')
    || !isWidgetHidden('market', 'global-domestic-gap') || !isWidgetHidden('market', 'github-chronicle')
  )

  return (
    <div className="dpage dmkt2">
      <header className="dmkt2__head">
        <div className="dmkt2__head-l">
          <h1 className="dmkt2__title">채용 시장</h1>
          <div className="dmkt2__sub">
            {scoped && <>{myCategory} 직무 시장 흐름 · </>}
            국내 {DOMESTIC_TOTAL.toLocaleString()}건 · 글로벌 {GLOBAL_TOTAL.toLocaleString()}건 기준 · 개인화된 내 진단은 대시보드에서 확인하세요
          </div>
        </div>
        <div className="dmkt2__head-r">
          <div className="dmkt2__poolsel">
            <SegmentedControl
              size="sm"
              value={pool}
              onChange={(v) => setPool(v as PoolChoice)}
              options={[{ key: 'domestic', label: '국내' }, { key: 'global', label: '글로벌' }, { key: 'all', label: '전체' }]}
            />
            <span className="dmkt2__poolsel-n">국내 {Math.round(DOMESTIC_TOTAL / 1000)}K · 글로벌 {Math.round(GLOBAL_TOTAL / 1000)}K</span>
          </div>
          {myCategory && (
            <div className="dmkt2__scopetabs">
              <SegmentedControl
                size="sm"
                value={scope}
                onChange={(v) => setScope(v as 'mine' | 'all')}
                options={[{ key: 'mine', label: `내 직무 · ${myCategory}` }, { key: 'all', label: '전체' }]}
              />
            </div>
          )}
          <WidgetSettingsMenu section="market" items={MARKET_WIDGETS} />
        </div>
      </header>

      <MarketChangeStrip />

      {/* 신입 문호 — §6에 따라 숨김(SHOW_NEWCOMER_GATE=false 고정). 복구 시 이 블록이 그대로 렌더된다. */}
      {SHOW_NEWCOMER_GATE && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h"><h2>신입 문호</h2><span>신입도 지원 가능한 공고 비율</span></header>
          <div className="dmkt2__card-item">
            <section className="dcard">
              <SectionHeader title="신입에게 열린 기술" hint="신입도 지원 가능한 공고 비율" />
              <div className="dmkt2__bars dmkt2__bars--open">
                {newcomerTop.map((i) => (
                  <div key={i.tech} className="dmkt2__bar">
                    <TechIcon tech={i.tech} size={20} />
                    <span className="dmkt2__bar-t">{i.tech}</span>
                    <span className="dmkt2__bar-track"><i style={{ width: `${(i.open_rate / maxOpenRate) * 100}%` }} /></span>
                    <span className="dmkt2__bar-v">{i.open_rate}%</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      )}

      {/* ① 시장 흐름 — 판도가 어디로 이동하나(연 단위). 연도별 수요 레이스(2×2) · 판도 카드
          3개(1×1, 클릭→모달) · 급상승·급감(1×1) · 채용 등록 캘린더(풀폭, 덤프일 캡). */}
      {sec1Visible && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h">
            <h2>① 시장 흐름</h2>
            <span>판도가 어디로 이동하나 — 연 단위</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--flow">
            {!isWidgetHidden('market', 'yearly-trend') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('yearly-trend'))}>
                <section className="dcard">
                  <SectionHeader title="연도별 수요 레이스" hint="언어 판도" right={scopeBadge} />
                  <p className="dmkt2__takeaway">점유율% 순위 변동 · <b className="dmkt2__takeaway-up">Python이 Java 추월</b></p>
                  <DemandRaceChart pool={pool} />
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'group-share-frontend') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('group-share-frontend'))}>
                <GroupShareCard group={'frontend_fw' as GroupKey} pool={pool} />
              </div>
            )}
            {!isWidgetHidden('market', 'group-share-backend') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('group-share-backend'))}>
                <GroupShareCard group={'backend_fw' as GroupKey} pool={pool} />
              </div>
            )}
            {!isWidgetHidden('market', 'group-share-database') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('group-share-database'))}>
                <GroupShareCard group={'database' as GroupKey} pool={pool} />
              </div>
            )}
            {!isWidgetHidden('market', 'movers') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('movers'))}>
                <section className="dcard">
                  <SectionHeader title="급상승 · 급감" hint="5년" />
                  <TechMoversBar />
                </section>
              </div>
            )}
          </div>
          {!isWidgetHidden('market', 'posting-calendar') && (
            <div className="dmkt2__card-item dmkt2__card-item--calendar" style={{ marginTop: 10 }}>
              <section className="dcard dcard--posting-calendar">
                <SectionHeader
                  title="채용 공고 등록 캘린더"
                  hint={`최근 1년 · ${scoped ? myCategory ?? '내 직무' : pool === 'domestic' ? '국내' : pool === 'global' ? '글로벌' : '국내+글로벌'}`}
                />
                {calendarState.status === 'loading' && (
                  <div className="dmkt2__calendar-state" role="status">최근 1년 공고 데이터를 불러오는 중입니다.</div>
                )}
                {calendarState.status === 'error' && (
                  <div className="dmkt2__calendar-state dmkt2__calendar-state--error" role="alert">
                    <span>캘린더 데이터를 불러오지 못했습니다.</span>
                    <button type="button" onClick={() => setCalendarRetry((value) => value + 1)}>다시 시도</button>
                  </div>
                )}
                {calendarState.status === 'ready' && calendarState.daily.length === 0 && (
                  <div className="dmkt2__calendar-state">이 조건에 집계할 채용 공고가 없습니다.</div>
                )}
                {calendarState.status === 'ready' && calendarState.daily.length > 0 && (
                  <PostingCalendar
                    daily={calendarState.daily}
                    asOf={calendarState.asOf}
                    scopeLabel={scoped ? myCategory ?? '내 직무' : '전체 직무'}
                  />
                )}
              </section>
            </div>
          )}
        </section>
      )}

      {/* ② 기술 수요·성장 — 사실 시각화(판단은 사용자 몫, 신입 문호 자리 대체). */}
      {sec2Visible && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h">
            <h2>② 기술 수요·성장</h2>
            <span>사실 시각화 — 판단은 사용자 몫</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--demand2">
            {!isWidgetHidden('market', 'demand-growth-scatter') && (
              <div className="dmkt2__card-item dmkt2__card-item--r5" style={spanStyle(widgetSize('demand-growth-scatter'))}>
                <section className="dcard">
                  <SectionHeader title="수요 × 성장률" hint="가로=현재 수요 · 세로=성장률" />
                  <DemandGrowthScatter pool={pool} size={widgetSize('demand-growth-scatter')} />
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'cooccurrence-bar') && (
              <div className="dmkt2__card-item dmkt2__card-item--r3" style={spanStyle(widgetSize('cooccurrence-bar'))}>
                <CooccurrenceBarWidget pool={pool} headerRight={scopeBadge} />
              </div>
            )}
            {!isWidgetHidden('market', 'skill-count-stat') && (
              <div className="dmkt2__card-item dmkt2__card-item--r2" style={spanStyle(widgetSize('skill-count-stat'))}>
                <SkillCountStatWidget />
              </div>
            )}
            {!isWidgetHidden('market', 'skill-count-dist') && (
              <div className="dmkt2__card-item dmkt2__card-item--r2" style={spanStyle(widgetSize('skill-count-dist'))}>
                <SkillCountHistogramWidget />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ③ 기술 지형·관계 — 主役. 기술 관계 네트워크(재활용) · 개념→기술 Sankey(신규, 라이브급). */}
      {sec3Visible && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h">
            <h2>③ 기술 지형·관계</h2>
            <span>기술이 어떻게 얽혀 있나</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--tech">
            {!isWidgetHidden('market', 'network') && (
              <div className="dmkt2__card-item dmkt2__card-item--r5" style={spanStyle(widgetSize('network'))}>
                <section className="dcard dmkt2__netcell">
                  <SectionHeader title="기술 관계 네트워크" hint="함께 요구되는 기술 · force graph" right={scopeBadge} />
                  <p className="dmkt2__takeaway">하나 배우면 딸려오는 기술들 — <b>함께 요구되는 스택 지도</b>.</p>
                  <div className="dmkt2__netsplit">
                    <div className="dmkt2__netgraph"><TechCoNetworkGraph skills={NO_SKILLS} /></div>
                    <aside className="dmkt2__netsummary">
                      <div className="dmkt2__netsummary-t">최다 연결 기술 Top 5 · 동반 요구 상위</div>
                      {getNetworkTopConnections(5).map((it, i) => (
                        <div key={it.tech} className="dmkt2__netsummary-group">
                          <div className="dmkt2__netsummary-row">
                            <span className="dmkt2__netsummary-rank">{i + 1}</span>
                            <span className="dmkt2__netsummary-tech">{it.tech}</span>
                            <span className="dmkt2__netsummary-n">{it.n.toLocaleString()}건</span>
                          </div>
                          {getNetworkTopPairs(it.tech, 3).map((p) => (
                            <div key={p.partner} className="dmkt2__netsummary-sub">
                              <span className="dmkt2__netsummary-pair">{it.tech} ↔ {p.partner}</span>
                              <span className="dmkt2__netsummary-subn">{p.n.toLocaleString()}건</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </aside>
                  </div>
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'concept-tech-sankey') && (
              <div className="dmkt2__card-item dmkt2__card-item--r5" style={spanStyle(widgetSize('concept-tech-sankey'))}>
                <section className="dcard">
                  <SectionHeader title="개념 → 기술 Sankey" hint="posting_concept 실측" />
                  <p className="dmkt2__takeaway">"이 개념을 하려면 어떤 기술" — 개념이 요구하는 스택 흐름.</p>
                  <ConceptTechSankeyWidget pool={pool} />
                </section>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ④ 지역·기업 — 어디서, 누가 뽑나(누적). 지역별 밀도는 국내 전용. */}
      {sec4Visible && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h">
            <h2>④ 지역·기업</h2>
            <span>어디서, 누가 뽑나 — 누적</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--region4">
            {!isWidgetHidden('market', 'region-density') && (
              <div className={`dmkt2__card-item${regionDisabled ? ' dmkt2__card-item--disabled' : ''}`} style={spanStyle(widgetSize('region-density'))}>
                <section className="dcard">
                  <SectionHeader title="지역별 공고 밀도" hint={scoped ? `구 단위 · ${myCategory}` : '구 단위 · 국내'} />
                  <div className="dmkt2__bars">
                    {regionDensity.map((r) => (
                      <div key={r.district} className="dmkt2__bar">
                        <span className="dmkt2__bar-t">{r.district}</span>
                        <span className="dmkt2__bar-track"><i style={{ width: `${(r.count / maxRegion) * 100}%` }} /></span>
                        <span className="dmkt2__bar-v">{r.count}건</span>
                      </div>
                    ))}
                  </div>
                  {regionDisabled && <span className="dmkt2__disabled-note">국내 전용 — 글로벌 region 데이터 없음</span>}
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'hot-companies') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('hot-companies'))}>
                <section className="dcard">
                  <SectionHeader title="최근 90일 활발 기업" hint={scoped ? myCategory ?? undefined : undefined} />
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
              </div>
            )}
            {!isWidgetHidden('market', 'scatter') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('scatter'))}>
                <section className="dcard">
                  <SectionHeader title="수요 × 빈도" hint="국내 · 상위 16개 기술" />
                  <MarketScatter items={scatterItems} />
                </section>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ⑤ 글로벌 · 해외 트렌드 — pool≠'domestic'일 때만(스펙 §4-1). */}
      {sec5Visible && (
        <section className="dmkt2__sec dmkt2__sec--global">
          <header className="dmkt2__sec-h">
            <h2>⑤ 글로벌 · 해외 트렌드</h2>
            <span>GitHub · HN · 해외 공고 기준</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--global4">
            {!isWidgetHidden('market', 'global-domestic-lag') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('global-domestic-lag'))}>
                <GlobalDomesticLagWidget />
              </div>
            )}
            {!isWidgetHidden('market', 'hype-vs-hire') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('hype-vs-hire'))}>
                <HypeVsHireWidget size={widgetSize('hype-vs-hire')} />
              </div>
            )}
            {!isWidgetHidden('market', 'global-domestic-gap') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('global-domestic-gap'))}>
                <GlobalDomesticGapWidget size={widgetSize('global-domestic-gap')} />
              </div>
            )}
            {!isWidgetHidden('market', 'github-chronicle') && (
              <div className="dmkt2__card-item" style={spanStyle(widgetSize('github-chronicle'))}>
                <GithubChronicleWidget size={widgetSize('github-chronicle')} />
              </div>
            )}
          </div>
        </section>
      )}

      <div className="dmkt2__footnote">그 외(국내 더보기): 직무→스킬 Sankey · 신입 문호(숨김 · 복구 가능)</div>
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

/* ───────────────── 마이 — 프로필 · 이력서 · 활동(대시보드/시장과 통일된 커맨드센터 톤) ─────────────────
   상단 검정 히어로(대시보드 HeroStat 계열과 시각적으로 호응) + 2컬럼 본문(.dmy__body).
   좌측(main): 내 이력서 · 보유 기술 · 북마크한 공고. 우측(aside): 활동 요약 · 최근 본 공고 · 바로가기.
   이력서는 단일화되어(Task 9-A) 여러 개 중 하나를 "활성"으로 고르는 개념이 아니므로
   문구도 "내 이력서"로 통일한다. */
export function DesktopMy() {
  const navigate = useNavigate()
  const { user, isAuthed } = useAuth()
  const { resumes, activeResume, updateResume, deleteResume, setPrimary } = useResumesState()
  const skills = activeResume?.skills ?? []
  const coverage = activeResume?.coveragePct ?? calculateCoverage(skills, '국내')
  const name = user?.nickname ?? '리버'
  const email = user?.email ?? 'bootcamp@example.com'
  const initial = (user ? (user.nickname || user.email) : 'RV').slice(0, 2).toUpperCase()

  const [skillModalOpen, setSkillModalOpen] = useState(false)

  const postings = useMemo(() => getDynamicPostings(skills), [skills])

  const bookmarkIds = useBookmarks()
  const bookmarkedPostings = useMemo(
    () => bookmarkIds.map((id) => postings.find((p) => p.id === id)).filter((p): p is typeof postings[number] => !!p),
    [bookmarkIds, postings],
  )
  const bookmarksVisible = bookmarkedPostings.slice(0, 5)

  const recentViewIds = useRecentViews(5)
  const recentViewPostings = useMemo(
    () => recentViewIds.map((id) => postings.find((p) => p.id === id)).filter((p): p is typeof postings[number] => !!p),
    [recentViewIds, postings],
  )

  return (
    <div className="dpage dmy">
      <header className="dmy__head">
        <h1 className="dmy__title">마이</h1>
        <div className="dmy__sub">내 프로필 · 이력서 · 활동</div>
      </header>

      <div className="dmy__top">
        <section className="dmy__hero">
          <span className="dmy__hero-avatar">{isAuthed ? initial : <User size={22} strokeWidth={2} />}</span>
          <div className="dmy__hero-id">
            {isAuthed ? (
              <>
                <span className="dmy__hero-nm">{name}</span>
                <span className="dmy__hero-em">{email}</span>
                <div className="dmy__hero-stats">
                  <span><b>{skills.length}</b> 보유 기술</span>
                  <span><b>{coverage}%</b> 커버리지</span>
                  <span><b>{bookmarkedPostings.length}</b> 북마크</span>
                </div>
              </>
            ) : (
              <span className="dmy__hero-nm">로그인을 해 주세요</span>
            )}
          </div>
          <button className="dmy__hero-edit" onClick={() => navigate(isAuthed ? '/settings/account' : '/login')}>
            {isAuthed ? '내 정보 수정' : '로그인'}
          </button>
        </section>

        <div className="dmy__stats">
          <StatTile label="북마크" value={bookmarkedPostings.length} unit="건" />
          <StatTile label="최근 본 공고" value={recentViewPostings.length} unit="건" />
          <StatTile label="커버리지" value={coverage} unit="%" />
        </div>
      </div>

      <div className="dmy__body">
        <div className="dmy__main">
          <section className="dcard">
            <SectionHeader title="내 이력서" hint={`${resumes.length}개`} right={
              <button className="dpage__more" onClick={() => navigate('/resume/new')}>새 이력서 추가</button>
            } />
            {resumes.length === 0 ? (
              <div className="dmy__resume-empty">
                <span>이력서를 등록해보세요</span>
                <button className="dmy__resume-btn" onClick={() => navigate('/resume/new')}>이력서 등록하기</button>
              </div>
            ) : (
              <div className="dmy__jobs">
                {resumes.map((r) => (
                  <div key={r.id} className="dmy__resume" style={{ alignItems: 'center' }}>
                    <span className="dmy__resume-ic"><FileText size={18} /></span>
                    <span className="djobs__row-b" onClick={() => navigate(`/resume/${r.id}/edit`)} style={{ cursor: 'pointer' }}>
                      <span className="djobs__row-t">{r.title}</span>
                      <span className="djobs__row-c">{r.position || '직무 미정'} · 보유 기술 {r.skills.length}개</span>
                    </span>
                    {r.isPrimary ? (
                      <span className="dpage__more">기본</span>
                    ) : (
                      <button className="dpage__more" onClick={() => setPrimary(r.id)}>기본으로</button>
                    )}
                    <button
                      className="dpage__more"
                      onClick={() => { if (window.confirm(`'${r.title}'을(를) 삭제할까요?`)) deleteResume(r.id) }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dcard">
            <SectionHeader
              title="보유 기술"
              hint={`${skills.length}개`}
              right={activeResume && (
                <button className="dmy__manage" onClick={() => setSkillModalOpen(true)}>기술 관리</button>
              )}
            />
            <div className="dmy__skills">
              {!activeResume ? (
                <div className="dpage__empty">이력서를 먼저 등록해주세요.</div>
              ) : (
                <>
                  {skills.map((s) => <SkillChip key={s} tech={s} />)}
                  {skills.length === 0 && <div className="dpage__empty">등록된 기술이 없어요.</div>}
                </>
              )}
            </div>
          </section>

          <section className="dcard">
            <SectionHeader title="북마크한 공고" hint={`${bookmarkedPostings.length}건`} right={
              <button className="dpage__more" onClick={() => navigate('/jobs')}>전체 보기</button>
            } />
            {bookmarksVisible.length === 0 ? (
              <div className="dpage__empty">공고 상세에서 북마크하면 여기 모여요.</div>
            ) : (
              <>
                <div className="dmy__jobs">
                  {bookmarksVisible.map((p) => (
                    <JobCardCompact
                      key={p.id}
                      job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
                      logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
                      onOpen={() => navigate(`/job/${encodeURIComponent(p.id)}`)}
                    />
                  ))}
                </div>
                {bookmarkedPostings.length > bookmarksVisible.length && (
                  <div className="dmy__more-txt">{bookmarkedPostings.length - bookmarksVisible.length}개 더</div>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="dmy__aside">
          <section className="dcard">
            <SectionHeader title="최근 본 공고" />
            {recentViewPostings.length === 0 ? (
              <div className="dpage__empty">최근 본 공고가 없어요.</div>
            ) : (
              <div className="dmy__recent">
                {recentViewPostings.map((p) => (
                  <button key={p.id} className="djobs__row" onClick={() => navigate(`/job/${encodeURIComponent(p.id)}`)}>
                    <CompanyLogo logo={p.logo} name={p.company} size={34} radius={9} />
                    <span className="djobs__row-b">
                      <span className="djobs__row-t">{p.title}</span>
                      <span className="djobs__row-c">{p.company}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="dcard">
            <SectionHeader title="바로가기" />
            <div className="kit-menulist">
              <MenuRow icon={<Settings size={17} />} label="계정 설정" onClick={() => navigate('/settings')} />
              <MenuRow icon={<FileText size={17} />} label="이력서 관리" onClick={() => navigate('/resume/submit')} />
              <MenuRow icon={<Award size={17} />} label="자격증 갭" onClick={() => navigate('/cert-gap')} />
            </div>
          </section>
        </aside>
      </div>

      <SkillManagerModal
        open={skillModalOpen && !!activeResume}
        onClose={() => setSkillModalOpen(false)}
        owned={skills}
        onChange={(next) => {
          if (!activeResume) return
          updateResume(activeResume.id, resumeToUpsertPayload({
            ...activeResume,
            skills: next,
            careerMin: activeResume.careerMin ?? 0,
            careerMax: activeResume.careerMax ?? 0,
            pool: activeResume.pool ?? '국내',
          }))
        }}
      />
    </div>
  )
}
