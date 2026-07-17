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
  logo_url?: string | null
  matched_count?: number | null
}
export type PostingList = { items: PostingCard[]; page: number; page_size: number; total: number; as_of: string }
export type DescSection = { title: string; text: string }
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
  desc_sections?: DescSection[]
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

export function formatApiError(detail: unknown) {
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

export const jobsApi = {
  list(params: {
    pool?: ApiPool; position?: string; sort?: 'latest' | 'deadline' | 'match'; district?: string
    q?: string; skills?: string
    deadline_within_days?: number; match_only?: boolean; min_match?: number; resume_id?: number
    rich_only?: boolean
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
  categories(pool?: ApiPool) {
    return request<{ categories: Array<{ name: string; is_tech: boolean }> }>(withQuery('/job-categories', { pool }))
  },
  skills(q = '', limit = 20) {
    return request<{ skills: Array<{ canonical: string; category: string; aliases: string[] }> }>(withQuery('/skills', { q, limit }))
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
  newcomerGate: () => request<{ items: Array<{ canonical: string; postings: number; newcomer_postings: number; open_rate: number }>; overall: { newcomer_postings: number; total_postings: number; newcomer_pct: number }; as_of: string; sample_size: number }>('/stats/newcomer-gate'),
  yearlyTrend: (pool: ApiPool = 'domestic') => request<{ years: number[]; series: Array<{ canonical: string; shares: number[]; delta: number }>; movers: { rising: Array<{ canonical: string; delta: number }>; falling: Array<{ canonical: string; delta: number }> }; as_of: string; sample_size: number }>(withQuery('/stats/skill-trend-yearly', { pool })),
  // 연도별 순위 이력(범프 차트). 점유율%는 오염돼 있어 순위만 사용한다. rank는 top_n 밖이면 null.
  skillRankHistory: (params: { category: 'language' | 'backend' | 'frontend' | 'db'; top_n?: number; year_from?: number; year_to?: number }) =>
    request<{ years: number[]; skills: Array<{ name: string; ranks: Array<number | null> }> }>(withQuery('/stats/skills/rank-history', params)),
  cooccurrence: (params: { pool?: ApiPool; skill?: string; top_k?: number } = {}) => request<{ nodes: Array<{ canonical: string; category: string | null; freq: number }>; links: Array<{ source: string; target: string; co_count: number; co_rate: number }>; as_of: string }>(withQuery('/stats/cooccurrence', params)),
  // 스택 조합 인사이트 — 조건부 비율 combos + LLM 한 줄(ai_generated=false면 결정적 폴백).
  stackInsight: (body: { base_skill: string; pool?: ApiPool; owned_skills?: string[] }) =>
    request<{ base_skill: string; pool: string; combos: Array<{ skill: string; co_rate: number; co_count: number }>; insight: string; ai_generated: boolean; as_of: string }>('/insights/stack', { method: 'POST', body: JSON.stringify(body) }),
  hotCompanies: (params: { pool?: ApiPool; days?: number; limit?: number } = {}) => request<{ items: Array<{ company: string; posting_count: number }>; as_of: string }>(withQuery('/stats/hot-companies', params)),
  regionDensity: (params: { pool?: ApiPool; limit?: number } = {}) => request<{ items: Array<{ region_district: string; posting_count: number }>; as_of: string }>(withQuery('/stats/region-density', params)),
  postingTimeline: (params: { pool: ApiPool; days?: number; position?: string }) => request<TimelineData>(withQuery('/stats/posting-timeline', params)),
  responseRate: (pool: ApiPool = 'domestic') => request<{ median_rate: number; levels: Array<{ level: string; n: number }>; companies: Array<{ company: string; rate: number; n: number }>; as_of: string; sample_size: number }>(withQuery('/stats/response-rate', { pool })),
  globalDomesticGap: () => request<{ global_favored: Array<{ canonical: string; category: string; global_pct: number; domestic_pct: number; diff: number }>; domestic_favored: Array<{ canonical: string; category: string; global_pct: number; domestic_pct: number; diff: number }>; as_of: string }>('/stats/global-domestic-gap'),
  hypeVsHire: (skill: string) => request<{ skill: string; quarters: Array<{ quarter: string; interest_value: number; posting_count: number }>; as_of: string; sample_size: number; note: string }>(withQuery('/trend/hype-vs-hire', { skill })),
  githubChronicle: () => request<{ years: number[]; lines: Array<{ tech: string; repo: string; points: Array<{ year: number; rank: number; stars: number }> }>; events?: Array<unknown>; as_of: string }>('/trend/github-chronicle'),
  githubTopics: () => request<{ items: Array<{ canonical: string; category: string; repo_reach: number; reach_pct: number; job_demand_pct: number | null; owned: boolean | null }>; opportunities?: Array<unknown>; as_of: string }>('/trend/github-topics'),
  // ── v8 시장 탭 재구성(feat/market-stats-v2) 신규 엔드포인트 — 백엔드 미배선.
  // 시그니처만 먼저 열어두고, 프론트는 useWidgetData 하이브리드로 실패 시 목 데이터 폴백한다.
  groupShare: (params: { group: 'frontend_fw' | 'backend_fw' | 'database'; pool?: ApiPool } = { group: 'frontend_fw' }) =>
    request<{ group: string; union_count: number; items: Array<{ canonical: string; count: number; share: number }>; as_of: string }>(withQuery('/stats/group-share', params)),
  conceptTech: (params: { pool?: ApiPool; top_concepts?: number; top_techs?: number } = {}) =>
    request<{ nodes: Array<{ name: string; type: 'concept' | 'tech' }>; links: Array<{ source: string; target: string; value: number }>; as_of: string }>(withQuery('/stats/concept-tech', params)),
  skillCountDist: (params: { pool?: ApiPool } = {}) =>
    request<{ histogram: Array<{ k: number; count: number }>; avg: number; median: number; as_of: string; sample_size: number }>(withQuery('/stats/skill-count-dist', params)),
  globalDomesticLag: () =>
    request<{
      items: Array<{
        canonical: string
        lag_years: number
        global_series: Array<{ year: number; share: number }>
        domestic_series: Array<{ year: number; share: number }>
      }>
      as_of: string
      note: string
    }>('/stats/global-domestic-lag'),
}

export const settingsApi = {
  // 백엔드 자리: PATCH /api/v1/settings — 지금은 로컬 저장이 정본이라 성공만 흉내낸다.
  async save(): Promise<{ ok: true }> {
    return { ok: true }
  },
}

export type Identity = { resumeId: number; token: string }
type Params = Record<string, string | number | undefined>
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })
const path = (url: string, params: Params) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value !== undefined && query.set(key, String(value)))
  return `${url}?${query}`
}
const personal = (id: Identity, position?: string) => ({ pool: 'domestic', resume_id: id.resumeId, position })

