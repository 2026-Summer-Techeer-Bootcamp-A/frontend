// 이력서 확인 세션 id(POST /resume/confirm 응답 session_id)를 화면 사이에서 넘기는 브리지.
// ResumeInsight가 confirm 성공 시 쓰고, RagConsole이 챗 요청에 실을 때 읽는다. 세션이 없으면
// undefined를 그대로 흘려 기존 태그 기반 비교로 강등된다(조용한 실패 아님).
const RESUME_SESSION_STORAGE_KEY = 'rag:resumeSessionId'

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
