import { useEffect, useState } from 'react'

// 최근 조회한 공고 id 기록(로컬 저장). dashboardConfig.ts와 동일한 패턴 —
// localStorage가 정본, 변경 시 CustomEvent로 브로드캐스트.
const STORAGE_KEY = 'techeer_view_history'
const EVENT = 'view-history-change'
const MAX_HISTORY = 20

function readHistory(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function recordView(postingId: string): void {
  const cur = readHistory()
  const next = [postingId, ...cur.filter((id) => id !== postingId)].slice(0, MAX_HISTORY)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT))
}

export function getRecentViews(limit = 5): string[] {
  return readHistory().slice(0, limit)
}

export function useRecentViews(limit = 5): string[] {
  const [views, setViews] = useState<string[]>(() => getRecentViews(limit))

  useEffect(() => {
    const handle = () => setViews(getRecentViews(limit))
    window.addEventListener(EVENT, handle)
    return () => window.removeEventListener(EVENT, handle)
  }, [limit])

  return views
}
