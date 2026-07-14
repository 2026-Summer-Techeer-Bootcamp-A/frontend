import { useEffect, useState } from 'react'

// 앱 설정(목업). 지금은 localStorage가 정본. 백엔드 연결 시 settingsApi로 동기화.
export type NotificationSettings = {
  deadline: boolean // 마감 임박 알림
  newJobs: boolean // 새 맞춤 공고
  trend: boolean // 트렌드 · 시장 리포트
  marketing: boolean // 마케팅 · 이벤트
}
export type Settings = {
  notifications: NotificationSettings
  richOnly: boolean // 설명이 충분히 상세한 공고만 목록에 노출
}

const STORAGE_KEY_SETTINGS = 'techeer_settings'
const SETTINGS_EVENT = 'settings-change'

const DEFAULTS: Settings = {
  notifications: { deadline: true, newJobs: true, trend: false, marketing: false },
  richOnly: false,
}

export function getSettings(): Settings {
  const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
  if (!raw) return DEFAULTS
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      ...DEFAULTS,
      ...parsed,
      notifications: { ...DEFAULTS.notifications, ...parsed.notifications },
    }
  } catch {
    return DEFAULTS
  }
}

function writeSettings(s: Settings) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s))
  window.dispatchEvent(new Event(SETTINGS_EVENT))
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(getSettings)

  useEffect(() => {
    const handle = () => setSettings(getSettings())
    window.addEventListener(SETTINGS_EVENT, handle)
    return () => window.removeEventListener(SETTINGS_EVENT, handle)
  }, [])

  const setNotification = (key: keyof NotificationSettings, value: boolean) => {
    const cur = getSettings()
    writeSettings({ ...cur, notifications: { ...cur.notifications, [key]: value } })
  }

  const setRichOnly = (value: boolean) => {
    const cur = getSettings()
    writeSettings({ ...cur, richOnly: value })
  }

  return { settings, setNotification, setRichOnly }
}
