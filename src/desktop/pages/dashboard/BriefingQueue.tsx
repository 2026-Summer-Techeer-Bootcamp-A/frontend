import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { usePrefersReducedMotion } from '../../../shared/useMediaQuery'

/** 1a 액션 큐 — 우측 레일 "오늘 브리핑"의 텍스트 li 나열을 처리 가능한 카드 큐로 바꾼다.
 * 카드를 처리(CTA 클릭)하면 체크 모션과 함께 스택에서 빠지고 다음 카드가 올라온다. 처리
 * 상태는 날짜 키로 localStorage에 저장해 같은 날 다시 뜨지 않게 하고, 날짜가 바뀌면(기기
 * 실제 오늘 기준) 자동으로 리셋된다. */
export type QueueCardKind = 'deadline' | 'roadmap' | 'new'
export type QueueCard = {
  id: string
  kind: QueueCardKind
  eyebrow: string
  title: string
  ddayLabel?: string
  metricLabel?: ReactNode
  ctaLabel: string
  ghost?: boolean
  onAction: () => void
}

const STORAGE_KEY = 'dov-briefing-queue-done'
const CHECK_MS = 420

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadDone(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { date?: string; done?: string[] }
    if (parsed.date !== todayKey() || !Array.isArray(parsed.done)) return new Set()
    return new Set(parsed.done)
  } catch {
    return new Set()
  }
}

function saveDone(done: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), done: [...done] }))
  } catch {
    // 저장 실패(사생활 보호 모드 등)해도 큐 자체는 세션 동안 정상 동작해야 하니 조용히 무시한다.
  }
}

export function BriefingQueue({ cards }: { cards: QueueCard[] }) {
  const [doneIds, setDoneIds] = useState<Set<string>>(() => loadDone())
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => { if (timerRef.current != null) window.clearTimeout(timerRef.current) }, [])

  const total = cards.length
  const remaining = cards.filter((c) => !doneIds.has(c.id))
  const doneCount = total - remaining.length

  // localStorage 저장은 setState 업데이터 함수 안이 아니라 여기서 동기로 바로 실행한다 —
  // onAction()이 navigate()로 라우트를 바꾸면 이 컴포넌트가 곧장 언마운트되는데, 그 경우
  // setDoneIds에 넘긴 업데이터 함수는 리액트가 재렌더를 처리하기도 전에 통째로 버려질 수
  // 있어(부수효과가 있는 업데이트는 반영이 보장되지 않는다) 저장이 유실됐다.
  const complete = (card: QueueCard) => {
    const next = new Set(doneIds)
    next.add(card.id)
    saveDone(next)
    setDoneIds(next)
    card.onAction()
  }

  const handleAction = (card: QueueCard) => {
    if (checkingId) return
    if (reducedMotion) { complete(card); return }
    setCheckingId(card.id)
    timerRef.current = window.setTimeout(() => {
      setCheckingId(null)
      complete(card)
    }, CHECK_MS)
  }

  if (total === 0 || remaining.length === 0) {
    return (
      <div className="dov-aq dov-aq--empty" role="status">
        <span className="dov-aq__empty-icon"><Check size={17} /></span>
        <p className="dov-aq__empty-title">오늘 할 일 끝!</p>
        <span className="dov-aq__empty-sub">새 브리핑은 내일 다시 채워져요.</span>
      </div>
    )
  }

  const visible = remaining.slice(0, 3)

  return (
    <div className="dov-aq">
      <div className="dov-aq__progress">
        <span>오늘 할 일</span>
        <span className="dov-aq__bar"><i style={{ width: `${(doneCount / total) * 100}%` }} /></span>
        <span className="dov-aq__pn tnum">{Math.min(doneCount + 1, total)} / {total}</span>
      </div>
      <div className="dov-aq__stack">
        {visible.map((card, i) => (
          <div
            key={card.id}
            className={`dov-aq__card dov-aq__card--pos${i}${checkingId === card.id ? ' dov-aq__card--checking' : ''}`}
            style={{ zIndex: visible.length - i }}
            aria-hidden={i > 0}
          >
            <div className="dov-aq__row">
              <span className="dov-aq__eyebrow">{card.eyebrow}</span>
              {card.ddayLabel && <span className="dov-aq__dday">{card.ddayLabel}</span>}
            </div>
            <div className="dov-aq__title">{card.title}</div>
            {i < 2 && (
              <div className="dov-aq__foot">
                {card.metricLabel && <span className="dov-aq__metric">{card.metricLabel}</span>}
                {i === 0 ? (
                  <button
                    type="button"
                    className={`dov-aq__btn${card.ghost ? ' ghost' : ''}`}
                    onClick={() => handleAction(card)}
                  >
                    {card.ctaLabel}
                  </button>
                ) : (
                  <span className={`dov-aq__btn dov-aq__btn--preview${card.ghost ? ' ghost' : ''}`}>{card.ctaLabel}</span>
                )}
              </div>
            )}
            {i === 0 && checkingId === card.id && (
              <div className="dov-aq__check" role="status" aria-live="polite">
                <span className="dov-aq__check-ring"><Check size={16} /></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
