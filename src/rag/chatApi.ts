import { getAuthToken } from '../career/authStore'
import type { ChatRequestBody, ChatResponse, Pool } from './chatContract'

// career/recruitmentApi.ts와 동일한 컨벤션: 상대 경로 API_BASE + fetch + FastAPI detail 파싱.
const API_BASE = '/api/v1'

export async function postChat(question: string, pool?: Pool): Promise<ChatResponse> {
  const token = getAuthToken()
  const body: ChatRequestBody = { question, ...(pool ? { pool } : {}) }

  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(typeof data?.detail === 'string' ? data.detail : '답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.')
  }

  return response.json() as Promise<ChatResponse>
}
