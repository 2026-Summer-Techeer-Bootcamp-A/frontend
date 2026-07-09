import { useState, useEffect } from 'react'
import data from '../data/careerData.json'
import market from '../data/marketData.json'

export type Resume = {
  id: string
  title: string
  skills: string[]
  position: string
  careerMin: number | null
  careerMax: number | null
  coveragePct: number
}

const STORAGE_KEY_RESUMES = 'techeer_resumes'
const STORAGE_KEY_ACTIVE_ID = 'techeer_active_resume_id'

// Initialize local storage if empty
export function getSavedResumes(): Resume[] {
  const saved = localStorage.getItem(STORAGE_KEY_RESUMES)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      // ignore
    }
  }
  return data.resumes as Resume[]
}

export function saveResumes(resumes: Resume[]) {
  localStorage.setItem(STORAGE_KEY_RESUMES, JSON.stringify(resumes))
  window.dispatchEvent(new Event('resume-state-change'))
}

export function getActiveResumeId(): string {
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID)
  if (saved) return saved
  const list = getSavedResumes()
  return list[0]?.id || 'r1'
}

export function saveActiveResumeId(id: string) {
  localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id)
  window.dispatchEvent(new Event('resume-state-change'))
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

export function useResumesState() {
  const [resumes, setResumes] = useState<Resume[]>(getSavedResumes)
  const [activeId, setActiveId] = useState<string>(getActiveResumeId)

  useEffect(() => {
    const handleUpdate = () => {
      setResumes(getSavedResumes())
      setActiveId(getActiveResumeId())
    }
    window.addEventListener('resume-state-change', handleUpdate)
    return () => window.removeEventListener('resume-state-change', handleUpdate)
  }, [])

  const activeResumeIndex = resumes.findIndex((r) => r.id === activeId)
  const activeResume = activeResumeIndex !== -1 ? resumes[activeResumeIndex] : resumes[0]

  const updateResumes = (newResumes: Resume[]) => {
    saveResumes(newResumes)
  }

  const selectResume = (id: string) => {
    saveActiveResumeId(id)
  }

  const addResume = (newResume: Resume) => {
    const updated = [...resumes, newResume]
    saveResumes(updated)
    saveActiveResumeId(newResume.id)
  }

  return {
    resumes,
    activeId,
    activeResume,
    updateResumes,
    selectResume,
    addResume,
  }
}
