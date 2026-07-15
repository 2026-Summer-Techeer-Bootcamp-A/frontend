import { useEffect, useState } from 'react'

// 공고 북마크 저장(로컬 저장). dashboardConfig.ts와 동일한 패턴 —
// localStorage가 정본, 변경 시 CustomEvent로 브로드캐스트.
const STORAGE_KEY = 'techeer_bookmarks'
const EVENT = 'bookmarks-change'

export async function loadBookmarkDetails<T>(
  postingIds: string[],
  loadDetail: (postingId: string) => Promise<T>,
): Promise<T[]> {
  const results = await Promise.allSettled(postingIds.map(loadDetail))
  return results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
}

export function getBookmarks(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isBookmarked(postingId: string): boolean {
  return getBookmarks().includes(postingId)
}

export function toggleBookmark(postingId: string): void {
  const cur = getBookmarks()
  const next = cur.includes(postingId) ? cur.filter((id) => id !== postingId) : [...cur, postingId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT))
}

export function useBookmarks(): string[] {
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks)

  useEffect(() => {
    const handle = () => setBookmarks(getBookmarks())
    window.addEventListener(EVENT, handle)
    return () => window.removeEventListener(EVENT, handle)
  }, [])

  return bookmarks
}
