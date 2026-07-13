import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  homeApi,
  type FeedPostingDto,
  type NewsItemDto,
  type NewsResponseDto,
  type NewsSource,
} from '../../../career/homeApi'
import { ddayInfo, useResumesState } from '../../../career/state'

const TAB_LABEL: Record<NewsSource, string> = {
  hackernews: '해커뉴스',
  geeknews: '긱뉴스',
  github: 'GitHub',
}
const TAB_ORDER: NewsSource[] = ['hackernews', 'geeknews', 'github']
const NEWS_PAGE_SIZE = 5

function formatUpdatedCaption(iso: string): string {
  const diffMin = Math.floor((Date.now() - Date.parse(iso)) / 60000)
  if (diffMin < 1) return '방금 갱신'
  if (diffMin < 60) return `${diffMin}분 전 갱신`
  return `${Math.floor(diffMin / 60)}시간 전 갱신`
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatStars(n: number | null): string {
  if (n == null) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// 언어점 저채도 매핑 — 브랜드 원색 대신 팔레트 안에서만 매핑(비주얼 스펙 4.10).
// TypeScript/JavaScript는 blue, Python은 sage, Rust/Go 등 시스템 계열은 clay, 그 외는 기본 slate.
const SYSTEMS_LANGUAGES = new Set(['rust', 'go', 'c', 'c++', 'zig'])

function langDotClass(language: string | null): string {
  const lang = (language ?? '').toLowerCase()
  if (lang === 'typescript' || lang === 'javascript') return ' hfeed-news__langdot--ts'
  if (lang === 'python') return ' hfeed-news__langdot--py'
  if (SYSTEMS_LANGUAGES.has(lang)) return ' hfeed-news__langdot--sys'
  return ''
}

function NewsItemView({ source, item }: { source: NewsSource; item: NewsItemDto }) {
  if (source === 'hackernews') {
    return (
      <div className="hfeed-news__item hfeed-news__item--hn">
        <a className="hfeed-news__title" href={item.url} target="_blank" rel="noreferrer">
          {item.title}
        </a>
        <div className="hfeed-news__meta tnum">
          포인트 <b className="hfeed-news__stat">{item.points ?? 0}</b>
          {' · '}
          {item.comments_url ? (
            <a className="hfeed-news__thread" href={item.comments_url} target="_blank" rel="noreferrer">
              댓글 {item.comments_count ?? 0}
            </a>
          ) : (
            <span>댓글 {item.comments_count ?? 0}</span>
          )}
        </div>
      </div>
    )
  }

  if (source === 'geeknews') {
    // 긱뉴스는 제목이 원문(유튜브 등 외부 링크)으로 바로 나가면 안 되고, 긱뉴스 자체
    // 본문(topic 페이지)으로 가야 한다 — comments_url이 그 본문 URL이다(services/news.py 참고).
    const bodyUrl = item.comments_url ?? item.url
    return (
      <div className="hfeed-news__item hfeed-news__item--gn">
        <a className="hfeed-news__title" href={bodyUrl} target="_blank" rel="noreferrer">
          {item.title}
        </a>
        <a className="hfeed-news__source" href={item.url} target="_blank" rel="noreferrer">
          {hostnameOf(item.url)}
        </a>
        {(item.points != null || item.comments_count != null) && (
          <div className="hfeed-news__meta tnum">
            {item.points != null && (
              <>
                포인트 <b className="hfeed-news__stat">{item.points}</b>
              </>
            )}
            {item.points != null && item.comments_count != null && ' · '}
            {item.comments_count != null && <span>댓글 {item.comments_count}</span>}
          </div>
        )}
      </div>
    )
  }

  const [owner, ...rest] = item.title.split('/')
  const repoName = rest.join('/') || item.title
  return (
    <div className="hfeed-news__item hfeed-news__item--gh">
      <a className="hfeed-news__repo" href={item.url} target="_blank" rel="noreferrer">
        {rest.length > 0 && <span className="owner">{owner}/</span>}
        <b>{repoName}</b>
      </a>
      {item.description && <div className="hfeed-news__desc">{item.description}</div>}
      <div className="hfeed-news__meta tnum">
        <span className={`hfeed-news__langdot${langDotClass(item.language)}`} />
        {item.language ?? '알 수 없음'} · 스타 <b className="hfeed-news__stat">{formatStars(item.stars)}</b>
      </div>
    </div>
  )
}

function NewsListSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="hfeed-news__item" aria-hidden="true">
          <div className="hfeed-skel" style={{ width: '90%', height: 13 }} />
          <div className="hfeed-skel" style={{ width: '55%', height: 13, marginTop: 6 }} />
          <div className="hfeed-skel" style={{ width: '40%', height: 11, marginTop: 8 }} />
        </div>
      ))}
    </>
  )
}

