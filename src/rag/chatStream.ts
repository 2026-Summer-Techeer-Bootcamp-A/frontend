import { getAuthToken } from '../career/authStore'
import type { ChatAttachment, ChatStreamEvent, Pool } from './chatContract'

// POST /api/v1/chat/stream 소비 클라이언트 — SSE지만 POST가 필요해 EventSource 대신
// fetch + ReadableStream reader로 직접 파싱한다. 계약: 세션 스크래치패드 sse-chat-contract.md.
const API_BASE = '/api/v1'

export interface StreamHandlers {
  onPlan?: (e: Extract<ChatStreamEvent, { type: 'plan' }>) => void
  onStep?: (e: Extract<ChatStreamEvent, { type: 'step' }>) => void
  onResult?: (e: Extract<ChatStreamEvent, { type: 'result' }>) => void
  onFinal?: (e: Extract<ChatStreamEvent, { type: 'final' }>) => void
  onError?: (message: string) => void
}

export interface StreamChatOptions {
  pool?: Pool
  verbose?: boolean
  attachments?: ChatAttachment[]
  signal?: AbortSignal
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** 프레임 하나(data: ...로 시작하는 한 줄 이상)를 파싱해 해당 핸들러로 디스패치한다. */
function dispatchFrame(rawFrame: string, handlers: StreamHandlers) {
  const lines = rawFrame.split('\n').filter((l) => l.startsWith('data:'))
  if (lines.length === 0) return
  const jsonStr = lines.map((l) => l.slice(5).trimStart()).join('\n')
  if (!jsonStr.trim()) return

  let evt: ChatStreamEvent
  try {
    evt = JSON.parse(jsonStr) as ChatStreamEvent
  } catch {
    // 파싱 실패한 프레임은 조용히 건너뛴다 — 스트림 자체를 끊지 않는다.
    return
  }

  switch (evt.type) {
    case 'plan':
      handlers.onPlan?.(evt)
      break
    case 'step':
      handlers.onStep?.(evt)
      break
    case 'result':
      handlers.onResult?.(evt)
      break
    case 'final':
      handlers.onFinal?.(evt)
      break
    case 'error':
      handlers.onError?.(evt.message)
      break
  }
}

/** question을 스트리밍 엔드포인트로 보내고, 프레임이 도착하는 즉시 handlers로 하나씩 통지한다.
 *  청크는 \n\n으로 구분된 프레임 경계가 아무 데서나 잘려서 올 수 있으므로, 디코딩한 텍스트를
 *  buffer에 누적하고 \n\n을 찾을 때마다 그 앞부분만 잘라 처리 — 남은 조각은 항상 buffer에 남긴다.
 *
 *  attachments는 프론트 컴포저의 개념 모델(ChatAttachment[])일 뿐, 백엔드는 이걸 모른다 —
 *  백엔드 계약은 resume_id(단수) + posting_ids(배열)이라, 여기서 변환해 실어 보낸다.
 *  signal은 Stop 버튼(AbortController.abort())을 fetch에 그대로 배선하기 위한 것. */
export async function streamChat(
  question: string,
  opts: StreamChatOptions,
  handlers: StreamHandlers,
): Promise<void> {
  const { pool, verbose, attachments, signal } = opts

  // 이력서는 대화당 1개만(백엔드가 resume_id 단수 필드) — 여러 개 첨부돼 있어도 첫 번째만 쓴다.
  const resumeAttachment = attachments?.find((a) => a.kind === 'resume')
  const postingIds = attachments?.filter((a) => a.kind === 'posting').map((a) => a.id) ?? []

  const body = {
    question,
    ...(pool ? { pool } : {}),
    ...(verbose ? { verbose: true } : {}),
    ...(resumeAttachment ? { resume_id: resumeAttachment.id } : {}),
    ...(postingIds.length > 0 ? { posting_ids: postingIds } : {}),
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (isAbortError(err)) {
      handlers.onError?.('답변 생성을 중단했어요.')
      return
    }
    handlers.onError?.('서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.')
    return
  }

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null)
    handlers.onError?.(typeof data?.detail === 'string' ? data.detail : '답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIdx = buffer.indexOf('\n\n')
      while (sepIdx !== -1) {
        const rawFrame = buffer.slice(0, sepIdx)
        buffer = buffer.slice(sepIdx + 2)
        dispatchFrame(rawFrame, handlers)
        sepIdx = buffer.indexOf('\n\n')
      }
    }
    // 서버가 스트림 끝에 마지막 \n\n을 안 보냈을 수도 있으니 남은 버퍼도 마저 처리한다.
    if (buffer.trim()) dispatchFrame(buffer, handlers)
  } catch (err) {
    if (isAbortError(err)) {
      handlers.onError?.('답변 생성을 중단했어요.')
      return
    }
    handlers.onError?.('스트리밍 중 연결이 끊겼어요. 잠시 후 다시 시도해주세요.')
  }
}
