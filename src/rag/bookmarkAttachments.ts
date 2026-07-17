import { loadBookmarkDetails } from '../career/bookmarkStore.ts'
import type { ChatAttachment } from './chatContract'

type BookmarkPostingDetail = {
  id: number
  title: string
  company?: string | null
}

export async function loadBookmarkAttachments<T extends BookmarkPostingDetail>(
  postingIds: string[],
  loadDetail: (postingId: string) => Promise<T>,
): Promise<ChatAttachment[]> {
  const details = await loadBookmarkDetails(postingIds, loadDetail)
  return details.map((detail) => ({
    kind: 'posting',
    id: detail.id,
    title: detail.title,
    subtitle: detail.company || undefined,
  }))
}
