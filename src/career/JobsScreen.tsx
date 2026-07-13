import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronUp, SearchX } from 'lucide-react'
import { SubScreen, PoolToggle } from './charts'
import { EmptyState } from './states'
import { CardModeToggle, JobCardCompact, type CardMode } from './kit'
import { JobCard } from './CareerDashboard'
import CompanyLogo from './CompanyLogo'
import { useResumesState } from './state'
import { recruitmentApi, type PostingCardDto } from './recruitmentApi'
import { getAuthToken } from './authStore'
import { useSearchParams } from 'react-router-dom'
import JobsPagination, { parseJobPage, parseJobPageSize, type JobPageSize } from './JobsPagination'

type Pool = '국내' | '국외'
type Sort = 'match' | 'latest'

function careerLabel(min: number | null, max: number | null) {
  if (!min) return '신입·무관'
  return max && max !== min ? `경력 ${min}~${max}년` : `경력 ${min}년+`
}

const SORTS: { key: Sort; label: string }[] = [
  { key: 'match', label: '매칭순' },
  { key: 'latest', label: '최신순' },
]
const POSITION_API: Record<string, string> = {
  '백엔드': 'backend', '프론트엔드': 'frontend', '풀스택': 'fullstack', '데이터/AI': 'data',
  '모바일': 'mobile', '인프라/DevOps': 'devops', '기획/PM': 'pm', '디자인': 'design', 'QA': 'qa', '기타': 'other',
}

export default function JobsScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [pool, setPool] = useState<Pool>(() => searchParams.get('pool') === 'global' ? '국외' : '국내')
  const [mode, setMode] = useState<CardMode>('full')
  const [sort, setSort] = useState<Sort>(() => searchParams.get('sort') === 'latest' ? 'latest' : 'match')
  const [page, setPage] = useState(() => parseJobPage(searchParams.get('page')))
  const [pageSize, setPageSize] = useState<JobPageSize>(() => parseJobPageSize(searchParams.get('page_size')))
  const [postings, setPostings] = useState<PostingCardDto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { activeResume } = useResumesState()
  const activeSkills = activeResume ? activeResume.skills : []
  const tech = searchParams.get('tech') ?? ''
  const position = searchParams.get('position') ?? ''
  const deadlineOnly = searchParams.get('deadline') === '1'

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    q.trim() ? next.set('q', q.trim()) : next.delete('q')
    next.set('pool', pool === '국내' ? 'domestic' : 'global')
    next.set('page', String(page))
    next.set('page_size', String(pageSize))
    next.set('sort', sort)
    setSearchParams(next, { replace: true })
    // searchParams is intentionally read only for filters owned by the desktop layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, pool, page, pageSize, sort, setSearchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    const resumeId = Number(activeResume?.id)
    const hasMatchedResume = Number.isInteger(resumeId) && !!getAuthToken()
    recruitmentApi.postings({
      pool: pool === '국내' ? 'domestic' : 'global', q: q.trim() || undefined,
      page, page_size: pageSize, sort,
      skills: tech || undefined,
      position: position ? POSITION_API[position] ?? position : undefined,
      deadline_within_days: deadlineOnly ? 7 : undefined,
      ...(hasMatchedResume ? { resume_id: resumeId } : {}),
    })
      .then((result) => {
        if (cancelled) return
        setPostings(result.items)
        setTotal(result.total)
        const lastPage = Math.max(1, Math.ceil(result.total / result.page_size))
        if (page > lastPage) setPage(lastPage)
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : '공고를 불러오지 못했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [pool, q, sort, page, pageSize, tech, position, deadlineOnly, activeResume?.id])

  const dynamicPostings = useMemo(() => postings.map((p) => {
    const held = p.skills.filter((skill) => activeSkills.includes(skill))
    const matched = p.matched_count ?? held.length
    const total = p.skills.length
    return {
      id: String(p.id), title: p.title, company: p.company ?? '회사명 미상', pool,
      postDate: p.post_date ?? '', closeDate: p.close_date ?? '', techs: p.skills,
      matchHeld: matched, matchTotal: total, matchPct: total ? Math.round(matched / total * 100) : 0,
      gap: p.skills.filter((skill) => !activeSkills.includes(skill)), careerMin: null, careerMax: null,
      tier: null, region: null, logo: '', url: p.url,
    }
  }), [postings, activeSkills, pool])

  const list = dynamicPostings

  return (
    <SubScreen title="채용 공고">
      <div className="scr-searchbar">
        <Search size={17} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="회사 · 공고 검색" />
      </div>

      <div className="scr-toolbar" style={{ justifyContent: 'space-between' }}>
        <PoolToggle pool={pool} onChange={(value) => { setPool(value); setPage(1) }} />
        <CardModeToggle mode={mode} onChange={setMode} />
      </div>
      <div className="scr-chipsel" style={{ marginTop: 10 }}>
        {SORTS.map((s) => (
          <button key={s.key} className={sort === s.key ? 'on' : ''} onClick={() => { setSort(s.key); setPage(1) }}>{s.label}</button>
        ))}
      </div>

      <div className="scr-asof" style={{ marginTop: 12 }}>전체 {total.toLocaleString()}건</div>

      <div style={{ marginTop: 8 }}>
        {loading ? (
          <div className="cr-empty">채용공고를 불러오는 중입니다.</div>
        ) : error ? (
          <EmptyState icon={<SearchX size={26} />} title="공고를 불러오지 못했습니다" desc={error} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<SearchX size={26} />}
            title={q.trim() ? '검색 결과가 없어요' : '조건에 맞는 공고가 없어요'}
            desc={q.trim() ? <>‘{q.trim()}’와 일치하는 공고를 찾지 못했어요. 다른 키워드로 검색해보세요.</> : '풀·정렬 조건을 바꿔보세요.'}
            secondaryLabel={q.trim() ? '검색 지우기' : undefined}
            onSecondary={() => setQ('')}
          />
        ) : mode === 'compact' ? (
          list.map((p) => {
            return (
              <JobCardCompact
                key={p.id}
                job={{ company: p.company, title: p.title, matchPct: p.matchPct, careerLabel: careerLabel(p.careerMin, p.careerMax) }}
                logo={<CompanyLogo logo={p.logo} name={p.company} size={40} radius={11} />}
                onOpen={() => window.open(p.url, '_blank', 'noopener,noreferrer')}
              />
            )
          })
        ) : (
          list.map((p) => {
            return (
              <JobCard
                key={p.id}
                p={p}
                mySkills={activeSkills}
                onOpen={() => window.open(p.url, '_blank', 'noopener,noreferrer')}
              />
            )
          })
        )}
      </div>
      {!loading && !error && (
        <JobsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      )}
      <div style={{ height: 20 }} />

      <button
        className="scr-totop" aria-label="최상단으로"
        onClick={(e) => (e.currentTarget.closest('.screen-scroll') as HTMLElement | null)?.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ChevronUp size={20} />
      </button>
    </SubScreen>
  )
}
