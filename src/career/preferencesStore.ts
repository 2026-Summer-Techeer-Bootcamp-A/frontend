import { useEffect, useState } from 'react'

// 이력서 온보딩 선호도(목업). 지금은 localStorage가 정본. 백엔드가 저장 가능해지면 API로 대체.
export type ResumePreferences = {
  level?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'director'
  jobSearchStatus?: 'active' | 'casual' | 'none'
  companyStagePrefs: Record<'대기업' | '중견' | '중소', 'hide' | 'show' | 'boost'>
  sectorInterests: string[]
  location: { remote: boolean; onsite: boolean; regions: string[] }
}

const STORAGE_KEY_PREFS = 'techeer_resume_prefs'
const PREFS_EVENT = 'resume-prefs-change'

const DEFAULTS: ResumePreferences = {
  level: undefined,
  jobSearchStatus: undefined,
  companyStagePrefs: { 대기업: 'show', 중견: 'show', 중소: 'show' },
  sectorInterests: [],
  location: { remote: true, onsite: true, regions: [] },
}

export function getPreferences(): ResumePreferences {
  const raw = localStorage.getItem(STORAGE_KEY_PREFS)
  if (!raw) return DEFAULTS
  try {
    const parsed = JSON.parse(raw) as Partial<ResumePreferences>
    return {
      ...DEFAULTS,
      ...parsed,
      companyStagePrefs: { ...DEFAULTS.companyStagePrefs, ...parsed.companyStagePrefs },
      location: { ...DEFAULTS.location, ...parsed.location },
    }
  } catch {
    return DEFAULTS
  }
}

function writePreferences(p: ResumePreferences) {
  localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(p))
  window.dispatchEvent(new Event(PREFS_EVENT))
}

export function useResumePrefs() {
  const [prefs, setPrefs] = useState<ResumePreferences>(getPreferences)

  useEffect(() => {
    const handle = () => setPrefs(getPreferences())
    window.addEventListener(PREFS_EVENT, handle)
    return () => window.removeEventListener(PREFS_EVENT, handle)
  }, [])

  const updatePrefs = (patch: Partial<ResumePreferences>) => {
    const cur = getPreferences()
    writePreferences({ ...cur, ...patch })
  }

  return { prefs, updatePrefs }
}
