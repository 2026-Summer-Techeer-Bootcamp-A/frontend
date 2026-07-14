import type { DemandBarDatum } from './DemandBars'

// 로그인/저장 이력서가 없어 실데이터를 못 채울 때 "예시 보기"로 보여줄 하드코딩 샘플.
// 백엔드 지원자를 가정한다 — 실 API 응답과 같은 모양(shape)으로 맞춰 CoverageRing/DemandBars/GapList에
// 그대로 흘려보낼 수 있게 한다.

export const SAMPLE_POSITION_LABEL = '백엔드'

export const SAMPLE_OWNED_SKILLS = ['Python', 'Django', 'PostgreSQL', 'Docker', 'Git', 'AWS']

export const SAMPLE_DEMAND: DemandBarDatum[] = [
  { canonical: 'Python', share: 0.71, owned: true },
  { canonical: 'AWS', share: 0.58, owned: true },
  { canonical: 'Docker', share: 0.52, owned: true },
  { canonical: 'Kubernetes', share: 0.41, owned: false },
  { canonical: 'PostgreSQL', share: 0.39, owned: true },
  { canonical: 'Redis', share: 0.33, owned: false },
  { canonical: 'Kafka', share: 0.27, owned: false },
  { canonical: 'GraphQL', share: 0.21, owned: false },
]

export const SAMPLE_GAPS: DemandBarDatum[] = SAMPLE_DEMAND.filter((d) => !d.owned)

export const SAMPLE_COVERAGE = {
  score: 62,
  ownedCount: SAMPLE_DEMAND.filter((d) => d.owned).length,
  totalCount: SAMPLE_DEMAND.length,
  live: false,
}
