import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import type { FeedPostingDto } from '../../../career/homeApi'
import { ddayInfo } from '../../../career/state'
import { toggleBookmark, useBookmarks } from '../../../career/bookmarkStore'
import { recordView } from '../../../career/viewHistoryStore'

const MAX_SKILL_CHIPS = 6

function relativeTime(postDate: string | null): string {
  if (!postDate) return '날짜 미상'
  const diffMs = Date.now() - new Date(postDate).getTime()
  if (diffMs < 0) return '방금 전'
  const diffHours = diffMs / 3_600_000
  if (diffHours < 1) return '방금 전'
  if (diffHours < 24) return `${Math.floor(diffHours)}시간 전`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return '어제'
  return `${diffDays}일 전`
}

type SkillChip = { name: string; kind: 'owned' | 'missing' | 'cat' }

export default function HomeFeedCard({ posting, asOf }: { posting: FeedPostingDto; asOf: string }) {
  const navigate = useNavigate()
  const bookmarks = useBookmarks()
  const postingKey = String(posting.id)
  const saved = bookmarks.includes(postingKey)

  // 마감일이 없거나 이미 지난 경우(dd === null) 상시채용으로 표기한다.
  const dd = posting.close_date ? ddayInfo(posting.close_date, asOf) : null
  const badge = dd
    ? { text: `D-${dd.d}`, variant: 'dday' as const, urgent: dd.d <= 3 }
    : { text: '상시채용', variant: 'always' as const, urgent: false }

  const handleOpen = () => {
    recordView(postingKey)
    navigate(`/job/${posting.id}`)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  const handleBookmark = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    toggleBookmark(postingKey)
  }

  const match = posting.match
  const skillChips: SkillChip[] = match
    ? [
        ...match.owned_skills.map((name): SkillChip => ({ name, kind: 'owned' })),
        ...match.missing_skills.map((name): SkillChip => ({ name, kind: 'missing' })),
      ]
    : posting.skills.map((name): SkillChip => ({ name, kind: 'cat' }))
  const visibleSkillChips = skillChips.slice(0, MAX_SKILL_CHIPS)
  const extraSkillCount = skillChips.length - visibleSkillChips.length

  const logoChar = (posting.company ?? posting.title ?? '?').trim().slice(0, 1) || '?'
  const subLine = [posting.industry, posting.region].filter(Boolean).join(' · ')
  const rateRounded = match ? Math.round(match.rate) : null

  return (
    <article
      className="hfeed-card"
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="hfeed-card__head">
        <div className="hfeed-card__logo">{logoChar}</div>
        <div className="hfeed-card__meta">
          <div className="hfeed-card__company">{posting.company ?? '기업명 미상'}</div>
          {subLine && <div className="hfeed-card__sub">{subLine}</div>}
          <div className="hfeed-card__title">{posting.title}</div>
        </div>
        {match && rateRounded != null && (
          <div className="hfeed-ring__wrap">
            <div
              className="hfeed-ring"
              role="img"
              aria-label={`이력서 매치율 ${rateRounded}%`}
              style={{ background: `conic-gradient(var(--c-accent) 0 ${rateRounded}%, var(--track) ${rateRounded}%)` }}
            >
              <b className="tnum">{rateRounded}%</b>
            </div>
            <span className="hfeed-ring__cap">매치</span>
          </div>
        )}
      </div>

      <div className="hfeed-card__timerow">
        <span className="hfeed-card__time tnum">{relativeTime(posting.post_date)}</span>
        <span
          className={`hfeed-badge tnum ${badge.variant === 'dday' ? 'hfeed-badge--dday' : 'hfeed-badge--always'}${badge.urgent ? ' is-urgent' : ''}`}
        >
          {badge.text}
        </span>
      </div>

      <div className="hfeed-card__chips">
        {posting.categories.map((cat) => (
          <span key={`cat-${cat}`} className="hfeed-chip--cat">{cat}</span>
        ))}
        {visibleSkillChips.map((chip) => (
          <span
            key={chip.name}
            className={
              chip.kind === 'owned' ? 'hfeed-chip--owned' : chip.kind === 'missing' ? 'hfeed-chip--missing' : 'hfeed-chip--cat'
            }
          >
            {chip.name}
          </span>
        ))}
        {extraSkillCount > 0 && <span className="hfeed-chip--more">+{extraSkillCount}</span>}
      </div>

      <div className="hfeed-card__foot">
        {match ? (
          <span className="hfeed-card__matchsum">
            보유 <b className="tnum">{match.owned_skills.length}</b> · 부족 <b className="tnum">{match.missing_skills.length}</b>
          </span>
        ) : (
          <span />
        )}
        <div className="hfeed-card__actions">
          <span className="hfeed-card__detail">상세보기</span>
          <button
            type="button"
            className={`hfeed-card__bookmark${saved ? ' is-saved' : ''}`}
            aria-label={saved ? '북마크 해제' : '북마크 추가'}
            onClick={handleBookmark}
          >
            <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  )
}
