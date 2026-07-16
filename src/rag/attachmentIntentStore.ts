import { useEffect, useState } from 'react'
import type { ChatAttachment } from './chatContract'

// 외부 화면(공고 상세 등)이 어시스턴트로 첨부 맥락을 "핸드오프"하는 경량 모듈 스토어.
// career/authStore.ts와 같은 패턴(모듈 스코프 변수 + window CustomEvent + 구독 훅)을 그대로
// 따르되, localStorage에는 쓰지 않는다 — 이건 로그인 세션처럼 새로고침 뒤에도 살아있어야 할
// 데이터가 아니라, 같은 SPA 네비게이션 한 번(공고 상세 → /assistant) 동안만 유효한 1회성
// 핸드오프라 모듈 메모리로 충분하고, 오히려 다음 방문에 낡은 intent가 새 화면에 잘못
// 주입되는 사고를 막아준다.
export interface AttachmentIntent {
  attachments: ChatAttachment[]
  seedQuestion?: string
}

const INTENT_EVENT = 'attachment-intent-change'
const PENDING_COMPARE_EVENT = 'attachment-pending-compare-change'

let pendingIntent: AttachmentIntent | null = null

/** 외부 화면이 어시스턴트로 넘길 첨부 의도를 세팅한다. 이 직후 호출측이 라우팅으로
 *  /assistant로 이동시키는 것까지가 한 세트다(스토어 자체는 라우팅을 모른다). */
export function setAttachmentIntent(intent: AttachmentIntent) {
  pendingIntent = intent
  window.dispatchEvent(new Event(INTENT_EVENT))
}

/** 어시스턴트 마운트 시 1회 호출 — 대기 중인 intent를 반환하고 즉시 비운다.
 *  이후 재마운트·재렌더에서 다시 호출해도 null만 돌아와 중복 주입되지 않는다. */
export function consumeAttachmentIntent(): AttachmentIntent | null {
  const intent = pendingIntent
  if (intent) {
    pendingIntent = null
    window.dispatchEvent(new Event(INTENT_EVENT))
  }
  return intent
}

export function hasAttachmentIntent(): boolean {
  return pendingIntent !== null
}

/** intent 존재 여부를 구독하는 훅. 지금은 어디서도 안 쓰지만(어시스턴트는 마운트 시
 *  1회 consume으로 충분), 트리거 버튼 쪽에서 "이미 대기 중인 intent가 있어요" 같은
 *  안내가 필요해지면 바로 붙일 수 있게 훅 형태로 공개해둔다. */
export function useAttachmentIntentPending(): boolean {
  const [pending, setPending] = useState(hasAttachmentIntent)
  useEffect(() => {
    const handle = () => setPending(hasAttachmentIntent())
    window.addEventListener(INTENT_EVENT, handle)
    return () => window.removeEventListener(INTENT_EVENT, handle)
  }, [])
  return pending
}

// ── 공고 ↔ 공고 비교의 2단계 담기 흐름 ──────────────────────────────────────
// 컴포저의 첨부 피커에는 공고 소스가 없어(1.1 참고: 최근 본 공고 섹션 생략), 공고 첨부는
// 오직 공고 화면의 트리거로만 만들어진다. 두 공고를 비교하려면 화면을 오가며 "먼저 담고,
// 다른 공고에서 이어서 비교"하는 2단계가 필요한데, 그 사이(첫 공고 담은 뒤 목록으로 돌아가
// 두 번째 공고를 찾는 동안) 담아둔 공고 하나를 들고 있을 슬롯이 필요하다. 이 슬롯이 그것.
export interface PendingComparePosting {
  id: number
  title: string
}

let pendingComparePosting: PendingComparePosting | null = null

export function setPendingComparePosting(posting: PendingComparePosting) {
  pendingComparePosting = posting
  window.dispatchEvent(new Event(PENDING_COMPARE_EVENT))
}

export function getPendingComparePosting(): PendingComparePosting | null {
  return pendingComparePosting
}

export function clearPendingComparePosting() {
  pendingComparePosting = null
  window.dispatchEvent(new Event(PENDING_COMPARE_EVENT))
}

/** 담아둔 비교 공고를 구독하는 훅 — 공고 상세 화면이 "비교할 공고 담기"/"이 공고와 비교"
 *  중 어느 버튼을 보여줄지 결정하는 데 쓴다. */
export function usePendingComparePosting(): PendingComparePosting | null {
  const [posting, setPosting] = useState<PendingComparePosting | null>(getPendingComparePosting)
  useEffect(() => {
    const handle = () => setPosting(getPendingComparePosting())
    window.addEventListener(PENDING_COMPARE_EVENT, handle)
    return () => window.removeEventListener(PENDING_COMPARE_EVENT, handle)
  }, [])
  return posting
}
