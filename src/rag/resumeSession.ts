// 이력서 확인 세션 id(POST /resume/confirm 응답 session_id)를 화면 사이에서 넘기는 브리지.
// ResumeInsight가 confirm 성공 시 쓰고, RagConsole이 챗 요청에 실을 때 읽는다. 세션이 없으면
// undefined를 그대로 흘려 기존 태그 기반 비교로 강등된다(조용한 실패 아님).
const RESUME_SESSION_STORAGE_KEY = 'rag:resumeSessionId'

// 저장 이력서를 첨부할 때 상세 조회 → confirm 세션 생성이 비동기로 진행된다. 사용자가
// 선택 직후 전송해도 채팅 요청이 먼저 나가지 않도록, 이력서별 진행 중인 세션 생성을 잠시
// 보관한다. 실패는 undefined로 정규화해 이전 이력서의 세션을 잘못 재사용하지 않는다.
const pendingSeeds = new Map<number, Promise<string | undefined>>()

export function readResumeSessionId(): string | undefined {
  try {
    return sessionStorage.getItem(RESUME_SESSION_STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function writeResumeSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(RESUME_SESSION_STORAGE_KEY, sessionId)
  } catch {
    // sessionStorage 사용 불가(프라이빗 모드 등) — 배선을 건너뛴다. RagConsole은 세션이 없으면
    // 태그 기반 비교로 강등되므로 기능 자체는 계속 동작한다.
  }
}

export function beginResumeSessionSeed(resumeId: number, seed: Promise<string>): void {
  const tracked = seed.then(
    (sessionId) => sessionId,
    () => undefined,
  )
  pendingSeeds.set(resumeId, tracked)
  void tracked.then(() => {
    if (pendingSeeds.get(resumeId) === tracked) pendingSeeds.delete(resumeId)
  })
}

export async function resolveResumeSessionId(resumeId: number): Promise<string | undefined> {
  const pending = pendingSeeds.get(resumeId)
  if (pending) return pending
  return readResumeSessionId()
}
