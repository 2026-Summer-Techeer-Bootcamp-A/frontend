import type { ApiPool, ResumeDetailDto, ResumeListItemDto } from '../career/api'

export interface AssistantResumeInput {
  resumeId: number
  skills: string[]
  certs: string[]
  position: string
  pool: ApiPool
  memo: string | null
}

interface ResumeReader {
  list: () => Promise<{ items: ResumeListItemDto[] }>
  detail: (resumeId: number) => Promise<ResumeDetailDto>
}

export interface InitialAssistantResume {
  items: ResumeListItemDto[]
  input: AssistantResumeInput | null
}

export function mapSavedPosition(raw: string | null): string {
  const position = (raw ?? '').toLowerCase()
  if (['backend', 'frontend', 'fullstack', 'devops', 'data'].includes(position)) return position
  if (position.includes('프론트')) return 'frontend'
  if (position.includes('풀스택')) return 'fullstack'
  if (position.includes('devops') || position.includes('인프라')) return 'devops'
  if (position.includes('데이터') || position.includes('머신러닝') || position.includes('ai')) return 'data'
  return 'backend'
}

export function selectInitialResume(items: ResumeListItemDto[]): ResumeListItemDto | null {
  return items.find((item) => item.is_primary) ?? items[0] ?? null
}

export function toAssistantResumeInput(detail: ResumeDetailDto): AssistantResumeInput {
  return {
    resumeId: detail.resume_id,
    skills: detail.skills.map((skill) => skill.canonical),
    certs: detail.certs.map((cert) => cert.name),
    position: mapSavedPosition(detail.position),
    pool: detail.pool,
    memo: detail.memo,
  }
}

export async function loadInitialAssistantResume(reader: ResumeReader): Promise<InitialAssistantResume> {
  const { items } = await reader.list()
  const initialResume = selectInitialResume(items)
  if (!initialResume) return { items, input: null }

  const detail = await reader.detail(initialResume.resume_id)
  return { items, input: toAssistantResumeInput(detail) }
}
