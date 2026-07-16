import { Link } from 'react-router-dom'
import { Bookmark, ChevronRight } from 'lucide-react'
import type { ToolResult, ToolResultItem, ToolResultKind } from './chatContract'
import { isBookmarked, toggleBookmark, useBookmarks } from '../career/bookmarkStore'

// 공고 카드 리스트(스펙: 백엔드 PR #80 posting_list 계약) — semantic_search·resume_recommend가
// 내려주는 공고 랭킹을 막대 차트가 아니라 실제 "공고 카드"로 렌더한다. AssistantVisualizer(랭크드
// 바) · ComparisonCards(비교 3종)와 같은 층위의 전용 디스패처다 — vizSelect가 이 kind를 절대
// 차트로 합성하지 않도록 이미 막아뒀다(vizSelect.ts의 posting_list early return).
const POSTING_LIST_KIND: ToolResultKind = 'posting_list'

export function isPostingListResult(result: ToolResult): boolean {
  return result.kind === POSTING_LIST_KIND && result.items.length > 0
}

interface PostingResultCardsProps {
  results: ToolResult[]
}

// 기본 모드 배열 디스패처 — ComparisonCards/AssistantVisualizer와 나란히 RagConsole에 삽입된다.
export default function PostingResultCards({ results }: PostingResultCardsProps) {
  const postingResults = results.filter(isPostingListResult)
  if (postingResults.length === 0) return null

  return (
    <div className="rv__postingcards">
      {postingResults.map((r, i) => (
        <PostingResultCard key={`${r.kind}-${i}`} result={r} />
      ))}
    </div>
  )
}

// "모든 과정 보기(log)" 모드의 ToolResultCard가 개별 result 하나를 렌더할 때도 재사용.
export function PostingResultCard({ result }: { result: ToolResult }) {
  if (!isPostingListResult(result)) return null

  return (
    <div className="rc__viz-box rv__postingcard-box">
      <div className="rc__viz-header">
        <span className="rc__viz-title">{result.label}</span>
      </div>
      <div className="rv__postinglist">
        {result.items.map((item, i) => (
          <PostingItemCard key={item.id ?? `${item.name}-${i}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function poolLabel(pool?: string): string | null {
  if (pool === 'domestic') return '국내'
  if (pool === 'global') return '해외'
  return null
}

function PostingItemCard({ item }: { item: ToolResultItem }) {
  // 북마크 정본은 bookmarkStore(localStorage, postingId 키) — 공고 상세(JobDetail)가 이미 이
  // 스토어로 실제 공고 id를 북마크한다. 카드도 같은 스토어를 그대로 재사용해 "채팅에서 북마크한
  // 공고가 상세 화면에서도 저장됨으로 보인다"가 별도 배선 없이 성립한다.
  useBookmarks()
  const idStr = item.id != null ? String(item.id) : null
  const bookmarked = idStr != null && isBookmarked(idStr)
  const pct = typeof item.pct === 'number' ? Math.max(0, Math.min(100, Math.round(item.pct))) : null
  const pool = poolLabel(item.pool)

  return (
    <div className="rv__postingitem">
      <div className="rv__postingitem-main">
        <div className="rv__postingitem-title">{item.name}</div>
        <div className="rv__postingitem-sub">
          {item.company && <span className="rv__postingitem-co">{item.company}</span>}
          {pool && <span className="rc__badge">{pool}</span>}
        </div>
        {pct !== null && (
          <div className="rc__mc-row rv__postingitem-fit">
            <span className="rc__mc-label">적합도</span>
            <span className="rc__mc-track">
              <span className="rc__mc-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="rc__mc-val">{pct}%</span>
          </div>
        )}
      </div>
      <div className="rv__postingitem-actions">
        {idStr != null ? (
          <Link to={`/job/${idStr}`} className="rv__postingitem-detail">
            상세보기 <ChevronRight size={13} aria-hidden="true" />
          </Link>
        ) : (
          <span className="rv__postingitem-detail rv__postingitem-detail--disabled">상세 정보 없음</span>
        )}
        <button
          type="button"
          className="rv__postingitem-bm"
          aria-pressed={bookmarked}
          disabled={idStr == null}
          onClick={() => idStr != null && toggleBookmark(idStr)}
        >
          <Bookmark size={14} aria-hidden="true" fill={bookmarked ? 'currentColor' : 'none'} />
          {bookmarked ? '저장됨' : '북마크'}
        </button>
      </div>
    </div>
  )
}
