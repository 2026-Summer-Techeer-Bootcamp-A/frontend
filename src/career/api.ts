import type { AuthUser } from './authStore'

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export type AuthToken = {
  access_token: string
  token_type: string
}

export type ApiPool = 'domestic' | 'global'
export type PostingCard = {
  id: number
  title: string
  company: string | null
  post_date: string | null
  close_date: string | null
  skills: string[]
  url: string
  matched_count?: number | null
}
export type PostingList = { items: PostingCard[]; page: number; page_size: number; total: number; as_of: string }
export type PostingDetail = PostingCard & {
  source: string
  pool: string | null
  career_min: number | null
  career_max: number | null
  region: string | null
  lat: number | null
  lng: number | null
  industry: string | null
  response_rate: number | null
  categories: string[]
  certs: string[]
}
export type SimilarPosting = PostingCard & { overlap_count: number }
export type PostingMap = {
  pins: Array<{ id: number; lat: number; lng: number; title: string; company: string | null; matched_count: number | null; required_count: number | null; match_pct: number | null }>
  heatmap: Array<{ region_district: string; posting_count: number }>
  clusters: Array<{ district: string; count: number; lat: number; lng: number; avg_match_pct: number | null }>
  as_of: string
}

type QueryValue = string | number | boolean | null | undefined

function withQuery(path: string, params: Record<string, QueryValue> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  return `${path}${query.size ? `?${query}` : ''}`
}

function authHeaders(token?: string | null): HeadersInit | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

type FastApiValidationError = {
  msg?: string
}

function formatApiError(detail: unknown) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: FastApiValidationError) => item.msg ?? '입력값을 확인해주세요')
      .join('\n')
  }
  return '요청에 실패했어요'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(formatApiError(data?.detail))
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const authApi = {
  login(body: { email: string; password: string }) {
    return request<AuthToken>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  signup(body: { email: string; password: string; nickname: string }) {
    return request<AuthUser>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ ...body, nickname: body.nickname.trim() || null }),
    })
  },

  me(token: string) {
    return request<AuthUser>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  logout(token: string) {
    return request<void>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

async function rootRequest<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(formatApiError(data?.detail))
  }
  return response.json() as Promise<T>
}

export const jobsApi = {
  list(params: {
    pool?: ApiPool; position?: string; sort?: 'latest' | 'deadline'; district?: string
    deadline_within_days?: number; match_only?: boolean; min_match?: number; resume_id?: number
    page?: number; page_size?: number
  } = {}, token?: string | null) {
    return request<PostingList>(withQuery('/postings', params), { headers: authHeaders(token) })
  },
  detail(id: string | number) {
    return request<PostingDetail>(`/postings/${encodeURIComponent(id)}`)
  },
  nearby(id: string | number, limit = 5) {
    return request<{ items: PostingCard[]; as_of: string }>(withQuery(`/postings/${encodeURIComponent(id)}/nearby`, { limit }))
  },
  similar(id: string | number, limit = 5) {
    return request<{ items: SimilarPosting[]; as_of: string }>(withQuery(`/postings/${encodeURIComponent(id)}/similar`, { limit }))
  },
  map(params: { resume_id?: number; session_id?: string } = {}, token?: string | null) {
    return request<PostingMap>(withQuery('/postings/map', params), { headers: authHeaders(token) })
  },
  categories() {
    return request<{ categories: Array<{ name: string; is_tech: boolean }> }>('/job-categories')
  },
  skills(q = '') {
    return rootRequest<{ skills: Array<{ canonical: string; category: string; aliases: string[] }> }>(withQuery('/skills', { q, limit: 20 }))
  },
}

export const searchApi = {
  search(q: string, limit = 5) {
    return request<{
      postings: Array<{ id: number; title: string; company: string; pool: string }>
      skills: Array<{ canonical: string; category: string | null }>
      companies: Array<{ company: string; posting_count: number }>
      query: string
    }>(withQuery('/search', { q, limit }))
  },
}

export const marketApi = {
  skillShare: (params: { pool?: ApiPool; position?: string; top_k?: number } = {}) => request<{ items: Array<{ canonical: string; category: string | null; posting_count: number; share: number }>; as_of: string; sample_size: number }>(withQuery('/stats/skill-share', params)),
  newcomerGate: () => request<{ items: Array<{ canonical: string; postings: number; newcomer_postings: number; open_rate: number }>; as_of: string; sample_size: number }>('/stats/newcomer-gate'),
  yearlyTrend: (pool: ApiPool = 'domestic') => request<{ years: number[]; series: Array<{ canonical: string; shares: number[]; delta: number }>; movers: { rising: Array<{ canonical: string; delta: number }>; falling: Array<{ canonical: string; delta: number }> }; as_of: string; sample_size: number }>(withQuery('/stats/skill-trend-yearly', { pool })),
  cooccurrence: (params: { pool?: ApiPool; skill?: string; top_k?: number } = {}) => request<{ nodes: Array<{ canonical: string; category: string | null; freq: number }>; links: Array<{ source: string; target: string; co_count: number; co_rate: number }>; as_of: string }>(withQuery('/stats/cooccurrence', params)),
  hotCompanies: (params: { pool?: ApiPool; days?: number; limit?: number } = {}) => request<{ items: Array<{ company: string; posting_count: number }>; as_of: string }>(withQuery('/stats/hot-companies', params)),
  regionDensity: (params: { pool?: ApiPool; limit?: number } = {}) => request<{ items: Array<{ region_district: string; posting_count: number }>; as_of: string }>(withQuery('/stats/region-density', params)),
  responseRate: (pool: ApiPool = 'domestic') => request<{ median_rate: number; levels: Array<{ level: string; n: number }>; companies: Array<{ company: string; rate: number; n: number }>; as_of: string; sample_size: number }>(withQuery('/stats/response-rate', { pool })),
  globalDomesticGap: () => request<{ global_favored: Array<{ canonical: string; category: string; global_pct: number; domestic_pct: number; diff: number }>; domestic_favored: Array<{ canonical: string; category: string; global_pct: number; domestic_pct: number; diff: number }>; as_of: string }>('/stats/global-domestic-gap'),
  hypeVsHire: (skill: string) => request<{ skill: string; quarters: Array<{ quarter: string; interest_value: number; posting_count: number }>; as_of: string; sample_size: number; note: string }>(withQuery('/trend/hype-vs-hire', { skill })),
  githubChronicle: () => request<{ years: number[]; lines: Array<{ tech: string; repo: string; points: Array<{ year: number; rank: number; stars: number }> }>; events?: Array<unknown>; as_of: string }>('/trend/github-chronicle'),
  githubTopics: () => request<{ items: Array<{ canonical: string; category: string; repo_reach: number; reach_pct: number; job_demand_pct: number | null; owned: boolean | null }>; opportunities?: Array<unknown>; as_of: string }>('/trend/github-topics'),
}

export const settingsApi = {
  // 백엔드 자리: PATCH /api/v1/settings — 지금은 로컬 저장이 정본이라 성공만 흉내낸다.
  async save(): Promise<{ ok: true }> {
    return { ok: true }
  },
}
