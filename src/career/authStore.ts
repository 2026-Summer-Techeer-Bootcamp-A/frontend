import { useEffect, useState } from 'react'
import { authApi } from './api'

// 로그인 세션(목업). 백엔드 연결 전까지 localStorage에 유저만 보관한다.
// 선택적 게이팅: 로그인 안 해도 앱은 돌아가고, 로그인 시 화면이 유저 정보를 반영한다.
export type AuthUser = { email: string; nickname: string }

const STORAGE_KEY_AUTH = 'techeer_auth'
const AUTH_EVENT = 'auth-change'

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY_AUTH)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function writeAuthUser(user: AuthUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY_AUTH)
  // state.ts 패턴과 동일하게 window 이벤트로 전 화면에 변경을 알린다.
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser)

  useEffect(() => {
    const handle = () => setUser(getAuthUser())
    window.addEventListener(AUTH_EVENT, handle)
    return () => window.removeEventListener(AUTH_EVENT, handle)
  }, [])

  const login = async (email: string, password: string) => {
    const { user: u } = await authApi.login({ email, password })
    writeAuthUser(u)
    return u
  }

  const signup = async (email: string, password: string, nickname: string) => {
    const { user: u } = await authApi.signup({ email, password, nickname })
    writeAuthUser(u)
    return u
  }

  const updateProfile = (patch: Partial<AuthUser>) => {
    const cur = getAuthUser()
    if (!cur) return
    writeAuthUser({ ...cur, ...patch })
  }

  const logout = () => writeAuthUser(null)

  return { user, isAuthed: !!user, login, signup, updateProfile, logout }
}