export type CoverageData = {
  coverage_score: number
  score?: number
  base_score?: number
  core_missing_penalty?: number
  formula_version?: string
  top_skills: Array<{
    canonical: string; owned: boolean; posting_count?: number; frequency?: number; weight?: number
    tier?: 'core' | 'supporting'; score_contribution?: number; penalty_contribution?: number
  }>
}
export type DistributionData = {
  histogram: Array<{ range_start: number; count: number }>; coverage_score: number; my_percentile: number
  matched: number; total: number; threshold: number; as_of: string
}
export type PivotData = {
  targets: Array<{ name: string; coverage: number; missing: Array<{ canonical: string }>; n: number }>; as_of: string
}
export type RoadmapData = {
  start_matched: number; total: number; sample_size: number; as_of: string
  steps: Array<{ step: number; canonical: string; category: string; matched_after: number; delta: number }>
}
export type UnlockData = {
  funnel: { apply: number; near1: number; near2_3: number; far: number }; sample_size: number; as_of: string
  candidates: Array<{ canonical: string; req_count: number; marginal_apply: number }>
}
export type TimelineData = { daily: Array<{ date: string; total: number; matched?: number }>; as_of: string }
export type SkillShareData = { items: Array<{ canonical: string; share: number }> }
export type WhatIfData = {
  add: string; matched_before: number; matched_after: number; delta: number
  as_of: string; sample_size: number; sample_warning?: boolean
}
export type GapSkillItem = {
  canonical: string; posting_count: number; frequency: number; weight: number
  tier: 'core' | 'supporting'; score_gain_if_owned: number; unlocked_posting_count: number; reason: string
}
export type GapData = {
  gap_top5: Array<{ canonical: string; freq: number; category: string }>
  radar: Array<{ category: string; coverage: number }>
  as_of: string
  sample_size: number
  sample_warning?: boolean | null
  current_score: number
  items: GapSkillItem[]
  formula_version: string
  company?: string | null
}

