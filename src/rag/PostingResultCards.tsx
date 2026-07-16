import { Link } from 'react-router-dom'
import { Bookmark, Check, ChevronRight, MapPin, Plus } from 'lucide-react'
import type { ToolResult, ToolResultItem, ToolResultKind } from './chatContract'
import { isBookmarked, toggleBookmark, useBookmarks } from '../career/bookmarkStore'

// 카드 한 장에 노출할 스킬 배지 최대 개수(초과분은 "+N"으로 압축) — 카드가 세로로 과하게
// 늘어나는 것을 막기 위한 컴팩트 상한. matched/missing 각각 독립으로 적용한다.
const MAX_SKILL_CHIPS = 6

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
  // matched/missing_skills는 resume_recommend(이력서 첨부)에서만 채워진다(백엔드 PR #81).
  // semantic_search는 둘 다 없거나 빈 배열 — 그 경우 배지 섹션 자체를 렌더하지 않는다(방어적, 빈 섹션 금지).
  const hasSkillBadges = (item.matched_skills?.length ?? 0) > 0 || (item.missing_skills?.length ?? 0) > 0

  return (
    <div className="rv__postingitem">
      <div className="rv__postingitem-main">
        <div className="rv__postingitem-title">{item.name}</div>
        <div className="rv__postingitem-sub">
          {item.company && <span className="rv__postingitem-co">{item.company}</span>}
          {pool && <span className="rc__badge">{pool}</span>}
          {item.region && (
            <span className="rc__badge rv__postingitem-region">
              <MapPin size={11} aria-hidden="true" />
              {item.region}
            </span>
          )}
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
        {hasSkillBadges && (
          <div className="rv__postingitem-skills">
            <SkillChipGroup kind="matched" skills={item.matched_skills} />
            <SkillChipGroup kind="missing" skills={item.missing_skills} />
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

// owned(초록)/missing(빨강) 스킬 배지 한 그룹. 색만으로 구분하지 않도록 아이콘(체크/플러스) +
// "보유"/"필요" 접두 라벨을 항상 함께 노출한다(색약 접근성). 개수가 많으면 앞쪽 MAX_SKILL_CHIPS개만
// 그리고 나머지는 "+N"칩으로 압축해 카드가 세로로 과하게 늘어나지 않게 한다.
function SkillChipGroup({ kind, skills }: { kind: 'matched' | 'missing'; skills?: string[] }) {
  if (!skills || skills.length === 0) return null
  const shown = skills.slice(0, MAX_SKILL_CHIPS)
  const overflow = skills.length - shown.length
  const isMatched = kind === 'matched'
  const groupClass = isMatched ? 'rv__skillchip-group rv__skillchip-group--matched' : 'rv__skillchip-group rv__skillchip-group--missing'
  const chipClass = isMatched ? 'rv__skillchip rv__skillchip--matched' : 'rv__skillchip rv__skillchip--missing'

  return (
    <div className={groupClass}>
      {shown.map((skill) => (
        <span key={skill} className={chipClass}>
          {isMatched ? <Check size={11} aria-hidden="true" /> : <Plus size={11} aria-hidden="true" />}
          <span className="rv__skillchip-kind">{isMatched ? '보유' : '필요'}</span>
          {skill}
        </span>
      ))}
      {overflow > 0 && <span className={`${chipClass} rv__skillchip--overflow`}>+{overflow}</span>}
    </div>
  )
}
