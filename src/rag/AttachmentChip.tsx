import { ClipboardList, FileText, X } from 'lucide-react'
import type { ChatAttachment } from './chatContract'

// 컴포저 칩 트레이 · 유저 버블에서 공용으로 쓰는 카드형 첨부 칩. ri__skillchip의 pill+✕ 패턴을
// 카드형으로 확장한 것(스펙 1.2/1.6) — 문서/공고 아이콘 배지 + 제목 + 서브 + 제거 버튼.
interface AttachmentChipProps {
  attachment: ChatAttachment
  onRemove?: () => void
  compact?: boolean
}

const KIND_LABEL: Record<ChatAttachment['kind'], string> = {
  resume: '이력서',
  posting: '공고',
}

export default function AttachmentChip({ attachment, onRemove, compact = false }: AttachmentChipProps) {
  const Icon = attachment.kind === 'resume' ? FileText : ClipboardList
  const kindLabel = KIND_LABEL[attachment.kind]

  if (compact) {
    // 전송 후 유저 버블(rc__q) 안에 나오는 축약 칩 — 제거 버튼 없이 아이콘 + 제목만.
    return (
      <span className="rc__q-chip">
        <Icon size={11} aria-hidden="true" />
        <span className="rc__sr-only">{kindLabel}: </span>
        {attachment.title}
      </span>
    )
  }

  return (
    <div className="rc__achip">
      <span className="rc__achip-ic" aria-hidden="true"><Icon size={14} /></span>
      <span className="rc__achip-t">
        <span className="rc__sr-only">{kindLabel}: {attachment.title}</span>
        <span className="rc__achip-title" aria-hidden="true">{attachment.title}</span>
        {attachment.subtitle && <span className="rc__achip-sub" aria-hidden="true">{attachment.subtitle}</span>}
      </span>
      {onRemove && (
        <button
          type="button"
          className="rc__achip-x"
          onClick={onRemove}
          aria-label={`${attachment.title} 첨부 제거`}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
