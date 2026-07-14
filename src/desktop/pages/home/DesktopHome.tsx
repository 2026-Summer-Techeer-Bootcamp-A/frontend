import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../../career/authStore'
import { useResumesState } from '../../../career/state'
import { useSettings } from '../../../career/settingsStore'
import { homeApi, type FeedPostingDto } from '../../../career/homeApi'
import { jobsApi } from '../../../career/api'
import HomeLeftColumn from './HomeLeftColumn'
import HomeFeedCard from './HomeFeedCard'
import HomeNewsPanel from './HomeNewsPanel'
import HomeFilterPopover, { type HomeFilterValues } from './HomeFilterPopover'
import './DesktopHome.css'

const PAGE_SIZE = 20
// 백엔드 job-categories 로드 실패 시 폴백(비주얼 스펙 기준 대표 카테고리).
const DEFAULT_CATEGORIES = ['백엔드', '프론트엔드', 'AI/ML', '데이터', '모바일', 'DevOps', '기획']

type PoolFilter = 'all' | 'domestic' | 'global'

function dateLabel(iso: string | null): string {
  if (!iso) return '날짜 미상'
  const d = new Date(iso)
  const today = new Date()
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86400000)
  if (diffDays <= 0) return '오늘'
  if (diffDays === 1) return '어제'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

