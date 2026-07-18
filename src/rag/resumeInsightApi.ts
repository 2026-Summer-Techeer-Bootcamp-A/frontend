import { getAuthToken } from '../career/authStore'
import { writeResumeSessionId } from './resumeSession'

// chatApi.ts와 동일한 컨벤션: 상대 경로 API_BASE + fetch + FastAPI detail 파싱.
// 백엔드 계약 원천: backend/app/schemas/resume.py (ResumeConfirmRequest/Response, ResumeFeedbackRequest/Response).
// PDF 파싱은 의도적으로 쓰지 않는다 — 사용자가 스킬을 직접 입력해 confirm에 넘긴다.
const API_BASE = '/api/v1'

export type Pool = 'global' | 'domestic'

export interface ParsedSkillInput {
  canonical: string
  category: string
  in_dict: boolean
}

export interface ResumeConfirmRequestBody {
  skills: ParsedSkillInput[]
  position: string | null
  career_min: number | null
  career_max: number | null
  pool: Pool
  memo?: string | null
  // confirm 세션에 실려 커리어 적합도 LLM 판정이 원문으로 쓰는 값. Postgres 저장 안 함.
  resume_text?: string | null
}

export interface ResumeConfirmResponse {
  session_id: string
  ttl: number
}

export interface ResumeFeedbackResponse {
  feedback: string[]
  questions: string[]
  model: string
  degraded: boolean
}

export interface ResumeFeedbackInput {
  skills: ParsedSkillInput[]
  position: string
  careerMin: number | null
  careerMax: number | null
  pool: Pool
  memo?: string | null
}

export interface SavedResumeListItem {
  resume_id: number
  title: string
  position: string | null
}

export interface SavedResumeDetail {
  resume_id: number
  title: string
  skills: ParsedSkillInput[]
  position: string
  career_min: number
  career_max: number
  pool: Pool
  memo: string | null
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const data = await response.json().catch(() => null)
  throw new Error(typeof data?.detail === 'string' ? data.detail : fallback)
}

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function postResumeConfirm(body: ResumeConfirmRequestBody): Promise<ResumeConfirmResponse> {
  const response = await fetch(`${API_BASE}/resume/confirm`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return parseError(response, '스킬셋을 확인하지 못했어요. 잠시 후 다시 시도해주세요.')
  }

  return response.json() as Promise<ResumeConfirmResponse>
}

async function postFeedback(sessionId: string, position: string): Promise<ResumeFeedbackResponse> {
  const response = await fetch(`${API_BASE}/resume/feedback`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ session_id: sessionId, position }),
  })

  if (!response.ok) {
    return parseError(response, '피드백을 가져오지 못했어요. 잠시 후 다시 시도해주세요.')
  }

  return response.json() as Promise<ResumeFeedbackResponse>
}

/** 로그인한 사용자가 등록해둔 이력서 목록. 인증 없으면 백엔드가 401을 준다 — 호출측이 처리. */
export async function getSavedResumes(): Promise<SavedResumeListItem[]> {
  const response = await fetch(`${API_BASE}/resume`, { headers: authHeaders() })
  if (!response.ok) {
    return parseError(response, '저장된 이력서를 불러오지 못했어요.')
  }
  const data = (await response.json()) as { items: SavedResumeListItem[] }
  return data.items
}

export async function getSavedResumeDetail(resumeId: number): Promise<SavedResumeDetail> {
  const response = await fetch(`${API_BASE}/resume/${resumeId}`, { headers: authHeaders() })
  if (!response.ok) {
    return parseError(response, '이력서를 불러오지 못했어요.')
  }
  return response.json() as Promise<SavedResumeDetail>
}

// 이력서 원문을 별도로 받지 않으므로(스킬 직접 입력 방식) 구조화 입력을 사람이 읽는 블록으로
// 합성해 confirm 세션에 싣는다. LLM 판정이 이 텍스트에서 근거를 인용하고, 할루시네이션 가드가
// 인용이 이 텍스트의 부분문자열인지 검증한다. 원문 PDF나 개인정보는 담지 않는다.
function composeResumeText(input: ResumeFeedbackInput): string | null {
  const lines: string[] = []
  if (input.position?.trim()) lines.push(`지원 직무: ${input.position.trim()}`)
  if (input.careerMin != null || input.careerMax != null) {
    const min = input.careerMin ?? 0
    lines.push(input.careerMax != null ? `경력: ${min}~${input.careerMax}년` : `경력: ${min}년 이상`)
  }
  if (input.skills.length > 0) {
    lines.push(`보유 기술: ${input.skills.map((s) => s.canonical).join(', ')}`)
  }
  if (input.memo?.trim()) lines.push(`경력 요약: ${input.memo.trim()}`)
  const text = lines.join('\n')
  return text.length > 0 ? text.slice(0, 20000) : null
}

/** confirm → feedback 2단계 호출을 한 번에 처리한다.
 *  confirm은 스킬셋을 서버 세션에 짧게 저장하고, feedback이 그 세션을 근거로 피드백·면접 질문을 생성한다. */
export async function postResumeFeedback(input: ResumeFeedbackInput): Promise<ResumeFeedbackResponse> {
  const confirmed = await postResumeConfirm({
    skills: input.skills,
    position: input.position || null,
    career_min: input.careerMin,
    career_max: input.careerMax,
    pool: input.pool,
    memo: input.memo ?? null,
    resume_text: composeResumeText(input),
  })

  // confirm 세션 id를 브리지에 실어 어시스턴트(RagConsole)가 커리어 적합도 LLM 비교를 태울 수
  // 있게 한다. 세션은 한 시간 뒤 Redis에서 소멸한다.
  writeResumeSessionId(confirmed.session_id)

  return postFeedback(confirmed.session_id, input.position)
}
