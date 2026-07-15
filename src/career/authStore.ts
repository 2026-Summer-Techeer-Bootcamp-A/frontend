import { useEffect, useState } from 'react'
import { authApi } from './api.ts'

export type AuthUser = { id: number; email: string; nickname: string | null }

const STORAGE_KEY_AUTH = 'techeer_auth'
const STORAGE_KEY_TOKEN = 'techeer_auth_token'
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

export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN)
}

function writeAuthUser(user: AuthUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY_AUTH)
  // state.ts 패턴과 동일하게 window 이벤트로 전 화면에 변경을 알린다.
  window.dispatchEvent(new Event(AUTH_EVENT))
}

function writeAuthToken(token: string | null) {
  if (token) localStorage.setItem(STORAGE_KEY_TOKEN, token)
  else localStorage.removeItem(STORAGE_KEY_TOKEN)
}

function clearAuth() {
  writeAuthToken(null)
  writeAuthUser(null)
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getAuthUser)

  useEffect(() => {
    const handle = () => setUser(getAuthUser())
    window.addEventListener(AUTH_EVENT, handle)
    return () => window.removeEventListener(AUTH_EVENT, handle)
  }, [])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) return

    let cancelled = false
    authApi.me(token)
      .then((freshUser) => {
        if (!cancelled) writeAuthUser(freshUser)
      })
      .catch(() => {
        if (!cancelled) clearAuth()
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string) => {
    const token = await authApi.login({ email, password })
    writeAuthToken(token.access_token)
    const u = await authApi.me(token.access_token)
    writeAuthUser(u)
    return u
  }

  const signup = async (email: string, password: string, nickname: string) => {
    await authApi.signup({ email, password, nickname })
    return login(email, password)
  }

  const updateProfile = (patch: Partial<AuthUser>) => {
    const cur = getAuthUser()
    if (!cur) return
    writeAuthUser({ ...cur, ...patch })
  }

  const logout = async () => {
    const token = getAuthToken()
    if (!token) {
      clearAuth()
      return
    }

    try {
      await authApi.logout(token)
    } finally {
      clearAuth()
    }
  }

  return { user, isAuthed: !!user, login, signup, updateProfile, logout }
}
