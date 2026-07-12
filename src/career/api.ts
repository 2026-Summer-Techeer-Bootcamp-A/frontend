// ── 목 어댑터 계층 ────────────────────────────────────────────────
// 지금은 백엔드가 없어 localStorage + 지연 시뮬레이션으로 동작한다.
// 백엔드 연결 시 각 함수의 "몸통"만 fetch로 교체하면 화면 코드는 그대로 둔다.
//   예) authApi.login → return (await fetch('/api/v1/auth/login', ...)).json()
// state.ts / authStore.ts / settingsStore.ts 가 이 어댑터만 바라보게 해서
// 백엔드 교체 지점을 한 파일로 모은다.
import type { AuthUser } from './authStore'

const LATENCY = 650

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
function fail(message: string, ms = LATENCY): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export const authApi = {
  // 백엔드 자리: POST /api/v1/auth/login → { access_token }, 이어서 GET /me
  async login({ email, password }: { email: string; password: string }): Promise<{ user: AuthUser }> {
    if (!isEmail(email)) return fail('이메일 형식을 확인해주세요')
    if (password.length < 6) return fail('비밀번호는 6자 이상이에요')
    return delay({ user: { email, nickname: email.split('@')[0] } })
  },

  // 백엔드 자리: POST /api/v1/auth/signup (email, password, nickname)
  async signup({ email, password, nickname }: { email: string; password: string; nickname: string }): Promise<{ user: AuthUser }> {
    if (!isEmail(email)) return fail('이메일 형식을 확인해주세요')
    if (password.length < 6) return fail('비밀번호는 6자 이상이에요')
    return delay({ user: { email, nickname: nickname.trim() || email.split('@')[0] } })
  },
}

export const settingsApi = {
  // 백엔드 자리: PATCH /api/v1/settings — 지금은 로컬 저장이 정본이라 성공만 흉내낸다.
  async save(): Promise<{ ok: true }> {
    return delay({ ok: true }, 350)
  },
}
