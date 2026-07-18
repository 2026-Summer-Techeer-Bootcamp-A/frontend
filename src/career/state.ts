import { useState, useEffect, useMemo, useCallback } from 'react'
import data from '../data/careerData.json'
import market from '../data/marketData.json'
import { resumeApi } from './api'
import type { ParsedCertDto, ParsedSkillDto, ResumeDetailDto, ResumeUpsertPayload } from './api'
import { getAuthToken } from './authStore'

export type Resume = {
  id: string
  title: string
  skills: string[]
  // E: 백엔드가 이미 스킬마다 category(language/backend/frontend/mobile/data_db/
  // cloud_services/devops/ai_llm)를 내려주는데 skills: string[]로 뭉개고 있었다.
  // WorkflowMap의 classifySkill이 pearl 사전에 없는 스킬(FastAPI 등)을 전부 "기타"로
  // 잘못 분류하는 문제를 고치려면 이 category를 살려야 한다. 기존 skills: string[]를
  // 쓰는 다른 위젯들을 건드리지 않기 위해 별도 필드로 얹는다. category가 'unknown'인
  // 스킬은 맵에 넣지 않는다(모르는 값을 넣느니 없는 편이 폴백 로직을 덜 헷갈리게 한다).
  skillCategories: Record<string, string>
  certs: string[]
  position: string
  careerMin: number | null
  careerMax: number | null
  coveragePct: number
  pool?: '국내' | '국외'
  memo?: string
  isPrimary: boolean
}

const poolToApi = (pool: '국내' | '국외' | undefined): 'domestic' | 'global' =>
  pool === '국외' ? 'global' : 'domestic'
const poolFromApi = (pool: 'domestic' | 'global'): '국내' | '국외' =>
  pool === 'global' ? '국외' : '국내'

export function detailToResume(detail: ResumeDetailDto): Resume {
  const skills = detail.skills.map((s) => s.canonical)
  const skillCategories: Record<string, string> = {}
  detail.skills.forEach((s) => {
    if (s.category && s.category !== 'unknown') skillCategories[s.canonical] = s.category
  })
  return {
    id: String(detail.resume_id),
    title: detail.title,
    skills,
    skillCategories,
    certs: detail.certs.map((c) => c.name),
    position: detail.position,
    careerMin: detail.career_min,
    careerMax: detail.career_max,
    coveragePct: calculateCoverage(skills, poolFromApi(detail.pool)),
    pool: poolFromApi(detail.pool),
    memo: detail.memo ?? undefined,
    isPrimary: detail.is_primary,
  }
}

export function resumeToUpsertPayload(resume: {
  title: string
  skills: string[]
  certs: string[]
  position: string
  careerMin: number
  careerMax: number
  pool: '국내' | '국외'
  memo?: string
}): ResumeUpsertPayload {
  const toDictSkill = (canonical: string): ParsedSkillDto => ({ canonical, category: 'unknown', in_dict: true })
  const toDictCert = (name: string): ParsedCertDto => ({ name, in_dict: true })
  return {
    title: resume.title,
    skills: resume.skills.map(toDictSkill),
    certs: resume.certs.map(toDictCert),
    position: resume.position,
    career_min: resume.careerMin,
    career_max: resume.careerMax,
    pool: poolToApi(resume.pool),
    memo: resume.memo ?? null,
  }
}

export function calculateCoverage(skills: string[], pool: '국내' | '국외' = '국내'): number {
  const p = pool === '국내' ? '국내' : '국외'
  const items = (market.skillShare as never as Record<string, { items: { tech: string }[] }>)[p].items
  const top20 = items.slice(0, 20).map((i) => i.tech)
  const held = top20.filter((t) => skills.includes(t)).length
  return Math.round((held / top20.length) * 100)
}

export function ddayInfo(close: string, asOf: string) {
  if (!close) return null
  const d = Math.round((new Date(close).getTime() - new Date(asOf).getTime()) / 86400000)
  if (d < 0) return null
  const [, m, dd] = close.split('-')
  return { d, label: `~${Number(m)}/${Number(dd)}` }
}

