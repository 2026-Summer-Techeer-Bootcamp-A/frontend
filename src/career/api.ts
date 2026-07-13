import type { AuthUser } from './authStore'

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export type AuthToken = {
  access_token: string
  token_type: string
}

type FastApiValidationError = {
  msg?: string
}

function formatApiError(detail: unknown) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item: FastApiValidationError) => item.msg ?? '입력값을 확인해주세요')
      .join('\n')
  }
  return '요청에 실패했어요'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(formatApiError(data?.detail))
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const authApi = {
  login(body: { email: string; password: string }) {
    return request<AuthToken>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  signup(body: { email: string; password: string; nickname: string }) {
    return request<AuthUser>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ ...body, nickname: body.nickname.trim() || null }),
    })
  },

  me(token: string) {
    return request<AuthUser>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  logout(token: string) {
    return request<void>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

export const settingsApi = {
  // 백엔드 자리: PATCH /api/v1/settings — 지금은 로컬 저장이 정본이라 성공만 흉내낸다.
  async save(): Promise<{ ok: true }> {
    return { ok: true }
  },
}
