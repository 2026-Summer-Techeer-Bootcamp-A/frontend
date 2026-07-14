export type JobPool = '국내' | '국외'
export type JobSort = 'match' | 'latest' | 'deadline'

export const DEADLINE_OPTIONS = [3, 7, 14, 30] as const
export type DeadlineDays = (typeof DEADLINE_OPTIONS)[number]

export function parseDeadlineDays(params: URLSearchParams): DeadlineDays | undefined {
  const value = Number(params.get('deadline_days'))
  if (DEADLINE_OPTIONS.includes(value as DeadlineDays)) return value as DeadlineDays
  return params.get('deadline') === '1' ? 7 : undefined
}

export function normalizeJobSort(sort: JobSort, hasResume: boolean, pool: JobPool): JobSort {
  if (sort === 'match' && !hasResume) return 'latest'
  if (sort === 'deadline' && pool === '국외') return 'latest'
  return sort
}

export function mergeSkillOptions(selected: string[], fetched: string[]): string[] {
  return [...new Set([...selected, ...fetched])].sort((a, b) => a.localeCompare(b))
}