export function getDynamicPostings(skills: string[]) {
  return data.postings.map((p) => {
    const held = p.techs.filter((t) => skills.includes(t))
    const gap = p.techs.filter((t) => !skills.includes(t))
    const matchHeld = held.length
    const matchTotal = p.techs.length
    const matchPct = matchTotal ? Math.round((matchHeld / matchTotal) * 100) : 100
    return {
      ...p,
      matchHeld,
      matchTotal,
      matchPct,
      gap,
    }
  })
}

const STORAGE_KEY_SAVED_JOBS = 'techeer_saved_jobs'
export const jobKey = (j: { company: string; title: string }) => `${j.company}__${j.title}`

export function getSavedJobKeys(): string[] {
  const saved = localStorage.getItem(STORAGE_KEY_SAVED_JOBS)
  if (!saved) return []
  try { return JSON.parse(saved) } catch { return [] }
}

export function toggleSavedJob(key: string) {
  const cur = new Set(getSavedJobKeys())
  if (cur.has(key)) cur.delete(key)
  else cur.add(key)
  localStorage.setItem(STORAGE_KEY_SAVED_JOBS, JSON.stringify([...cur]))
  window.dispatchEvent(new Event('saved-jobs-change'))
}

export function useSavedJobs() {
  const [keys, setKeys] = useState<string[]>(getSavedJobKeys)
  useEffect(() => {
    const handle = () => setKeys(getSavedJobKeys())
    window.addEventListener('saved-jobs-change', handle)
    return () => window.removeEventListener('saved-jobs-change', handle)
  }, [])
  // keys가 실제로 바뀔 때만 새 Set을 만든다 — 매 렌더마다 새 Set을 주면 이걸 의존성 배열에
  // 쓰는 이펙트(지도 등)가 매번 다시 실행되는 무한 루프가 생긴다.
  const savedKeys = useMemo(() => new Set(keys), [keys])
  return { savedKeys, toggle: toggleSavedJob }
}

export type HeroMode = 'briefing' | 'default' | 'nextstep' | 'roadmap' | 'fit' | 'temp'
export const HERO_MODES: HeroMode[] = ['briefing', 'default', 'nextstep', 'roadmap', 'fit', 'temp']
const STORAGE_KEY_HERO_MODE = 'techeer_home_hero_mode'

export function getHeroMode(): HeroMode {
  const saved = localStorage.getItem(STORAGE_KEY_HERO_MODE)
  return (HERO_MODES as string[]).includes(saved ?? '') ? (saved as HeroMode) : 'default'
}

export function useHeroMode() {
  const [mode, setModeState] = useState<HeroMode>(getHeroMode)
  const setMode = (m: HeroMode) => {
    localStorage.setItem(STORAGE_KEY_HERO_MODE, m)
    setModeState(m)
  }
  return { mode, setMode }
}

// G-F1: useResumesState()는 대시보드 한 화면에서 4곳 이상이 동시에 마운트된다.
// 훅마다 독립적으로 list()/detail()을 부르면 마운트 수만큼 GET /resume + GET /resume/{id}가
// 중복 발생해 페치 워터폴이 생긴다. 모듈 스코프에 캐시와 진행 중인 요청을 두고 모든
// 구독자가 하나의 네트워크 왕복을 공유하도록 한다. refresh()는 캐시를 무효화해 실제로
// 다시 받아오고, 결과가 도착하면 이벤트로 다른 구독자에게도 알린다.
type ResumesCacheEntry = { token: string; resumes: Resume[] }
let resumesCache: ResumesCacheEntry | null = null
let resumesInFlight: { token: string; promise: Promise<Resume[]> } | null = null
const RESUMES_CACHE_EVENT = 'resumes-cache-change'

