import { useCallback, useMemo, useState } from 'react'
import type { AttachmentKind, ChatAttachment } from './chatContract'

// 첨부(이력서·공고) 상태 훅. 컴포저 하나가 하나의 인스턴스를 들고 있는다.
// 이력서는 백엔드가 resume_id 단수 필드만 받으므로 동시에 1개만 유지(추가하면 기존 것 교체).
// 공고는 여러 개 첨부 가능(백엔드 posting_ids[]).
export function useAttachments() {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])

  const add = useCallback((attachment: ChatAttachment) => {
    setAttachments((prev) => {
      const already = prev.some((a) => a.kind === attachment.kind && a.id === attachment.id)
      if (already) return prev
      if (attachment.kind === 'resume') {
        // 이력서는 단수 — 새로 고르면 기존 이력서 첨부를 교체한다.
        return [...prev.filter((a) => a.kind !== 'resume'), attachment]
      }
      return [...prev, attachment]
    })
  }, [])

  const remove = useCallback((kind: AttachmentKind, id: number) => {
    setAttachments((prev) => prev.filter((a) => !(a.kind === kind && a.id === id)))
  }, [])

  const clear = useCallback(() => setAttachments([]), [])

  // textarea가 비어 있는데 첨부만 있을 때 자동으로 채울 기본 질문. 유저 버블엔 이 텍스트를
  // 그대로 보여줘 "무엇을 물었는지"를 투명하게 유지한다(스펙 1.3).
  const defaultQuestion = useMemo(() => defaultQuestionFor(attachments), [attachments])

  return { attachments, add, remove, clear, defaultQuestion }
}

export function defaultQuestionFor(attachments: ChatAttachment[]): string | null {
  const resumeCount = attachments.filter((a) => a.kind === 'resume').length
  const postingCount = attachments.filter((a) => a.kind === 'posting').length

  if (resumeCount === 1 && postingCount === 0) return '내 이력서를 시장과 비교해줘'
  if (resumeCount === 1 && postingCount === 1) return '이 이력서로 이 공고에 지원하면 뭐가 부족할까?'
  if (resumeCount === 0 && postingCount === 2) return '두 공고의 요구 기술을 비교해줘'
  return null
}