export const dashboardApi = {
  coverage: (id: Identity, position?: string) =>
    request<CoverageData>(path('/match/coverage', personal(id, position)), auth(id.token)),
  distribution: (id: Identity, position?: string) =>
    request<DistributionData>(path('/match/coverage/distribution', personal(id, position)), auth(id.token)),
  pivot: (id: Identity) =>
    request<PivotData>(path('/match/pivot-map', { ...personal(id), kind: 'industry', limit: 6 }), auth(id.token)),
  roadmap: (id: Identity, position?: string) =>
    request<RoadmapData>(path('/match/roadmap', { ...personal(id, position), steps: 5 }), auth(id.token)),
  unlock: (id: Identity, position?: string) =>
    request<UnlockData>(path('/stats/skill-unlock', personal(id, position)), auth(id.token)),
  timeline: (id: Identity) =>
    request<TimelineData>(path('/stats/posting-timeline', { ...personal(id), days: 36 }), auth(id.token)),
  applicableCount: (id: Identity, position?: string) =>
    request<{ total: number }>(path('/postings', { ...personal(id, position), min_match: 50, page_size: 1 }), auth(id.token)),
  skillShare: () => request<SkillShareData>(path('/stats/skill-share', { pool: 'domestic', top_k: 100 })),
  // B-1: 커버리지 what-if — 기술 하나를 더 배웠다고 가정했을 때 매칭 공고 수 변화.
  whatIf: (id: Identity, add: string) =>
    request<WhatIfData>(path('/match/what-if', { ...personal(id), add }), auth(id.token)),
  // A-1: 목표 기업으로 모수를 좁힌 갭 분석.
  gapByCompany: (id: Identity, company: string, position?: string) =>
    request<GapData>(path('/match/gap', { ...personal(id, position), company }), auth(id.token)),
}

export type ParsedSkillDto = { canonical: string; category: string; in_dict: boolean }
export type ParsedCertDto = { name: string; in_dict: boolean }
export type ResumeListItemDto = { resume_id: number; title: string; position: string | null; is_primary: boolean }
export type ResumeDetailDto = {
  resume_id: number
  title: string
  skills: ParsedSkillDto[]
  certs: ParsedCertDto[]
  position: string
  career_min: number
  career_max: number
  pool: ApiPool
  memo: string | null
  is_primary: boolean
}
export type ResumeUpsertPayload = {
  title: string
  skills: ParsedSkillDto[]
  certs: ParsedCertDto[]
  position: string
  career_min: number
  career_max: number
  pool: ApiPool
  memo: string | null
}
export type ResumeParseResult = {
  skills: ParsedSkillDto[]
  certs: ParsedCertDto[]
  position: string | null
  career_min: number | null
  career_max: number | null
}
export type ResumePreferencesDto = {
  level?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'director'
  jobSearchStatus?: 'active' | 'casual' | 'none'
  companyStagePrefs: Record<string, 'hide' | 'show' | 'boost'>
  sectorInterests: string[]
  location: { remote: boolean; onsite: boolean; regions: string[] }
}

export const resumeApi = {
  list(token: string) {
    return request<{ items: ResumeListItemDto[] }>('/resume', auth(token))
  },
  detail(id: number, token: string) {
    return request<ResumeDetailDto>(`/resume/${id}`, auth(token))
  },
  create(payload: ResumeUpsertPayload, token: string) {
    return request<{ resume_id: number }>('/resume', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...auth(token),
    })
  },
  update(id: number, payload: ResumeUpsertPayload, token: string) {
    return request<{ resume_id: number }>(`/resume/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      ...auth(token),
    })
  },
  remove(id: number, token: string) {
    return request<void>(`/resume/${id}`, { method: 'DELETE', ...auth(token) })
  },
  setPrimary(id: number, token: string) {
    return request<{ items: ResumeListItemDto[] }>(`/resume/${id}/primary`, {
      method: 'POST',
      ...auth(token),
    })
  },
  async parse(file: File, token?: string | null): Promise<ResumeParseResult> {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch('/api/v1/resume/parse', {
      method: 'POST',
      body: form,
      headers: authHeaders(token),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(formatApiError(data?.detail))
    }
    return response.json() as Promise<ResumeParseResult>
  },
  getPreferences(resumeId: number, token: string) {
    return request<ResumePreferencesDto>(`/resume/${resumeId}/preferences`, auth(token))
  },
  updatePreferences(resumeId: number, payload: ResumePreferencesDto, token: string) {
    return request<ResumePreferencesDto>(`/resume/${resumeId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      ...auth(token),
    })
  },
}

export const certApi = {
  search(q: string) {
    return request<{ certs: { name: string }[] }>(withQuery('/certs', { q }))
  },
}
