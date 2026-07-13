import { getAuthToken } from './authStore'

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
  feed: (params: { page?: number; page_size?: number; pool?: string; category?: string } = {}) =>
    get<FeedResponseDto>('/feed/postings', params),
  news: (source: NewsSource, limit = 15) => get<NewsResponseDto>('/news', { source, limit }),
  postingTimeline: (pool: string, days = 7, resumeId?: number) =>
    get<PostingTimelineDto>('/stats/posting-timeline', { pool, days, resume_id: resumeId }),
  skillShare: (pool: string, topK = 3) =>
    get<SkillShareDto>('/stats/skill-share', { pool, top_k: topK }),
}
