import { getAuthToken } from './authStore'
import { formatApiError } from './api'

const API_BASE = '/api/v1'

export type PostingCardDto = { id: number; title: string; company: string | null; post_date: string | null; close_date: string | null; skills: string[]; url: string; logo_url?: string | null; matched_count?: number | null }
export type PostingListDto = { items: PostingCardDto[]; page: number; page_size: number; total: number; as_of: string }
export type PostingMapDto = {
  pins: Array<{ id: number; lat: number; lng: number; title: string; company: string | null; matched_count: number | null; required_count: number | null; match_pct: number | null }>
  heatmap: Array<{ region_district: string; posting_count: number }>
  clusters: Array<{ district: string; count: number; lat: number; lng: number; avg_match_pct: number | null }>
  as_of: string
}
export type CompanyBySkillDto = { skill: string; split_date: string; present: CompanyEntryDto[]; past: CompanyEntryDto[]; as_of: string; domestic_note: string | null }
export type CompanyEntryDto = { company: string; posting_count: number; response_rate: number | null }

function query(path: string, params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined) search.set(key, String(value)) })
  return `${API_BASE}${path}${search.size ? `?${search}` : ''}`
}

async function get<T>(path: string, params: Record<string, string | number | boolean | undefined>) {
  const token = getAuthToken()
  const response = await fetch(query(path, params), { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(formatApiError(body?.detail))
  }
  return response.json() as Promise<T>
}

export const recruitmentApi = {
  postings: (params: Record<string, string | number | boolean | undefined> = {}) => get<PostingListDto>('/postings', params),
  map: (params: Record<string, string | number | boolean | undefined> = {}) => get<PostingMapDto>('/postings/map', params),
  companiesBySkill: (skill: string, pool: 'domestic' | 'global' = 'domestic') => get<CompanyBySkillDto>('/company/by-skill', { skill, pool }),
}
