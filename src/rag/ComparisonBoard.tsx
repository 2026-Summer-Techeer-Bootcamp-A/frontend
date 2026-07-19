import { useState } from 'react'
import { Layers, RotateCcw, X } from 'lucide-react'
import { relativeTime, removeFromCompareBoard, useCompareBoard, type CompareBoardCard } from './compareBoardStore'

// 비교 보드(4b) — 헤더의 작은 토글 버튼 + 접이식 드로어. 지금까지 비교한 공고를 카드로 쌓아두고,
// 카드를 클릭하면 그 공고와 다시 비교하는 질문을 자동 구성해 보낸다. 드래그 앤 드롭은 생략한다
// (스펙 결정 — 좁은 화면·터치에서도 클릭 하나로 같은 결과를 내는 경로가 항상 있어야 한다).

interface ComparisonBoardProps {
  busy: boolean
  onRecompare: (card: CompareBoardCard) => void
}

export default function ComparisonBoard({ busy, onRecompare }: ComparisonBoardProps) {
  const cards = useCompareBoard()
  const [open, setOpen] = useState(false)

  if (cards.length === 0) return null

  return (
    <>
      <button
        type="button"
        className="rc__board-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="비교한 공고 보드 열기"
      >
        <Layers size={14} aria-hidden="true" />
        <span className="rc__board-toggle-cnt">{cards.length}</span>
      </button>

      {open && (
        <div className="rc__board" role="dialog" aria-label="비교한 공고 보드">
          <div className="rc__board-head">
            <span>비교한 공고</span>
            <span className="rc__board-head-cnt">{cards.length}개</span>
            <button type="button" className="rc__board-close" onClick={() => setOpen(false)} aria-label="보드 닫기">
              <X size={14} />
            </button>
          </div>
          <div className="rc__board-list">
            {cards.map((card) => (
              <div className="rc__board-card" key={card.id}>
                <button
                  type="button"
                  className="rc__board-card-main"
                  onClick={() => { onRecompare(card); setOpen(false) }}
                  disabled={busy}
                >
                  <span className="rc__board-card-logo">{card.title.slice(0, 1)}</span>
                  <span className="rc__board-card-info">
                    <span className="rc__board-card-title">{card.title}</span>
                    <span className="rc__board-card-meta">{relativeTime(card.addedAt)}</span>
                  </span>
                  <span className="rc__board-card-fit">{card.subtitle}</span>
                </button>
                <button
                  type="button"
                  className="rc__board-card-x"
                  onClick={() => removeFromCompareBoard(card.id)}
                  aria-label={`${card.title} 보드에서 제거`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="rc__board-hint">
            <RotateCcw size={12} aria-hidden="true" /> 카드를 누르면 이 공고와 다시 비교해요
          </div>
        </div>
      )}
    </>
  )
}
