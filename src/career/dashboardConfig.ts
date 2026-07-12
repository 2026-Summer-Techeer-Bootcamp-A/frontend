import { useEffect, useState } from 'react'

// 위젯 표시/숨김 설정(로컬 저장). settingsStore.ts와 동일한 패턴 —
// localStorage가 정본, 변경 시 CustomEvent로 브로드캐스트. 드래그 재배치·variant는 범위 밖.
export type WidgetSection = 'dashboard' | 'market'
export type WidgetSize = '1x1' | '2x1' | '2x2'
export type DashboardConfig = {
  hidden: Record<WidgetSection, string[]>
  size: Record<WidgetSection, Record<string, WidgetSize>>
}

const STORAGE_KEY_DASHBOARD_CONFIG = 'techeer_dashboard_config'
const CONFIG_EVENT = 'dashboard-config-change'

const DEFAULTS: DashboardConfig = {
  hidden: { dashboard: [], market: [] },
  size: { dashboard: {}, market: {} },
}

export function getDashboardConfig(): DashboardConfig {
  const raw = localStorage.getItem(STORAGE_KEY_DASHBOARD_CONFIG)
  if (!raw) return DEFAULTS
  try {
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>
    return {
      ...DEFAULTS,
      ...parsed,
      hidden: { ...DEFAULTS.hidden, ...parsed.hidden },
      size: {
        ...DEFAULTS.size,
        ...parsed.size,
        dashboard: { ...DEFAULTS.size.dashboard, ...parsed.size?.dashboard },
        market: { ...DEFAULTS.size.market, ...parsed.size?.market },
      },
    }
  } catch {
    return DEFAULTS
  }
}

function writeDashboardConfig(c: DashboardConfig) {
  localStorage.setItem(STORAGE_KEY_DASHBOARD_CONFIG, JSON.stringify(c))
  window.dispatchEvent(new Event(CONFIG_EVENT))
}

export function isWidgetHidden(section: WidgetSection, widgetId: string): boolean {
  return getDashboardConfig().hidden[section].includes(widgetId)
}

export function toggleWidget(section: WidgetSection, widgetId: string): void {
  const cur = getDashboardConfig()
  const list = cur.hidden[section]
  const next = list.includes(widgetId) ? list.filter((id) => id !== widgetId) : [...list, widgetId]
  writeDashboardConfig({ ...cur, hidden: { ...cur.hidden, [section]: next } })
}

export function getWidgetSize(section: WidgetSection, widgetId: string, fallback: WidgetSize): WidgetSize {
  return getDashboardConfig().size[section][widgetId] ?? fallback
}

export function setWidgetSize(section: WidgetSection, widgetId: string, size: WidgetSize): void {
  const cur = getDashboardConfig()
  writeDashboardConfig({ ...cur, size: { ...cur.size, [section]: { ...cur.size[section], [widgetId]: size } } })
}

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(getDashboardConfig)

  useEffect(() => {
    const handle = () => setConfig(getDashboardConfig())
    window.addEventListener(CONFIG_EVENT, handle)
    return () => window.removeEventListener(CONFIG_EVENT, handle)
  }, [])

  return config
}
