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
      <div className="rv__postingitem-top">
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
          {hasSkillBadges && (
            <div className="rv__postingitem-skills">
              <SkillChipGroup kind="matched" skills={item.matched_skills} />
              <SkillChipGroup kind="missing" skills={item.missing_skills} />
              <SkillChipGroup kind="concept" skills={item.concepts} />
            </div>
          )}
        </div>

        <div className="rv__postingitem-side">
          {pct !== null && <CircularMatchGauge pct={pct} />}
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
      </div>

      {item.highlight_snippet && <SplitMatchingQuote snippet={item.highlight_snippet} />}
    </div>
  )
}

function CircularMatchGauge({ pct }: { pct: number }) {
  const size = 36
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <div className="rv__postingitem-circle-fit">
      <div className="rv__circle-gauge">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            className="rv__circle-bg"
            stroke="#e2e8f0"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className="rv__circle-progress"
            stroke="#2563eb"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="rv__circle-val">{pct}%</span>
      </div>
      <span className="rv__circle-label">적합도</span>
    </div>
  )
}

function SplitMatchingQuote({ snippet }: { snippet: string }) {
  let queryPart = ''
  let targetPart = ''

  if (snippet.includes(' :: ')) {
    const parts = snippet.split(' :: ')
    queryPart = parts[0].trim()
    targetPart = parts.slice(1).join(' :: ').trim()
  } else if (snippet.includes(' 기반 ')) {
    const parts = snippet.split(' 기반 ')
    queryPart = parts[0].replace(/^"/, '').trim()
    targetPart = parts.slice(1).join(' 기반 ').replace(/"$/, '').trim()
  } else if (snippet.includes(':')) {
    const parts = snippet.split(':')
    queryPart = parts[0].trim()
    targetPart = parts.slice(1).join(':').trim()
  } else {
    queryPart = '요청/기준 직무'
    targetPart = snippet
  }

  // DB 원문 내 매칭 기술 키워드를 형광펜 하이라이트(<mark>)로 렌더링
  const renderHighlightedText = (text: string) => {
    const techRegex = /(JavaScript|TypeScript|HTML\/CSS|React|Node\.js|Express|Python|Django|FastAPI|Docker|Kubernetes|AWS|Git|MSA|REST API|CI\/CD|PostgreSQL|Linux|Server|Back-end|Backend|Frontend|Platform|Engine|DevOps|Java|Spring|C\+\+|C#)/gi
    const parts = text.split(techRegex)
    return parts.map((part, i) =>
      techRegex.test(part) ? (
        <mark key={i} className="rv__postingitem-highlighter">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="rv__postingitem-quote-split">
      <div className="rv__quote-col rv__quote-col--query">
        <span className="rv__quote-col-badge">질문 / 기준 공고</span>
        <div className="rv__quote-col-text">"{queryPart}"</div>
      </div>
      <div className="rv__quote-col-divider" />
      <div className="rv__quote-col rv__quote-col--target">
        <span className="rv__quote-col-badge">원문 매칭 하이라이트</span>
        <div className="rv__quote-col-text">"{renderHighlightedText(targetPart)}"</div>
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
