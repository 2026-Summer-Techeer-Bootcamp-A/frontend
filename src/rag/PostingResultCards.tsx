import { Link } from 'react-router-dom'
import { Bookmark, Check, ChevronRight, MapPin, Plus, Sparkles } from 'lucide-react'
import type { ToolResult, ToolResultItem, ToolResultKind } from './chatContract'
import { isBookmarked, toggleBookmark, useBookmarks } from '../career/bookmarkStore'

const MAX_SKILL_CHIPS = 6

const POSTING_LIST_KIND: ToolResultKind = 'posting_list'

export function isPostingListResult(result: ToolResult): boolean {
  return result.kind === POSTING_LIST_KIND && result.items.length > 0
}

interface PostingResultCardsProps {
  results: ToolResult[]
}

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
  useBookmarks()
  const idStr = item.id != null ? String(item.id) : null
  const bookmarked = idStr != null && isBookmarked(idStr)
  const pct = typeof item.pct === 'number' ? Math.max(0, Math.min(100, Math.round(item.pct))) : null
  const pool = poolLabel(item.pool)

  const hasSkillBadges =
    (item.matched_skills?.length ?? 0) > 0 ||
    (item.missing_skills?.length ?? 0) > 0 ||
    (item.concepts?.length ?? 0) > 0

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
            <SkillChipGroup kind="concept" skills={item.concepts} />
          </div>
        )}
        {item.highlight_snippet && (
          <div className="rv__postingitem-quote">
            <span className="rv__postingitem-quote-badge">💡 매칭 인용</span>
            <mark className="rv__postingitem-highlighter">
              "{item.highlight_snippet}"
            </mark>
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

function SkillChipGroup({ kind, skills }: { kind: 'matched' | 'missing' | 'concept'; skills?: string[] }) {
  if (!skills || skills.length === 0) return null
  const shown = skills.slice(0, MAX_SKILL_CHIPS)
  const overflow = skills.length - shown.length

  let groupClass = 'rv__skillchip-group'
  let chipClass = 'rv__skillchip'
  let labelText = '보유'
  let icon = <Check size={11} aria-hidden="true" />

  if (kind === 'matched') {
    groupClass += ' rv__skillchip-group--matched'
    chipClass += ' rv__skillchip--matched'
    labelText = '보유'
    icon = <Check size={11} aria-hidden="true" />
  } else if (kind === 'missing') {
    groupClass += ' rv__skillchip-group--missing'
    chipClass += ' rv__skillchip--missing'
    labelText = '필요'
    icon = <Plus size={11} aria-hidden="true" />
  } else if (kind === 'concept') {
    groupClass += ' rv__skillchip-group--concept'
    chipClass += ' rv__skillchip--concept'
    labelText = '개념'
    icon = <Sparkles size={11} aria-hidden="true" />
  }

  return (
    <div className={groupClass}>
      {shown.map((skill) => (
        <span key={skill} className={chipClass}>
          {icon}
          <span className="rv__skillchip-kind">{labelText}</span>
          {skill}
        </span>
      ))}
      {overflow > 0 && <span className={`${chipClass} rv__skillchip--overflow`}>+{overflow}</span>}
    </div>
  )
}