function groupByDate(items: FeedPostingDto[]): { label: string; items: FeedPostingDto[] }[] {
  const groups: { label: string; items: FeedPostingDto[] }[] = []
  for (const item of items) {
    const label = dateLabel(item.post_date)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

function FeedCardSkeleton() {
  return (
    <div className="hfeed-card--skel" aria-hidden="true">
      <div className="row">
        <div className="hfeed-skel logo" />
        <div style={{ flex: 1 }}>
          <div className="hfeed-skel ln1" />
          <div className="hfeed-skel ln2" />
        </div>
        <div className="hfeed-skel ring" />
      </div>
      <div className="chiprow">
        <div className="hfeed-skel chip" />
        <div className="hfeed-skel chip" />
        <div className="hfeed-skel chip" />
      </div>
    </div>
  )
}

export default function DesktopHome() {
  const { isAuthed } = useAuth()
  const { activeResume } = useResumesState()
  const { settings } = useSettings()
  // 기본 풀은 국내 — 순서도 국내/해외/전체로 노출한다(2026-07-13 사용자 피드백).
  const [pool, setPool] = useState<PoolFilter>('domestic')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [items, setItems] = useState<FeedPostingDto[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [asOf, setAsOf] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 상세 필터 — 검색 페이지(DesktopJobs)의 지역/마감임박/매치율 하한 파라미터를 그대로 미러링.
  const [district, setDistrict] = useState('')
  const [deadlineWithinDays, setDeadlineWithinDays] = useState<number | undefined>(undefined)
  const [minMatch, setMinMatch] = useState<number | undefined>(undefined)
  const [industry, setIndustry] = useState<string | undefined>(undefined)
  const [skills, setSkills] = useState<string[]>([])
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  // 정렬 — 최신순/매칭순. 매칭순은 로그인 + 활성 이력서가 있을 때만 의미가 있다(표시 모드라 필터 카운트에는 안 잡힘).
  const [sort, setSort] = useState<'latest' | 'match'>('latest')
  // min_match는 로그인 + 활성 이력서가 있을 때만 의미가 있다.
  const showMinMatch = isAuthed && !!activeResume
  const appliedFilterCount =
    (district.trim() ? 1 : 0) +
    (deadlineWithinDays != null ? 1 : 0) +
    (showMinMatch && minMatch != null ? 1 : 0) +
    (industry != null ? 1 : 0) +
    (skills.length > 0 ? 1 : 0)

  const applyFilterPopover = (next: HomeFilterValues) => {
    setDistrict(next.district)
    setDeadlineWithinDays(next.deadlineWithinDays)
    setMinMatch(showMinMatch ? next.minMatch : undefined)
    setIndustry(next.industry)
    setSkills(next.skills)
  }

  // 매칭순 옵션이 사라지면(로그아웃 등) 정렬 상태를 최신순으로 강제 복귀한다.
  useEffect(() => {
    if (!showMinMatch) setSort('latest')
  }, [showMinMatch])

  // 카테고리 칩은 선택된 풀(국내/해외/전체)에 실제로 존재하는 카테고리만 보여줘야 한다 —
  // pool을 안 넘기면 전체 어휘가 섞여 국내 탭에도 해외 전용 카테고리가 노출되는 버그가 있었다.
  useEffect(() => {
    jobsApi
      .categories(pool === 'all' ? undefined : pool)
      .then((res) => {
        const names = res.categories.map((c) => c.name).filter(Boolean)
        if (names.length > 0) setCategories(names)
        // 풀이 바뀌어 현재 선택된 카테고리가 새 목록에 없으면 필터가 조용히 빈 결과로 새지 않도록 리셋한다.
        setCategory((prev) => (prev && names.length > 0 && !names.includes(prev) ? undefined : prev))
      })
      .catch(() => {
        // 실패 시 기본 카테고리 목록을 그대로 유지한다.
      })
  }, [pool])

  const loadPage = useCallback(
    async (nextPage: number, reset: boolean) => {
      setLoading(true)
      setError(false)
      try {
        const res = await homeApi.feed({
          page: nextPage,
          page_size: PAGE_SIZE,
          pool: pool === 'all' ? undefined : pool,
          category,
          district: district.trim() || undefined,
          deadline_within_days: deadlineWithinDays,
          min_match: showMinMatch ? minMatch : undefined,
          sort,
          industry,
          skills: skills.length > 0 ? skills.join(',') : undefined,
          rich_only: settings.richOnly || undefined,
        })
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]))
        setTotal(res.total)
        setPage(nextPage)
        setAsOf(res.as_of)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [pool, category, district, deadlineWithinDays, minMatch, showMinMatch, sort, industry, skills, settings.richOnly],
  )

  useEffect(() => {
    loadPage(1, true)
    // pool/category/상세 필터/정렬/표시 설정 변경 시 목록을 리셋해서 1페이지부터 다시 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, category, district, deadlineWithinDays, minMatch, sort, industry, skills, settings.richOnly])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loading && !error && items.length < total) {
          loadPage(page + 1, false)
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading, error, items.length, total, page, loadPage])

  const groups = useMemo(() => groupByDate(items), [items])
  // 기술스택 필터 옵션은 API에서 따로 안 받아오고, 현재 로드된 공고들의 skills 합집합 +
  // 이미 선택된 스킬(현재 화면엔 없어도 칩이 사라지지 않도록)로 구성한다 — placeholders.tsx의 techOptions와 동일 패턴.
  const skillOptions = useMemo(
    () => [...new Set([...skills, ...items.flatMap((item) => item.skills)])].sort((a, b) => a.localeCompare(b)),
    [items, skills],
  )
  const showInitialSkeleton = loading && items.length === 0 && !error
  const showEmpty = !loading && !error && items.length === 0
  const showInitialError = error && items.length === 0

  return (
    <div className="hfeed">
      <aside className="hfeed__left">
        <HomeLeftColumn />
      </aside>

      <main className="hfeed__center">
        <div className="hfeed-filter">
          <div className="hfeed-filter__row1">
            <div className="hfeed-filter__pool">
              <button type="button" className={pool === 'domestic' ? 'is-on' : ''} onClick={() => setPool('domestic')}>국내</button>
              <button type="button" className={pool === 'global' ? 'is-on' : ''} onClick={() => setPool('global')}>해외</button>
              <button type="button" className={pool === 'all' ? 'is-on' : ''} onClick={() => setPool('all')}>전체</button>
            </div>
            <div className="hfeed-filter__sort">
              {showMinMatch ? (
                <>
                  <button type="button" className={sort === 'latest' ? 'is-on' : ''} onClick={() => setSort('latest')}>최신순</button>
                  <button type="button" className={sort === 'match' ? 'is-on' : ''} onClick={() => setSort('match')}>매칭순</button>
                </>
              ) : (
                <span className="hfeed-filter__sort-static">최신순</span>
              )}
            </div>
            <div className="hfeed-filter__more-wrap">
              <button
                type="button"
                className={`hfeed-filter__more${appliedFilterCount > 0 ? ' is-active' : ''}`}
                onClick={() => setFilterPopoverOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={filterPopoverOpen}
              >
                <SlidersHorizontal size={14} />
                상세 필터
                {appliedFilterCount > 0 && <span className="hfeed-filter__badge tnum">{appliedFilterCount}</span>}
              </button>
              {filterPopoverOpen && (
                <HomeFilterPopover
                  values={{ district, deadlineWithinDays, minMatch, industry, skills }}
                  showMinMatch={showMinMatch}
                  skillOptions={skillOptions}
                  onClose={() => setFilterPopoverOpen(false)}
                  onApply={applyFilterPopover}
                />
              )}
            </div>
          </div>
          <div className="hfeed-filter__cats">
            <button
              type="button"
              className={`hfeed-filter__chip${category === undefined ? ' is-on' : ''}`}
              onClick={() => setCategory(undefined)}
            >
              전체
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`hfeed-filter__chip${category === c ? ' is-on' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {showInitialError && (
          <div className="hfeed-error">
            <div className="hfeed-error__title">공고를 불러오지 못했어요</div>
            <div className="hfeed-error__body">네트워크 상태를 확인하고 다시 시도해 주세요.</div>
            <button type="button" className="hfeed-error__btn" onClick={() => loadPage(1, true)}>다시 시도</button>
          </div>
        )}

        {showEmpty && (
          <div className="hfeed-empty">
            <div className="hfeed-empty__glyph"><Search size={22} /></div>
            <div className="hfeed-empty__title">표시할 공고가 없어요</div>
            <div className="hfeed-empty__body">필터를 바꾸거나 잠시 후 다시 확인해 주세요.</div>
          </div>
        )}

        {showInitialSkeleton && Array.from({ length: 4 }).map((_, i) => <FeedCardSkeleton key={i} />)}

        {groups.map((group) => (
          <div key={`${group.label}-${group.items[0].id}`}>
            <div className={`hfeed-divider${group.label === '오늘' ? ' hfeed-divider--today' : ''}`}>
              <span className="hfeed-divider__dot" />
              <span className="hfeed-divider__label">{group.label}</span>
              <span className="hfeed-divider__rule" />
            </div>
            {group.items.map((posting) => (
              <HomeFeedCard key={posting.id} posting={posting} asOf={asOf} />
            ))}
          </div>
        ))}

        {!showInitialSkeleton && loading && items.length > 0 && (
          <>
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </>
        )}

        <div ref={sentinelRef} aria-hidden />
      </main>

      <aside className="hfeed__right">
        <HomeNewsPanel isAuthed={isAuthed} pool={pool} />
      </aside>
    </div>
  )
}
