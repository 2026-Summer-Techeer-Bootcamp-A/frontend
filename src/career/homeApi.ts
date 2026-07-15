import { getAuthToken } from './authStore.ts'

const API_BASE = '/api/v1'

export type NewsSource = 'hackernews' | 'geeknews' | 'github'

export type FeedMatchDto = {
  rate: number
  owned_skills: string[]
  missing_skills: string[]
}

export type FeedPostingDto = {
  id: number
  title: string
  company: string | null
  industry: string | null
  region: string | null
  pool: string | null
  post_date: string | null
  close_date: string | null
  categories: string[]
  skills: string[]
  url: string
  match: FeedMatchDto | null
  career_min: number | null
  career_max: number | null
  response_rate: number | null
  concepts: string[]
  certs: string[]
  seniority: string | null
  description_snippet: string | null
  logo_url: string | null
}

export type FeedResponseDto = {
  items: FeedPostingDto[]
  page: number
  page_size: number
  total: number
  as_of: string
}

export type NewsItemDto = {
  title: string
  url: string
  comments_url: string | null
  points: number | null
  comments_count: number | null
  language: string | null
  stars: number | null
  description: string | null
}

export type NewsResponseDto = {
  source: NewsSource
  items: NewsItemDto[]
  fetched_at: string
  stale: boolean
  error: boolean
}

export type PostingTimelineDto = {
  daily: { date: string; total: number; matched?: number | null }[]
  as_of: string
}

export type PostingTimelineSummaryDay = PostingTimelineDto['daily'][number] & {
  displayTotal: number
  isOutlier: boolean
}

export type PostingTimelineSummary = {
  recent: PostingTimelineSummaryDay[]
  median: number
  p95: number
  outlierCount: number
}

export function summarizePostingTimeline(
  daily: PostingTimelineDto['daily'],
  recentDays = 7,
): PostingTimelineSummary {
  const positiveTotals = daily
    .map((day) => day.total)
    .filter((total) => total > 0)
    .sort((a, b) => a - b)

  const p95 = positiveTotals.length === 0
    ? 0
    : positiveTotals[Math.max(0, Math.ceil(positiveTotals.length * 0.95) - 1)]

  const recent = daily.slice(-recentDays).map((day) => {
    const isOutlier = p95 > 0 && day.total > p95 * 2
    return {
      ...day,
      displayTotal: isOutlier ? p95 : day.total,
      isOutlier,
    }
  })
  const typicalTotals = recent
    .filter((day) => !day.isOutlier && day.total > 0)
    .map((day) => day.total)
    .sort((a, b) => a - b)
  const middle = Math.floor(typicalTotals.length / 2)
  const median = typicalTotals.length === 0
    ? 0
    : typicalTotals.length % 2 === 1
      ? typicalTotals[middle]
      : Math.round((typicalTotals[middle - 1] + typicalTotals[middle]) / 2)

  return {
    recent,
    median,
    p95,
    outlierCount: recent.filter((day) => day.isOutlier).length,
  }
}

export function mergePostingTimelines(timelines: PostingTimelineDto[]): PostingTimelineDto {
  const byDate = new Map<string, { total: number; matched: number; hasMatched: boolean }>()

  for (const timeline of timelines) {
    for (const day of timeline.daily) {
      const current = byDate.get(day.date) ?? { total: 0, matched: 0, hasMatched: false }
      current.total += day.total
      if (typeof day.matched === 'number') {
        current.matched += day.matched
        current.hasMatched = true
      }
      byDate.set(day.date, current)
    }
  }

  const daily = [...byDate.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, day]) => ({
      date,
      total: day.total,
      ...(day.hasMatched ? { matched: day.matched } : {}),
    }))
  const asOf = timelines.reduce((latest, timeline) => (
    timeline.as_of > latest ? timeline.as_of : latest
  ), '')

  return { daily, as_of: asOf }
}

// 필드명은 backend app/schemas/insight.py의 SkillShareItem(canonical, category,
// posting_count, share)을 그대로 따른다.
export type SkillShareItemDto = {
  canonical: string
  category: string | null
  posting_count: number
  share: number
}

export type SkillShareDto = {
  items: SkillShareItemDto[]
  as_of: string
  sample_size: number
}

export function mergeSkillShares(shares: SkillShareDto[], topK = 5): SkillShareDto {
  const sampleSize = shares.reduce((sum, share) => sum + share.sample_size, 0)
  const byCanonical = new Map<string, Omit<SkillShareItemDto, 'share'>>()

  for (const share of shares) {
    for (const item of share.items) {
      const current = byCanonical.get(item.canonical)
      byCanonical.set(item.canonical, {
        canonical: item.canonical,
        category: current?.category ?? item.category,
        posting_count: (current?.posting_count ?? 0) + item.posting_count,
      })
    }
  }

  const items = [...byCanonical.values()]
    .sort((a, b) => b.posting_count - a.posting_count || a.canonical.localeCompare(b.canonical))
    .slice(0, topK)
    .map((item) => ({
      ...item,
      share: sampleSize > 0 ? Number((item.posting_count / sampleSize).toFixed(4)) : 0,
    }))
  const asOf = shares.reduce((latest, share) => (
    share.as_of > latest ? share.as_of : latest
  ), '')

  return { items, as_of: asOf, sample_size: sampleSize }
}

function query(path: string, params: Record<string, string | number | boolean | undefined>) {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) usp.set(key, String(value))
  }
  const qs = usp.toString()
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`
}

async function get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const token = getAuthToken()
  const response = await fetch(query(path, params), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.detail === 'string' ? body.detail : '데이터를 불러오지 못했습니다.')
  }
  return response.json() as Promise<T>
}

export const homeApi = {
  feed: (
    params: {
      page?: number
      page_size?: number
      pool?: string
      category?: string
      district?: string
      deadline_within_days?: number
      min_match?: number
      sort?: 'latest' | 'match'
      industry?: string
      skills?: string
      rich_only?: boolean
    } = {},
  ) => get<FeedResponseDto>('/feed/postings', params),
  news: (source: NewsSource, limit = 15) => get<NewsResponseDto>('/news', { source, limit }),
  postingTimeline: (pool: string, days = 7, resumeId?: number) =>
    get<PostingTimelineDto>('/stats/posting-timeline', { pool, days, resume_id: resumeId }),
  skillShare: (pool: string, topK = 3) =>
    get<SkillShareDto>('/stats/skill-share', { pool, top_k: topK }),
}
