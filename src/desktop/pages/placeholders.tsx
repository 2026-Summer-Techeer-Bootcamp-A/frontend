import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, ArrowUpRight, FileText, Settings, Award, User, Sparkles } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import catData from '../../data/pearl/n.json'
import {
  MiniScore, SectionHeader, SegmentedControl, SkillChip,
  TechIcon, WidgetSettingsMenu,
  StatTile, JobCardCompact, MenuRow,
} from '../../career/kit'
import {
  TechCoNetworkGraph, TrendPropagationGraph, TechYearlyTrendChart,
  TechMoversBar, TierCompareChart, GenerationTrendChart,
  getNetworkTopConnections, getPropagationTopLeaders,
} from '../../career/insights'
import {
  HypeVsHireWidget, CompetencyWidget, ResponseRateWidget, ConceptSignalWidget,
  TrendChronicleWidget, GithubChronicleWidget, GlobalDomesticGapWidget, GithubTopicsWidget,
} from '../../career/wowWidgets'
import { useWidgetData } from '../../career/useWidgetData'
import CompanyLogo from '../../career/CompanyLogo'
import { useResumesState, getDynamicPostings, calculateCoverage, resumeToUpsertPayload } from '../../career/state'
import { getAuthToken, useAuth } from '../../career/authStore'
import { useDashboardConfig, isWidgetHidden, getWidgetSize } from '../../career/dashboardConfig'
import { MARKET_WIDGETS } from '../../career/widgetCatalog'
import { useBookmarks } from '../../career/bookmarkStore'
import { useRecentViews } from '../../career/viewHistoryStore'
import { useSettings } from '../../career/settingsStore'
import { SkillManagerModal } from '../SkillManagerModal'
import { recruitmentApi } from '../../career/recruitmentApi'
import JobsPagination, { parseJobPage, parseJobPageSize, type JobPageSize } from '../../career/JobsPagination'
import { jobsApi, marketApi } from '../../career/api'
import JobsFilterPanel, { type PositionFilterOption, type RegionFilterOption } from './JobsFilterPanel'
import {
  mergeSkillOptions,
  normalizeJobSort,
  parseDeadlineDays,
  type DeadlineDays,
  type JobPool,
  type JobSort,
} from './jobsFilterState'
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
const POSITION_LABEL_BY_API: Record<string, string> = Object.fromEntries(
  Object.entries(POSITION_API).map(([label, value]) => [value, label]),
)
const FALLBACK_POSITION_OPTIONS: PositionFilterOption[] = POSITION_CATS.map((label) => ({
  value: POSITION_API[label],
  label,
}))

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
  const { activeResume } = useResumesState()
  const { settings } = useSettings()
  const skills = activeResume?.skills ?? []
  const resumeId = Number(activeResume?.id)
  const hasMatchedResume = Number.isInteger(resumeId) && !!getAuthToken()

  const [pool, setPool] = useState<JobPool>(() => searchParams.get('pool') === 'global' ? '국외' : '국내')
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<JobSort>(() => {
    const value = searchParams.get('sort')
    return value === 'latest' || value === 'deadline' || value === 'match' ? value : 'match'
  })
  const [page, setPage] = useState(() => parseJobPage(searchParams.get('page')))
  const [pageSize, setPageSize] = useState<JobPageSize>(() => parseJobPageSize(searchParams.get('page_size')))
  const [selId, setSelId] = useState<string | null>(null)
  const [techFilter, setTechFilter] = useState<Set<string>>(() => new Set((searchParams.get('tech') ?? '').split(',').filter(Boolean)))
  const [skillQuery, setSkillQuery] = useState('')
  const [baseSkills, setBaseSkills] = useState<string[]>([])
  const [searchedSkills, setSearchedSkills] = useState<string[]>([])
  const [deadlineDays, setDeadlineDays] = useState<DeadlineDays | undefined>(() => parseDeadlineDays(searchParams))
  const [districtFilter, setDistrictFilter] = useState(() => searchParams.get('district') ?? '')
  const [positionFilter, setPositionFilter] = useState(() => {
    const value = searchParams.get('position')
    return POSITION_CATS.includes(value as PositionCat) ? POSITION_API[value as PositionCat] : value ?? ''
  })
  const [positionOptions, setPositionOptions] = useState<PositionFilterOption[]>(FALLBACK_POSITION_OPTIONS)
  const [regionOptions, setRegionOptions] = useState<RegionFilterOption[]>([])
  const [pvTab, setPvTab] = useState<'desc' | 'company'>('desc')
  const [remoteCards, setRemoteCards] = useState<Awaited<ReturnType<typeof jobsApi.list>> | null>(null)
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState('')
  const [selectedDetail, setSelectedDetail] = useState<Awaited<ReturnType<typeof jobsApi.detail>> | null>(null)
  const effectiveSort = normalizeJobSort(sort, hasMatchedResume, pool)

  useEffect(() => {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    next.set('pool', pool === '국내' ? 'domestic' : 'global')
    next.set('page', String(page))
    next.set('page_size', String(pageSize))
    next.set('sort', effectiveSort)
    if (techFilter.size) next.set('tech', [...techFilter].sort().join(','))
    if (positionFilter) next.set('position', positionFilter)
    if (pool === '국내' && districtFilter) next.set('district', districtFilter)
    if (pool === '국내' && deadlineDays) next.set('deadline_days', String(deadlineDays))
    setSearchParams(next, { replace: true })
  }, [q, pool, page, pageSize, effectiveSort, techFilter, positionFilter, districtFilter, deadlineDays, setSearchParams])

  useEffect(() => {
    if (pool === '국외') {
      setDistrictFilter('')
      setDeadlineDays(undefined)
    }
    if (effectiveSort !== sort) setSort(effectiveSort)
  }, [pool, sort, effectiveSort])

  useEffect(() => {
    let cancelled = false
    jobsApi.categories()
      .then(({ categories }) => {
        if (cancelled) return
        const options = categories
          .filter((category) => category.is_tech)
          .map((category) => ({ value: category.name, label: POSITION_LABEL_BY_API[category.name] ?? category.name }))
        if (options.length) setPositionOptions(options)
      })
      .catch(() => undefined)
    jobsApi.skills('', 100)
      .then(({ skills: items }) => {
        if (!cancelled) setBaseSkills(items.map((item) => item.canonical))
      })
      .catch(() => undefined)
    marketApi.regionDensity({ pool: 'domestic', limit: 100 })
      .then(({ items }) => {
        if (!cancelled) setRegionOptions(items.map((item) => ({ value: item.region_district, count: item.posting_count })))
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const query = skillQuery.trim()
    if (!query) {
      setSearchedSkills([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      jobsApi.skills(query)
        .then(({ skills: items }) => { if (!cancelled) setSearchedSkills(items.map((item) => item.canonical)) })
        .catch(() => { if (!cancelled) setSearchedSkills([]) })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [skillQuery])

  useEffect(() => {
    let cancelled = false
    setJobsLoading(true)
    setJobsError('')
    setRemoteCards(null)
    jobsApi.list({
      pool: pool === '국내' ? 'domestic' : 'global',
      q: q.trim() || undefined,
      skills: techFilter.size ? [...techFilter].join(',') : undefined,
      position: positionFilter || undefined,
      district: pool === '국내' ? districtFilter || undefined : undefined,
      sort: effectiveSort,
      deadline_within_days: pool === '국내' ? deadlineDays : undefined,
      rich_only: settings.richOnly || undefined,
      page,
      page_size: pageSize,
      resume_id: hasMatchedResume ? resumeId : undefined,
    }, getAuthToken()).then((result) => {
      if (!cancelled) setRemoteCards(result)
    }).catch((reason) => {
      if (!cancelled) setJobsError(reason instanceof Error ? reason.message : '공고를 불러오지 못했습니다.')
    }).finally(() => { if (!cancelled) setJobsLoading(false) })
    return () => { cancelled = true }
  }, [pool, q, effectiveSort, techFilter, deadlineDays, districtFilter, positionFilter, page, pageSize, hasMatchedResume, resumeId, settings.richOnly])

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
    () => mergeSkillOptions(
      [...techFilter],
      skillQuery.trim() ? searchedSkills : [...baseSkills, ...postings.flatMap((posting) => posting.techs)],
    ),
    [baseSkills, postings, searchedSkills, skillQuery, techFilter],
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
  const changePool = (value: JobPool) => {
    setPool(value)
    if (value === '국외') {
      setDistrictFilter('')
      setDeadlineDays(undefined)
    }
    setPage(1)
  }
  const resetFilters = () => {
    setQ('')
    setPool('국내')
    setTechFilter(new Set())
    setSkillQuery('')
    setPositionFilter('')
    setDistrictFilter('')
    setDeadlineDays(undefined)
    setSort(hasMatchedResume ? 'match' : 'latest')
    setPage(1)
  }
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
        <JobsFilterPanel
          hasResume={hasMatchedResume}
          resumeTitle={activeResume?.title}
          onResumeRegister={() => navigate('/resume/submit')}
          query={q}
          onQueryChange={(value) => { setQ(value); setPage(1) }}
          pool={pool}
          onPoolChange={changePool}
          skillQuery={skillQuery}
          onSkillQueryChange={setSkillQuery}
          skillGroups={techGroups}
          selectedSkills={techFilter}
          onToggleSkill={toggleTech}
          onClearSkills={() => { setTechFilter(new Set()); setPage(1) }}
          position={positionFilter}
          positionOptions={positionOptions}
          onPositionChange={(value) => { setPositionFilter(value); setPage(1) }}
          district={districtFilter}
          regionOptions={regionOptions}
          onDistrictChange={(value) => { setDistrictFilter(value); setPage(1) }}
          deadlineDays={deadlineDays}
          onDeadlineDaysChange={(value) => { setDeadlineDays(value); setPage(1) }}
          sort={effectiveSort}
          onSortChange={(value) => { setSort(value); setPage(1) }}
          onReset={resetFilters}
          total={remoteCards?.total ?? 0}
        />

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
  const { weeks, total, activeDays, peak } = useMemo(() => {
    const counts = new Map(daily.map((day) => [day.date, day.total]))

    const endDate = parseSeoulDateKey(asOf)
    const rangeStart = new Date(endDate.getTime() - 364 * DAY_MS)
    const startSunday = new Date(rangeStart.getTime() - rangeStart.getUTCDay() * DAY_MS)
    const endSaturday = new Date(endDate.getTime() + (6 - endDate.getUTCDay()) * DAY_MS)
    const rangeStartKey = toSeoulDateKey(rangeStart)
    const visibleCounts = Array.from(counts.entries())
      .filter(([date]) => date >= rangeStartKey && date <= asOf)
      .map(([, count]) => count)
    const maxCount = Math.max(...visibleCounts, 0)
    const result: PostingCalendarWeek[] = []

    for (let cursor = startSunday.getTime(), weekIndex = 0; cursor <= endSaturday.getTime(); cursor += 7 * DAY_MS, weekIndex += 1) {
      const weekStart = new Date(cursor)
      const previousWeek = new Date(cursor - 7 * DAY_MS)
      const monthChanged = weekIndex === 0 || weekStart.getUTCMonth() !== previousWeek.getUTCMonth()
      const days = Array.from({ length: 7 }, (_, dayIndex) => {
        const date = new Date(cursor + dayIndex * DAY_MS)
        const dateKey = toSeoulDateKey(date)
        const count = counts.get(dateKey) ?? 0
        const intensity = count && maxCount ? Math.max(1, Math.ceil(Math.sqrt(count / maxCount) * 4)) : 0
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
      peak: Math.max(...visibleCounts, 0),
    }
  }, [daily, asOf])

  return (
    <div className="dmkt2__calendar">
      <div className="dmkt2__calendar-summary">
        <strong>{total.toLocaleString()}건</strong>
        <span>{activeDays}일에 등록</span>
        <span>하루 최대 {peak.toLocaleString()}건</span>
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

export function DesktopMarket() {
  const navigate = useNavigate()
  useDashboardConfig() // 위젯 표시/숨김 변경 시 리렌더 트리거
  const { activeResume } = useResumesState()
  const domestic = marketData.skillShare['국내'] as { asOf: string; N: number; items: ShareItem[] }
  const top14Mock = useMemo(() => domestic.items.slice(0, 14), [])
  useWidgetData(fetchSkillShareLive, top14Mock)
  useWidgetData(fetchCooccurrenceLive, marketData.cooccurrence)

  // "내 직무 / 전체" 스코프 — 이력서 보유 기술만으로 derivePosition을 태워 파생(title 없이
  // techs 폴백, DesktopJobs의 myCategory와 동일 로직). 이력서 없으면 탭 자체를 숨기고 항상 전체.
  const myCategory = activeResume ? derivePosition('', activeResume.skills) : null
  const [scope, setScope] = useState<'mine' | 'all'>(activeResume ? 'mine' : 'all')
  const scoped = scope === 'mine' && !!myCategory

  const [liveLeaderboard, setLiveLeaderboard] = useState<ShareItem[] | null>(null)
  const [liveNewcomer, setLiveNewcomer] = useState<typeof newcomerGate.data.items | null>(null)
  const [liveHotCompanies, setLiveHotCompanies] = useState<Array<{ company: string; count: number }> | null>(null)
  const [liveRegionDensity, setLiveRegionDensity] = useState<Array<{ district: string; count: number }> | null>(null)
  const [liveRising, setLiveRising] = useState<Array<{ tech: string; delta: number }> | null>(null)
  const [calendarState, setCalendarState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; daily: Array<{ date: string; total: number }>; asOf: string }
  >({ status: 'loading' })
  const [calendarRetry, setCalendarRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    const position = scoped ? myCategory ?? undefined : undefined
    Promise.allSettled([
      marketApi.skillShare({ pool: 'domestic', position, top_k: 14 }),
      marketApi.newcomerGate(),
      marketApi.hotCompanies({ pool: 'domestic', days: 30, limit: 5 }),
      marketApi.regionDensity({ pool: 'domestic', limit: 6 }),
      marketApi.cooccurrence({ pool: 'domestic', top_k: 40 }),
      marketApi.yearlyTrend('domestic'),
    ]).then(([share, newcomer, companies, regions, , yearly]) => {
      if (cancelled) return
      if (share.status === 'fulfilled' && share.value.items.length) setLiveLeaderboard(share.value.items.map((item) => ({ tech: item.canonical, count: item.posting_count, share: item.share, owned: activeResume?.skills.includes(item.canonical) ?? false })))
      if (newcomer.status === 'fulfilled' && newcomer.value.items.length) setLiveNewcomer(newcomer.value.items.map((item) => ({ tech: item.canonical, open_rate: item.open_rate, postings: item.postings, newcomer_n: item.newcomer_postings })))
      if (companies.status === 'fulfilled' && companies.value.items.length) setLiveHotCompanies(companies.value.items.map((item) => ({ company: item.company, count: item.posting_count })))
      if (regions.status === 'fulfilled' && regions.value.items.length) setLiveRegionDensity(regions.value.items.map((item) => ({ district: item.region_district, count: item.posting_count })))
      if (yearly.status === 'fulfilled' && yearly.value.movers.rising.length) setLiveRising(yearly.value.movers.rising.map((item) => ({ tech: item.canonical, delta: item.delta })).slice(0, 3))
    })
    return () => { cancelled = true }
  }, [scoped, myCategory])

  // scope='mine'이면 marketData 전역 리더보드 대신 careerData 재집계(내 직무로 필터한 국내
  // 공고의 기술 빈도)를 리더보드로 쓴다 — "내 직무" 탭이 실제로 다른 숫자를 보여줘야 의미가 있다.
  const mineLeaderboard = useMemo<ShareItem[]>(() => {
    if (!myCategory) return []
    const domesticPostings = (data.postings as { pool: string; title: string; techs: string[] }[])
      .filter((p) => p.pool === '국내' && derivePosition(p.title, p.techs) === myCategory)
    const counts: Record<string, number> = {}
    domesticPostings.forEach((p) => p.techs.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1 }))
    const total = domesticPostings.length || 1
    return Object.entries(counts)
      .map(([tech, count]) => ({ tech, count, share: Math.round((count / total) * 1000) / 10, owned: false }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 14)
  }, [myCategory])

  const top = liveLeaderboard ?? (scoped ? mineLeaderboard : top14Mock)
  const leader = top[0]
  const maxShare = Math.max(...top.map((i) => i.share), 1)

  // "신입에게 열린 기술" — pearl/h.json(신입 지원 가능 비율)을 open_rate 내림차순 상위 8개.
  // 취준생 시점에서 "뽑히는 인기 기술"과 "신입도 지원 가능한 기술"은 다르므로 별도 랭킹.
  const newcomerTop = useMemo(() => (
    [...(liveNewcomer ?? newcomerGate.data.items)].sort((a, b) => b.open_rate - a.open_rate).slice(0, 8)
  ), [liveNewcomer])
  const maxOpenRate = Math.max(...newcomerTop.map((i) => i.open_rate), 1)

  // "지금 뜨는 기술" — techYearly(연도별 점유율) delta 상위 3개, 상승폭 큰 순.
  const mockRisingTop = useMemo(() => (
    [...marketData.techYearly.series].sort((a, b) => b.delta - a.delta).slice(0, 3)
  ), [])
  const risingTop = liveRising ?? mockRisingTop

  const scatterItems = useMemo(() => domestic.items.slice(0, 16).map((i) => ({
    tech: i.tech, share: i.share, count: i.count,
  })), [])

  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)

  const widgetSize = (id: string) => {
    const item = MARKET_WIDGETS.find((w) => w.id === id)!
    return getWidgetSize('market', id, item.defaultSize)
  }

  // careerData postings 기반 위젯(활발 기업 · 지역 밀도 · 규모 분포) — scope='mine'이면 내 직무로
  // 필터한 국내 공고만 집계한다. 나머지 위젯(네트워크·전파·hype·역량·응답률·개념·추이·무버스·
  // 티어비교·세대·산점도)은 전역 집계 데이터라 직무 필터가 없어 그대로 두고 배지만 붙인다.
  const mockHotCompanies = useMemo(() => {
    const cutoff = new Date(data.meta.asOf)
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const domestic30 = (data.postings as { pool: string; company: string; postDate: string; title: string; techs: string[] }[])
      .filter((p) => p.pool === '국내' && p.postDate >= cutoffStr && (!scoped || derivePosition(p.title, p.techs) === myCategory))
    const counts: Record<string, number> = {}
    domestic30.forEach((p) => { counts[p.company] = (counts[p.company] ?? 0) + 1 })
    return Object.entries(counts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [scoped, myCategory])
  const hotCompanies = liveHotCompanies ?? mockHotCompanies
  const maxHot = Math.max(...hotCompanies.map((c) => c.count), 1)

  const mockRegionDensity = useMemo(() => {
    const domesticPostings = (data.postings as { pool: string; district: string; title: string; techs: string[] }[])
      .filter((p) => p.pool === '국내' && (!scoped || derivePosition(p.title, p.techs) === myCategory))
    const counts: Record<string, number> = {}
    domesticPostings.forEach((p) => { if (p.district) counts[p.district] = (counts[p.district] ?? 0) + 1 })
    return Object.entries(counts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [scoped, myCategory])
  const regionDensity = liveRegionDensity ?? mockRegionDensity
  const maxRegion = Math.max(...regionDensity.map((r) => r.count), 1)

  const tierDonut = useMemo(() => {
    const domesticPostings = (data.postings as { pool: string; tier: string | null; title: string; techs: string[] }[])
      .filter((p) => p.pool === '국내' && (!scoped || derivePosition(p.title, p.techs) === myCategory))
    const counts: Record<string, number> = { 대기업: 0, 중견: 0, 중소: 0 }
    domesticPostings.forEach((p) => { if (p.tier && p.tier in counts) counts[p.tier] += 1 })
    const total = counts['대기업'] + counts['중견'] + counts['중소']
    return { counts, total }
  }, [scoped, myCategory])

  useEffect(() => {
    let cancelled = false
    setCalendarState({ status: 'loading' })
    marketApi.postingTimeline({
      pool: 'domestic',
      days: 365,
      position: scoped && myCategory ? CALENDAR_POSITION_API[myCategory] : undefined,
    })
      .then((result) => {
        if (!cancelled) setCalendarState({ status: 'ready', daily: result.daily, asOf: result.as_of })
      })
      .catch((reason) => {
        if (!cancelled) {
          setCalendarState({
            status: 'error',
            message: reason instanceof Error ? reason.message : '캘린더 데이터를 불러오지 못했습니다.',
          })
        }
      })
    return () => { cancelled = true }
  }, [scoped, myCategory, calendarRetry])

  const leaderboardSize = widgetSize('leaderboard')
  const leaderboardShowAll = leaderboardSize === '2x2' || leaderboardExpanded
  const leaderboardVisible = leaderboardShowAll ? top : top.slice(0, 8)

  // 전역 집계 위젯에 붙이는 "전체 시장 기준" 배지 — scope='mine'일 때만 노출.
  const scopeBadge = scoped ? <span className="dmkt2__scopebadge">전체 시장 기준</span> : undefined

  // 라벨 섹션 표시 여부 — 섹션 내 위젯이 전부 숨겨지면 섹션 헤더째로 렌더하지 않는다(대시보드와 동일 패턴).
  const secDemandVisible = !isWidgetHidden('market', 'hero-demand') || !isWidgetHidden('market', 'leaderboard')
  // Hype vs Hire는 글로벌·HN 기준이라 하단 "글로벌 · 해외 트렌드" 섹션으로 이동했다 — 여기 트렌드
  // 섹션은 국내 추이(연도별·무버스) + 개념 연대기(트렌드 크로니클, 전역 집계지만 국내 트렌드 문맥과
  // 함께 두는 게 자연스러워 상단 유지)로 국내 중심을 지킨다.
  const secTrendVisible = !isWidgetHidden('market', 'yearly-trend') || !isWidgetHidden('market', 'movers')
    || !isWidgetHidden('market', 'trend-chronicle')
  const secCompanyVisible = !isWidgetHidden('market', 'competency') || !isWidgetHidden('market', 'response-rate')
    || !isWidgetHidden('market', 'concept-signal') || !isWidgetHidden('market', 'tier-compare')
    || !isWidgetHidden('market', 'hot-companies') || !isWidgetHidden('market', 'region-density')
    || !isWidgetHidden('market', 'tier-donut') || !isWidgetHidden('market', 'posting-calendar')
  // 트렌드 전파 네트워크(propagation)는 글로벌·HN 선행지표 성격이라 하단 글로벌 섹션으로 이동 —
  // 여기 구조·탐색엔 국내 구조(공동출현 네트워크)와 세대별 변화·수요×빈도만 남는다.
  const secExploreVisible = !isWidgetHidden('market', 'network')
    || !isWidgetHidden('market', 'generation-trend') || !isWidgetHidden('market', 'scatter')
  // 하단 신규 섹션 — 글로벌·HN·GitHub 기준 위젯 전용. scope(내 직무/전체) 미적용(전역 데이터).
  const secGlobalVisible = !isWidgetHidden('market', 'hype-vs-hire') || !isWidgetHidden('market', 'propagation')
    || !isWidgetHidden('market', 'github-chronicle') || !isWidgetHidden('market', 'global-domestic-gap')
    || !isWidgetHidden('market', 'github-topics')

  return (
    <div className="dpage dmkt2">
      <header className="dmkt2__head">
        <div className="dmkt2__head-l">
          <h1 className="dmkt2__title">채용 시장</h1>
          <div className="dmkt2__sub">
            {scoped && <>{myCategory} 직무 시장 흐름 · </>}
            국내 채용공고 {domestic.N.toLocaleString()}건 기준{scoped ? '' : ' 시장 흐름'} · 기준일 {domestic.asOf} · 개인화된 내 진단은 대시보드에서 확인하세요
          </div>
        </div>
        <div className="dmkt2__head-r">
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

      {/* 섹션 1 — 수요: 취준생/신입 시점. "뭘 먼저 배워야 뽑히나" + "신입에게 열린 기술" 두
          위젯을 나란히(같은 높이) 주력으로 두고, 검정 히어로는 소형 스탯 한 줄로 축소했다.
          하단엔 "지금 뜨는 기술" 상승폭 상위 3개를 얇은 칩 줄로 덧붙인다. */}
      {secDemandVisible && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h">
            <h2>수요</h2>
            <span>지금 뭘 할 줄 알아야 뽑히나 — 뭘 먼저 배울지 + 신입에게 열린 기술</span>
          </header>
          {!isWidgetHidden('market', 'hero-demand') && leader && (
            <div className="dmkt2__demandstat">
              <TechIcon tech={leader.tech} size={16} />
              가장 많이 요구되는 기술 — <b>{leader.tech}</b>
              <span className="dmkt2__demandstat-v">{leader.share}%</span>
              <span className="dmkt2__demandstat-n">공고 {leader.count.toLocaleString()}건</span>
            </div>
          )}
          <div className="dmkt2__sec-grid dmkt2__sec-grid--demand">
            {!isWidgetHidden('market', 'leaderboard') && (
              <div className="dmkt2__card-item">
                <section className="dcard">
                  <SectionHeader title="상위 요구 기술 Top14" hint={scoped ? myCategory ?? undefined : '국내'} />
                  <p className="dmkt2__takeaway">
                    {scoped && leader
                      ? <><b>{leader.tech}</b>가 {myCategory} 공고의 <b>{leader.share}%</b>를 요구 — 그만큼 지원자도 몰려요.</>
                      : <><b>JavaScript</b>가 국내 공고의 <b>24.2%</b>를 요구 — 3곳 중 1곳 꼴. 근데 그만큼 지원자도 몰려요.</>}
                  </p>
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
              </div>
            )}
            <div className="dmkt2__card-item">
              <section className="dcard">
                <SectionHeader title="신입에게 열린 기술" hint="신입도 지원 가능한 공고 비율" />
                <p className="dmkt2__takeaway">
                  <b className="dmkt2__takeaway-up">{newcomerTop[0].tech}</b>가 신입에게 가장 열려 있어요 — 신입 지원 가능 <b className="dmkt2__takeaway-up">{newcomerTop[0].open_rate}%</b>. 스펙 부담 적은 기술부터 노려보세요.
                </p>
                <div className="dmkt2__bars dmkt2__bars--open">
                  {newcomerTop.map((i) => (
                    <button key={i.tech} className="dmkt2__bar" onClick={() => navigate(`/tech/${encodeURIComponent(i.tech)}`)}>
                      <TechIcon tech={i.tech} size={20} />
                      <span className="dmkt2__bar-t">{i.tech}</span>
                      <span className="dmkt2__bar-track"><i style={{ width: `${(i.open_rate / maxOpenRate) * 100}%` }} /></span>
                      <span className="dmkt2__bar-v">{i.open_rate}%</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
          <div className="dmkt2__rising">
            <span className="dmkt2__rising-label">지금 뜨는 기술</span>
            <div className="dmkt2__rising-chips">
              {risingTop.map((r) => (
                <span key={r.tech} className="dmkt2__rising-chip">
                  <TechIcon tech={r.tech} size={14} />
                  {r.tech}
                  <b className="dmkt2__rising-delta">+{r.delta.toFixed(1)}%p</b>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 섹션 2 — 트렌드: 국내 흐름. 연도별 추이 · 무버스 · 트렌드 연대기, 같은 높이 3열.
          Hype vs Hire는 글로벌·HN 기준이라 하단 "글로벌 · 해외 트렌드" 섹션으로 이동했다. */}
      {secTrendVisible && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h">
            <h2>트렌드</h2>
            <span>지금 배우면 늦었나? — 국내 뜨는 기술과 지는 기술, 연도별 흐름</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--trend">
            {!isWidgetHidden('market', 'yearly-trend') && (
              <div className="dmkt2__card-item">
                <section className="dcard">
                  <SectionHeader title="연도별 점유율 추이" hint="국내 · 단일 소스" right={scopeBadge} />
                  <p className="dmkt2__takeaway">
                    <b className="dmkt2__takeaway-up">Python +9.8%p 급등</b> vs <b>Java −13.8%p 추락</b> (2022→2025) — 지금 뭘 배울지가 갈려요.
                  </p>
                  <TechYearlyTrendChart skills={NO_SKILLS} />
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'movers') && (
              <div className="dmkt2__card-item">
                <section className="dcard">
                  <SectionHeader title="지금 뜨는 기술 / 지는 기술" right={scopeBadge} />
                  <p className="dmkt2__takeaway">
                    떠오르는 건 <b>Python·Next.js·FastAPI</b>, 지는 건 <b>Java·Vue·Spring</b>.
                  </p>
                  <TechMoversBar />
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'trend-chronicle') && (
              <div className="dmkt2__card-item">
                <TrendChronicleWidget size={widgetSize('trend-chronicle')} headerRight={scopeBadge} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 섹션 3 — 기업 · 역량: 회사는 무엇을 원하나. 역량 · 응답률 · 개념시그니처 · 티어비교 ·
          활발기업 · 지역밀도 · 규모분포. auto-fill로 카드 크기에 맞춰 2~3열. */}
      {secCompanyVisible && (
        <section className="dmkt2__sec">
          <header className="dmkt2__sec-h">
            <h2>기업 · 역량</h2>
            <span>회사가 JD에 안 쓰지만 진짜 원하는 것 — 역량·응답률·개념</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--company">
            {!isWidgetHidden('market', 'competency') && (
              <div className="dmkt2__card-item">
                <CompetencyWidget size={widgetSize('competency')} headerRight={scopeBadge} />
              </div>
            )}
            {!isWidgetHidden('market', 'response-rate') && (
              <div className="dmkt2__card-item">
                <ResponseRateWidget size={widgetSize('response-rate')} headerRight={scopeBadge} />
              </div>
            )}
            {!isWidgetHidden('market', 'concept-signal') && (
              <div className="dmkt2__card-item">
                <ConceptSignalWidget size={widgetSize('concept-signal')} headerRight={scopeBadge} />
              </div>
            )}
            {!isWidgetHidden('market', 'tier-compare') && (
              <div className="dmkt2__card-item">
                <section className="dcard">
                  <SectionHeader title="기업 규모별 요구 차이" hint="대기업 · 중견 · 중소" right={scopeBadge} />
                  <p className="dmkt2__takeaway">대기업·중견·중소가 원하는 스택이 다릅니다 — 타겟에 맞춰 준비하세요.</p>
                  <TierCompareChart />
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'hot-companies') && (
              <div className="dmkt2__card-item">
                <section className="dcard">
                  <SectionHeader title="이번 달 활발 기업" hint={scoped ? `최근 30일 · ${myCategory}` : '최근 30일 · 신규 공고 수'} />
                  <p className="dmkt2__takeaway"><b>지금 가장 많이 뽑는 회사</b> — 최근 30일 신규 공고 기준.</p>
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
            {!isWidgetHidden('market', 'region-density') && (
              <div className="dmkt2__card-item">
                <section className="dcard">
                  <SectionHeader title="지역별 공고 밀도" hint={scoped ? `구 단위 · ${myCategory}` : '구 단위 · 국내'} />
                  <p className="dmkt2__takeaway">공고가 몰린 지역 — 어디서 일하게 될 확률이 높은지.</p>
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
              </div>
            )}
            {!isWidgetHidden('market', 'tier-donut') && (
              <div className="dmkt2__card-item">
                <section className="dcard">
                  <SectionHeader title="기업 규모 분포" hint={scoped ? myCategory ?? undefined : '국내'} />
                  <p className="dmkt2__takeaway">국내 공고의 대기업/중견/중소 비율.</p>
                  <TierDonutChart counts={tierDonut.counts} total={tierDonut.total} />
                </section>
              </div>
            )}
            {!isWidgetHidden('market', 'posting-calendar') && (
              <div className="dmkt2__card-item dmkt2__card-item--calendar">
                <section className="dcard dcard--posting-calendar">
                  <SectionHeader
                    title="채용 공고 등록 캘린더"
                    hint={`최근 1년 · ${scoped ? myCategory ?? '내 직무' : '국내'}`}
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
          </div>
        </section>
      )}

      {/* 섹션 4 — 구조 · 탐색: 깊이 보기(국내 구조). 무거운 탐색 그래프(공동출현 네트워크)라
          리서치 플레이북대로 기본 접힘 + 진행적 공개. 전파 네트워크는 글로벌·HN 선행지표라
          하단 "글로벌 · 해외 트렌드" 섹션으로 이동했다. */}
      {secExploreVisible && (
        <section className="dmkt2__sec dmkt2__sec--explore">
          <header className="dmkt2__sec-h dmkt2__sec-h--toggle">
            <div>
              <h2>구조 · 탐색</h2>
              <span>깊이 파보기 — 국내 기술이 어떻게 얽혀 있나</span>
            </div>
            <button className="dmkt2__sec-toggle" onClick={() => setExploreOpen((v) => !v)}>
              {exploreOpen ? '접기' : '더 보기'}
            </button>
          </header>
          {!exploreOpen ? (
            <div className="dmkt2__sec-collapsed">탐색적 분석 3종(공동출현 네트워크 · 세대별 변화 · 수요×빈도) · 펼쳐서 보기</div>
          ) : (
            <div className="dmkt2__sec-grid dmkt2__sec-grid--explore">
              {!isWidgetHidden('market', 'network') && (
                <div className="dmkt2__card-item">
                  <section className="dcard dmkt2__netcell">
                    <SectionHeader title="기술 공동출현 네트워크" hint="함께 요구되는 기술 · force graph" right={scopeBadge} />
                    <p className="dmkt2__takeaway">하나 배우면 딸려오는 기술들 — <b>함께 요구되는 스택 지도</b>.</p>
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
                </div>
              )}
              {!isWidgetHidden('market', 'generation-trend') && (
                <div className="dmkt2__card-item">
                  <section className="dcard">
                    <SectionHeader title="요즘 회사는 예전과 뭘 다르게 쓰나?" hint="설립 세대별" right={scopeBadge} />
                    <p className="dmkt2__takeaway">설립이 최근일수록 <b>Java 지고 Python·클라우드 뜨는</b> 경향.</p>
                    <GenerationTrendChart skills={NO_SKILLS} />
                  </section>
                </div>
              )}
              {!isWidgetHidden('market', 'scatter') && (
                <div className="dmkt2__card-item">
                  <section className="dcard">
                    <SectionHeader title="수요 × 빈도 분포" hint="국내 · 상위 16개 기술" right={scopeBadge} />
                    <p className="dmkt2__takeaway">수요는 높은데 아직 남들이 덜 파는 <b className="dmkt2__takeaway-amber">틈새 기술</b>을 찾아보세요.</p>
                    <MarketScatter items={scatterItems} />
                  </section>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 섹션 5 — 글로벌 · 해외 트렌드: HN·GitHub 기준, 국내 시장과 분리된 별도 신호.
          scope("내 직무/전체")는 여기 적용하지 않는다 — 전역 데이터라 "전체 시장 기준" 성격.
          Hype vs Hire(트렌드에서 이동) · 전파 네트워크(구조·탐색에서 이동) + 신규 3위젯. */}
      {secGlobalVisible && (
        <section className="dmkt2__sec dmkt2__sec--global">
          <header className="dmkt2__sec-h">
            <h2>글로벌 · 해외 트렌드</h2>
            <span>HN·GitHub 기준 · 해외 채용/커뮤니티 흐름</span>
          </header>
          <div className="dmkt2__sec-grid dmkt2__sec-grid--global">
            {!isWidgetHidden('market', 'hype-vs-hire') && (
              <div className="dmkt2__card-item">
                <HypeVsHireWidget size={widgetSize('hype-vs-hire')} />
              </div>
            )}
            {!isWidgetHidden('market', 'propagation') && (
              <div className="dmkt2__card-item">
                <section className="dcard dmkt2__netcell">
                  <SectionHeader title="트렌드 전파 네트워크" hint="선행 기술 → 후행 기술 시차 · 글로벌 기준" />
                  <p className="dmkt2__takeaway"><b>먼저 뜨는 기술이 다음 유행을 예고</b> — 남보다 앞서 준비할 단서.</p>
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
              </div>
            )}
            {!isWidgetHidden('market', 'github-chronicle') && (
              <div className="dmkt2__card-item">
                <GithubChronicleWidget size={widgetSize('github-chronicle')} />
              </div>
            )}
            {!isWidgetHidden('market', 'global-domestic-gap') && (
              <div className="dmkt2__card-item">
                <GlobalDomesticGapWidget size={widgetSize('global-domestic-gap')} />
              </div>
            )}
            {!isWidgetHidden('market', 'github-topics') && (
              <div className="dmkt2__card-item">
                <GithubTopicsWidget size={widgetSize('github-topics')} />
              </div>
            )}
          </div>
        </section>
      )}
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

/* 마이페이지 히어로 옆에 붙는 미니 커버리지 도넛 — 어시스턴트가 쓰는 재사용 링 컴포넌트와는
   별개로, 이 파일 안에서 단순 SVG(stroke-dasharray)로 직접 그린다.
   dim=true(비로그인·이력서 없음)이면 채우기 호를 생략하고 점선 트랙 + "–"만 남긴다. */
function MiniCoverageRing({ pct, dim }: { pct: number; dim: boolean }) {
  const size = 56
  const stroke = 6
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const offset = circumference * (1 - clamped / 100)
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className={`dmy__ring${dim ? ' dmy__ring--dim' : ''}`}
      aria-hidden="true"
    >
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        className="dmy__ring-track"
        strokeWidth={stroke}
        strokeDasharray={dim ? '2 5' : undefined}
      />
      {!dim && (
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          className="dmy__ring-fill"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="dmy__ring-txt">
        {dim ? '–' : `${Math.round(clamped)}%`}
      </text>
    </svg>
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
  // 미니 커버리지 스냅샷 상태 — 로그인 + 이력서 보유일 때만 실값을 보여준다.
  const hasCoverageSnapshot = isAuthed && !!activeResume
  const coverageLabel = !isAuthed
    ? '로그인하면 커버리지를 볼 수 있어요'
    : !activeResume
      ? '이력서를 등록하면 커버리지가 보여요'
      : '내 커버리지 스냅샷'
  const coverageDesc = hasCoverageSnapshot
    ? `보유 기술 ${skills.length}개 기준`
    : '어시스턴트가 갭을 짚어드려요'
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

        <div className="dmy__top-side">
          <div className="dmy__stats">
            <StatTile label="북마크" value={bookmarkedPostings.length} unit="건" />
            <StatTile label="최근 본 공고" value={recentViewPostings.length} unit="건" />
            <StatTile label="커버리지" value={coverage} unit="%" />
          </div>

          <section className={`dmy__coverage dcard${hasCoverageSnapshot ? '' : ' dmy__coverage--dim'}`}>
            <MiniCoverageRing pct={hasCoverageSnapshot ? coverage : 0} dim={!hasCoverageSnapshot} />
            <div className="dmy__coverage-body">
              <span className="dmy__coverage-label">{coverageLabel}</span>
              <span className="dmy__coverage-desc">{coverageDesc}</span>
              <button className="dmy__coverage-btn" onClick={() => navigate('/assistant')}>
                자세히 분석 <ArrowUpRight size={13} strokeWidth={2.4} />
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="dmy__body">
        <div className="dmy__main">
          <section className="dcard">
            <SectionHeader title="내 이력서" hint={`${resumes.length}개`} right={
              <button className="dpage__more" onClick={() => navigate('/resume/new')}>새 이력서 추가</button>
            } />
            {resumes.length === 0 ? (
              <div className="dmy__empty">
                <span>아직 등록한 이력서가 없어요. 이력서를 등록하면 맞춤 공고와 커버리지 분석을 받아볼 수 있어요.</span>
                <button className="dmy__empty-btn" onClick={() => navigate('/resume/new')}>이력서 등록하기</button>
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
                <div className="dmy__empty">
                  <span>이력서를 등록하면 보유 기술을 관리할 수 있어요.</span>
                  <button className="dmy__empty-btn" onClick={() => navigate('/resume/new')}>이력서 등록하기</button>
                </div>
              ) : (
                <>
                  {skills.map((s) => <SkillChip key={s} tech={s} />)}
                  {skills.length === 0 && (
                    <div className="dpage__empty">아직 등록된 기술이 없어요. 위 '기술 관리'에서 추가해보세요.</div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="dcard">
            <SectionHeader title="북마크한 공고" hint={`${bookmarkedPostings.length}건`} right={
              <button className="dpage__more" onClick={() => navigate('/jobs')}>전체 보기</button>
            } />
            {bookmarksVisible.length === 0 ? (
              <div className="dmy__empty">
                <span>아직 북마크한 공고가 없어요. 마음에 드는 공고를 담아두면 여기 모여요.</span>
                <button className="dmy__empty-btn" onClick={() => navigate('/jobs')}>공고 둘러보기</button>
              </div>
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
              <div className="dmy__empty">
                <span>최근 본 공고가 아직 없어요.</span>
                <button className="dmy__empty-btn" onClick={() => navigate('/jobs')}>공고 보러 가기</button>
              </div>
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
              <MenuRow icon={<Sparkles size={17} />} label="어시스턴트로 분석" onClick={() => navigate('/assistant')} />
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
