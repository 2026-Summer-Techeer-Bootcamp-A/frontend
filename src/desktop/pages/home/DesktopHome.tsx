import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useAuth } from '../../../career/authStore'
import { homeApi, type FeedPostingDto } from '../../../career/homeApi'
import { jobsApi } from '../../../career/api'
import HomeLeftColumn from './HomeLeftColumn'
import HomeFeedCard from './HomeFeedCard'
import HomeNewsPanel from './HomeNewsPanel'
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
  const [pool, setPool] = useState<PoolFilter>('all')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [items, setItems] = useState<FeedPostingDto[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [asOf, setAsOf] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    jobsApi
      .categories()
      .then((res) => {
        const names = res.categories.map((c) => c.name).filter(Boolean)
        if (names.length > 0) setCategories(names)
      })
      .catch(() => {
        // 실패 시 기본 카테고리 목록을 그대로 유지한다.
      })
  }, [])

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
    [pool, category],
  )

  useEffect(() => {
    loadPage(1, true)
    // pool/category 변경 시 목록을 리셋해서 다시 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, category])

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
          <div className="hfeed-filter__pool">
            <button type="button" className={pool === 'all' ? 'is-on' : ''} onClick={() => setPool('all')}>전체</button>
            <button type="button" className={pool === 'domestic' ? 'is-on' : ''} onClick={() => setPool('domestic')}>국내</button>
            <button type="button" className={pool === 'global' ? 'is-on' : ''} onClick={() => setPool('global')}>해외</button>
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