// 우측 컬럼 — LinkedIn 스타일 클릭형 공고 리스트(마감 임박 / 추천). 기존 피드 API만 사용한다.
function PostingListSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="hfeed-plist__row" aria-hidden="true">
          <div style={{ flex: 1 }}>
            <div className="hfeed-skel" style={{ width: '35%', height: 11 }} />
            <div className="hfeed-skel" style={{ width: '80%', height: 13, marginTop: 6 }} />
          </div>
          <div className="hfeed-skel" style={{ width: 36, height: 18, borderRadius: 6 }} />
        </div>
      ))}
    </>
  )
}

function PostingListRow({ posting, trailing }: { posting: FeedPostingDto; trailing: ReactNode }) {
  const navigate = useNavigate()
  return (
    <button type="button" className="hfeed-plist__row" onClick={() => navigate(`/job/${posting.id}`)}>
      <span className="hfeed-plist__main">
        <span className="hfeed-plist__company">{posting.company ?? '기업명 미상'}</span>
        <span className="hfeed-plist__title">{posting.title}</span>
      </span>
      {trailing}
    </button>
  )
}

// 로딩/에러/빈 상태를 카드 단위로 흡수 — 실패하거나 빈 결과면 카드 자체를 숨겨 컬럼이 깨지지 않게 한다.
function PostingListCard({
  title,
  viewAllTo,
  loading,
  failed,
  items,
  renderRow,
}: {
  title: string
  viewAllTo: string
  loading: boolean
  failed: boolean
  items: FeedPostingDto[] | null
  renderRow: (posting: FeedPostingDto) => ReactNode
}) {
  const navigate = useNavigate()
  if (failed) return null
  if (!loading && (items == null || items.length === 0)) return null

  return (
    <section className="hfeed-plist card">
      <div className="hfeed-plist__head">
        <h3>{title}</h3>
        <button type="button" className="hfeed-plist__viewall" onClick={() => navigate(viewAllTo)}>
          전체 보기
        </button>
      </div>
      <div className="hfeed-plist__list">
        {loading && items == null ? <PostingListSkeleton /> : items?.map((posting) => renderRow(posting))}
      </div>
    </section>
  )
}