async function fetchResumesFromApi(token: string): Promise<Resume[]> {
  const { items } = await resumeApi.list(token)
  const primary = items.find((item) => item.is_primary) ?? items[0]
  if (!primary) return []
  const detail = await resumeApi.detail(primary.resume_id, token)
  const active = detailToResume(detail)
  return items.map((item) =>
    item.resume_id === primary.resume_id
      ? active
      : {
          id: String(item.resume_id),
          title: item.title,
          skills: [],
          skillCategories: {},
          certs: [],
          position: item.position ?? '',
          careerMin: null,
          careerMax: null,
          coveragePct: 0,
          isPrimary: item.is_primary,
        },
  )
}

function loadResumesShared(token: string, force: boolean): Promise<Resume[]> {
  if (!force && resumesCache?.token === token) {
    return Promise.resolve(resumesCache.resumes)
  }
  if (!force && resumesInFlight?.token === token) {
    return resumesInFlight.promise
  }
  const promise = fetchResumesFromApi(token)
    .then((resumes) => {
      resumesCache = { token, resumes }
      resumesInFlight = null
      window.dispatchEvent(new Event(RESUMES_CACHE_EVENT))
      return resumes
    })
    .catch((err) => {
      resumesInFlight = null
      throw err
    })
  resumesInFlight = { token, promise }
  return promise
}

function invalidateResumesCache() {
  resumesCache = null
  resumesInFlight = null
}

export function useResumesState() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback((token: string | null, force: boolean) => {
    if (!token) {
      invalidateResumesCache()
      setResumes([])
      setLoading(false)
      return
    }
    setLoading(true)
    loadResumesShared(token, force)
      .then((result) => setResumes(result))
      .catch(() => setResumes([]))
      .finally(() => setLoading(false))
  }, [])

  const refresh = useCallback(() => {
    const token = getAuthToken()
    invalidateResumesCache()
    load(token, true)
  }, [load])

  useEffect(() => {
    load(getAuthToken(), false)

    const handleAuthChange = () => refresh()
    const handleCacheChange = () => {
      const token = getAuthToken()
      if (token && resumesCache?.token === token) {
        setResumes(resumesCache.resumes)
        setLoading(false)
      }
    }
    window.addEventListener('auth-change', handleAuthChange)
    window.addEventListener(RESUMES_CACHE_EVENT, handleCacheChange)
    return () => {
      window.removeEventListener('auth-change', handleAuthChange)
      window.removeEventListener(RESUMES_CACHE_EVENT, handleCacheChange)
    }
  }, [load, refresh])

  const activeResume = resumes.find((r) => r.isPrimary) ?? resumes[0]
  const activeId = activeResume?.id ?? ''

  const createResume = useCallback(async (payload: ResumeUpsertPayload) => {
    const token = getAuthToken()
    if (!token) throw new Error('로그인이 필요해요')
    const { resume_id } = await resumeApi.create(payload, token)
    const detail = await resumeApi.detail(resume_id, token)
    refresh()
    return detailToResume(detail)
  }, [refresh])

  const updateResume = useCallback(async (id: string, payload: ResumeUpsertPayload) => {
    const token = getAuthToken()
    if (!token) throw new Error('로그인이 필요해요')
    await resumeApi.update(Number(id), payload, token)
    const detail = await resumeApi.detail(Number(id), token)
    refresh()
    return detailToResume(detail)
  }, [refresh])

  const deleteResume = useCallback(async (id: string) => {
    const token = getAuthToken()
    if (!token) throw new Error('로그인이 필요해요')
    await resumeApi.remove(Number(id), token)
    refresh()
  }, [refresh])

  const setPrimary = useCallback(async (id: string) => {
    const token = getAuthToken()
    if (!token) throw new Error('로그인이 필요해요')
    await resumeApi.setPrimary(Number(id), token)
    refresh()
  }, [refresh])

  return { resumes, activeId, activeResume, loading, refresh, createResume, updateResume, deleteResume, setPrimary }
}
