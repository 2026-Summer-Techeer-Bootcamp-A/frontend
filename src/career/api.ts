import type { AuthUser } from './authStore'

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export type AuthToken = {
  access_token: string
  token_type: string
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

export const settingsApi = {
  // 백엔드 자리: PATCH /api/v1/settings — 지금은 로컬 저장이 정본이라 성공만 흉내낸다.
  async save(): Promise<{ ok: true }> {
    return { ok: true }
  },
}

type Identity = { resumeId: number; token: string }
type Params = Record<string, string | number | undefined>
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })
const path = (url: string, params: Params) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value !== undefined && query.set(key, String(value)))
  return `${url}?${query}`
}
const personal = (id: Identity, position?: string) => ({ pool: 'domestic', resume_id: id.resumeId, position })

export type CoverageData = { coverage_score: number; top_skills: Array<{ canonical: string; owned: boolean }> }
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
}
