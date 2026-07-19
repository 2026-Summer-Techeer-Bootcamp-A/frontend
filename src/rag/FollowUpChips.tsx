import { ChevronRight } from 'lucide-react'
import type { Confidence, ToolResult } from './chatContract'
import { buildFollowUps } from './followUps'

interface FollowUpChipsProps {
  confidence: Confidence
  results: ToolResult[]
  busy: boolean
  onPick: (question: string) => void
}

// 4d 후속 질문 체인 — final 프레임 뒤(FinalBlock 아래)에 붙는다. 클릭하면 기존 submit 로직으로
// 그대로 전송한다(새 전송 경로를 만들지 않는다).
export default function FollowUpChips({ confidence, results, busy, onPick }: FollowUpChipsProps) {
  const items = buildFollowUps(confidence, results)
  if (items.length === 0) return null

  return (
    <div className="rc__followups">
      <div className="rc__followups-h">이어서 물어볼까요?</div>
      {items.map((item, i) => (
        <button key={i} type="button" className="rc__followup" disabled={busy} onClick={() => onPick(item.question)}>
          <span className="rc__followup-badge">{item.badge}</span>
          <span className="rc__followup-q">{item.question}</span>
          <ChevronRight size={14} className="rc__followup-chev" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
