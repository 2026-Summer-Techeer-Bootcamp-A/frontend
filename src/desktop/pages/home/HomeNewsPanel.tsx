import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import {
  homeApi,
  type NewsItemDto,
  type NewsResponseDto,
  type NewsSource,
  type PostingTimelineDto,
  type SkillShareDto,
} from '../../../career/homeApi'
import { useResumesState } from '../../../career/state'
import { getAuthToken } from '../../../career/authStore'

const TAB_LABEL: Record<NewsSource, string> = {
  hackernews: '해커뉴스',
  geeknews: '긱뉴스',
  github: 'GitHub',
}
const TAB_ORDER: NewsSource[] = ['hackernews', 'geeknews', 'github']

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

function NewsItemView({ source, item }: { source: NewsSource; item: NewsItemDto }) {
  if (source === 'hackernews') {
    return (
      <div className="hfeed-news__item hfeed-news__item--hn">
        <a className="hfeed-news__title" href={item.url} target="_blank" rel="noreferrer">
          {item.title}
        </a>
        <div className="hfeed-news__meta tnum">
          포인트 {item.points ?? 0}
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
    return (
      <div className="hfeed-news__item hfeed-news__item--gn">
        <a className="hfeed-news__title" href={item.url} target="_blank" rel="noreferrer">
          {item.title}
        </a>
        <div className="hfeed-news__source">{hostnameOf(item.url)}</div>
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
        <span className="hfeed-news__langdot" />
        {item.language ?? '알 수 없음'} · 스타 {formatStars(item.stars)}
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

export default function HomeNewsPanel({ isAuthed, pool }: { isAuthed: boolean; pool: 'all' | 'domestic' | 'global' }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<NewsSource>('hackernews')
  const [cache, setCache] = useState<Partial<Record<NewsSource, NewsResponseDto>>>({})
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsFetchFailed, setNewsFetchFailed] = useState(false)

  const current = cache[activeTab]

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
  }

  // 미니 요약 카드 — 오늘 신규 공고 / 수요 Top3 스킬 / (로그인) 내 매치 상위 공고.
  const effectivePool: 'domestic' | 'global' = pool === 'all' ? 'domestic' : pool
  const { activeResume } = useResumesState()
  const resumeIdentity = useMemo(() => {
    const resumeId = Number(activeResume?.id)
    const token = getAuthToken()
    return isAuthed && Number.isInteger(resumeId) && resumeId > 0 && token ? resumeId : undefined
  }, [activeResume?.id, isAuthed])

  const [timeline, setTimeline] = useState<PostingTimelineDto | null>(null)
  const [timelineFailed, setTimelineFailed] = useState(false)
  const [skillShare, setSkillShare] = useState<SkillShareDto | null>(null)
  const [skillShareFailed, setSkillShareFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setTimelineFailed(false)
    homeApi
      .postingTimeline(effectivePool, 7, resumeIdentity)
      .then((res) => { if (!cancelled) setTimeline(res) })
      .catch(() => { if (!cancelled) setTimelineFailed(true) })
    return () => { cancelled = true }
  }, [effectivePool, resumeIdentity])

  useEffect(() => {
    let cancelled = false
    setSkillShareFailed(false)
    homeApi
      .skillShare(effectivePool, 3)
      .then((res) => { if (!cancelled) setSkillShare(res) })
      .catch(() => { if (!cancelled) setSkillShareFailed(true) })
    return () => { cancelled = true }
  }, [effectivePool])

  const lastDay = timeline?.daily[timeline.daily.length - 1]
  const todayNew = lastDay?.total
  const matchedToday = lastDay?.matched

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
              onClick={() => setActiveTab(src)}
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
              {current.items.map((item, idx) => (
                <NewsItemView key={`${activeTab}-${idx}-${item.url}`} source={activeTab} item={item} />
              ))}
            </>
          )}
        </div>
      </section>

      {!timelineFailed && todayNew != null && (
        <section className="hfeed-mini" role="link" tabIndex={0} onClick={() => navigate('/market')}>
          <span className="hfeed-mini__label">오늘 신규 공고</span>
          <span className="hfeed-mini__num tnum">{todayNew}<span>건</span></span>
          <span className="hfeed-mini__hint">시장에서 보기 <ChevronRight size={13} /></span>
        </section>
      )}

      {!skillShareFailed && skillShare && skillShare.items.length > 0 && (
        <section className="hfeed-mini hfeed-mini--list" role="link" tabIndex={0} onClick={() => navigate('/market')}>
          <span className="hfeed-mini__label" style={{ marginBottom: 6 }}>수요 Top 3 스킬</span>
          {skillShare.items.slice(0, 3).map((item, idx) => (
            <div key={item.canonical} className="hfeed-mini__row">
              <span className="hfeed-mini__rank tnum">{idx + 1}</span>
              <span className="hfeed-mini__name">{item.canonical}</span>
              <span className="hfeed-mini__delta tnum">{(item.share * 100).toFixed(1)}%</span>
            </div>
          ))}
          <span className="hfeed-mini__hint" style={{ marginTop: 10 }}>시장에서 보기 <ChevronRight size={13} /></span>
        </section>
      )}

      {isAuthed && matchedToday != null && (
        <section className="hfeed-mini" role="link" tabIndex={0} onClick={() => navigate('/')}>
          <span className="hfeed-mini__label">내 매치 상위 공고</span>
          <span className="hfeed-mini__num tnum">{matchedToday}<span>건</span></span>
          <span className="hfeed-mini__hint">대시보드에서 보기 <ChevronRight size={13} /></span>
        </section>
      )}
    </>
  )
}
