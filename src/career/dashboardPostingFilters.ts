export type DashboardPostingTab = 'latest' | 'matched' | 'deadline' | 'bookmarks'

export function dashboardRichOnly(
  activeTab: DashboardPostingTab,
  enabled: boolean,
): true | undefined {
  return enabled && activeTab !== 'bookmarks' ? true : undefined
}
