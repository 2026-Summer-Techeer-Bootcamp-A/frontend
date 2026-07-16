import { getAuthToken } from '../career/authStore'

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
  })

  return postFeedback(confirmed.session_id, input.position)
}