export default function HomeNewsPanel({ isAuthed, pool }: { isAuthed: boolean; pool: 'all' | 'domestic' | 'global' }) {
  const [activeTab, setActiveTab] = useState<NewsSource>('hackernews')
  const [cache, setCache] = useState<Partial<Record<NewsSource, NewsResponseDto>>>({})
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsFetchFailed, setNewsFetchFailed] = useState(false)
  const [newsPage, setNewsPage] = useState(1)

  const current = cache[activeTab]
  const newsTotalPages = current ? Math.max(1, Math.ceil(current.items.length / NEWS_PAGE_SIZE)) : 1
  const pagedNewsItems = current
    ? current.items.slice((newsPage - 1) * NEWS_PAGE_SIZE, newsPage * NEWS_PAGE_SIZE)
    : []

  const changeTab = (src: NewsSource) => {
    setActiveTab(src)
    setNewsPage(1)
  }

  useEffect(() => {
    if (cache[activeTab]) return
    let cancelled = false
    setNewsLoading(true)
    setNewsFetchFailed(false)
    homeApi
      .news(activeTab)
      .then((res) => {
        if (cancelled) return
        setCache((prev) => ({ ...prev, [activeTab]: res }))
      })
      .catch(() => {
        if (!cancelled) setNewsFetchFailed(true)
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const retryNews = (source: NewsSource) => {
    setCache((prev) => {
      const next = { ...prev }
      delete next[source]
      return next
    })
    setNewsPage(1)
  }

  // 우측 컬럼 리스트 — 마감 임박 공고 / (로그인+이력서) 추천 공고. 기존 /feed/postings API만 재사용한다.
  const feedPoolParam = pool === 'all' ? undefined : pool
  const { activeResume } = useResumesState()
  const showRecommended = isAuthed && !!activeResume

  const [deadlineItems, setDeadlineItems] = useState<FeedPostingDto[] | null>(null)
  const [deadlineFailed, setDeadlineFailed] = useState(false)
  const [deadlineLoading, setDeadlineLoading] = useState(true)
  const [deadlineAsOf, setDeadlineAsOf] = useState<string>(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    let cancelled = false
    setDeadlineLoading(true)
    setDeadlineFailed(false)
    homeApi
      .feed({ pool: feedPoolParam, deadline_within_days: 7, page_size: 5 })
      .then((res) => {
        if (cancelled) return
        setDeadlineItems(res.items)
        setDeadlineAsOf(res.as_of)
      })
      .catch(() => { if (!cancelled) setDeadlineFailed(true) })
      .finally(() => { if (!cancelled) setDeadlineLoading(false) })
    return () => { cancelled = true }
  }, [feedPoolParam])

  const [recommendedItems, setRecommendedItems] = useState<FeedPostingDto[] | null>(null)
  const [recommendedFailed, setRecommendedFailed] = useState(false)
  const [recommendedLoading, setRecommendedLoading] = useState(false)

  useEffect(() => {
    if (!showRecommended) {
      setRecommendedItems(null)
      return
    }
    let cancelled = false
    setRecommendedLoading(true)
    setRecommendedFailed(false)
    homeApi
      .feed({ pool: feedPoolParam, min_match: 60, page_size: 5 })
      .then((res) => { if (!cancelled) setRecommendedItems(res.items) })
      .catch(() => { if (!cancelled) setRecommendedFailed(true) })
      .finally(() => { if (!cancelled) setRecommendedLoading(false) })
    return () => { cancelled = true }
  }, [showRecommended, feedPoolParam])

  return (
    <>
      <section className="hfeed-news card">
        <div className="hfeed-news__head">
          <h3>기술 뉴스</h3>
          {current && <span className="hfeed-news__updated tnum">{formatUpdatedCaption(current.fetched_at)}</span>}
        </div>
        <div className="hfeed-news__tabs">
          {TAB_ORDER.map((src) => (
            <button
              key={src}
              type="button"
              className={activeTab === src ? 'is-on' : ''}
              onClick={() => changeTab(src)}
            >
              {TAB_LABEL[src]}
            </button>
          ))}
        </div>
        <div className="hfeed-news__list">
          {newsLoading && !current && <NewsListSkeleton />}

          {!newsLoading && newsFetchFailed && !current && (
            <div className="hfeed-news__error">
              뉴스를 불러오지 못했어요. 잠시 후 다시 시도해요.
              <button type="button" onClick={() => retryNews(activeTab)}>새로고침</button>
            </div>
          )}

          {current && current.error && (
            <div className="hfeed-news__error">
              뉴스를 불러오지 못했어요. 잠시 후 다시 시도해요.
              <button type="button" onClick={() => retryNews(activeTab)}>새로고침</button>
            </div>
          )}

          {current && !current.error && (
            <>
              {current.stale && <div className="hfeed-news__stale">이전에 받아온 정보예요.</div>}
              {current.items.length === 0 && <div className="hfeed-news__source">표시할 뉴스가 없어요.</div>}
              {pagedNewsItems.map((item, idx) => (
                <NewsItemView key={`${activeTab}-${idx}-${item.url}`} source={activeTab} item={item} />
              ))}
            </>
          )}
        </div>

        {current && !current.error && current.items.length > NEWS_PAGE_SIZE && (
          <div className="hfeed-news__pager">
            <button
              type="button"
              onClick={() => setNewsPage((p) => Math.max(1, p - 1))}
              disabled={newsPage <= 1}
              aria-label="이전 뉴스"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="tnum">{newsPage} / {newsTotalPages}</span>
            <button
              type="button"
              onClick={() => setNewsPage((p) => Math.min(newsTotalPages, p + 1))}
              disabled={newsPage >= newsTotalPages}
              aria-label="다음 뉴스"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>

      <PostingListCard
        title="마감 임박 공고"
        viewAllTo="/jobs"
        loading={deadlineLoading}
        failed={deadlineFailed}
        items={deadlineItems}
        renderRow={(posting) => {
          const dd = posting.close_date ? ddayInfo(posting.close_date, deadlineAsOf) : null
          const urgent = !!dd && dd.d <= 3
          return (
            <PostingListRow
              key={posting.id}
              posting={posting}
              trailing={
                <span
                  className={`hfeed-badge tnum ${dd ? 'hfeed-badge--dday' : 'hfeed-badge--always'}${urgent ? ' is-urgent' : ''}`}
                >
                  {dd ? `D-${dd.d}` : '상시채용'}
                </span>
              }
            />
          )
        }}
      />

      {showRecommended && (
        <PostingListCard
          title="추천 공고"
          viewAllTo="/jobs"
          loading={recommendedLoading}
          failed={recommendedFailed}
          items={recommendedItems}
          renderRow={(posting) => {
            const rate = posting.match ? Math.round(posting.match.rate) : null
            return (
              <PostingListRow
                key={posting.id}
                posting={posting}
                trailing={rate != null ? <span className="hfeed-plist__match tnum">{rate}%</span> : null}
              />
            )
          }}
        />
      )}
    </>
  )
}
