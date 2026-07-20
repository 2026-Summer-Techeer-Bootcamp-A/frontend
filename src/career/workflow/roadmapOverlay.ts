// 로드맵 오버레이 계산 — 사람이 큐레이션한 백본(RoadmapTrack)은 항상 그대로 그려지고,
// 이 모듈은 그 위에 얹을 상태만 순수 함수로 계산한다. LLM 호출이 전혀 없다(Phase 1
// 요구사항: "LLM 없음"). React나 DOM에 의존하지 않아 노드 테스트로 검증 가능하다.
//
// 게스트/프리뷰(로그인 없음, 이력서 없음)에서도 백본이 "꽉 차게" 보여야 한다는 요구가
// 있어 — 이력서 스킬이 비어 있으면 careerData.json의 목 이력서(resume.skills)를
// 보유 스킬로 대신 쓴다. 실제 로그인 사용자가 스킬을 0개로 등록한 경우와 게스트를
// 완전히 구분할 방법은 없지만(둘 다 활성 이력서가 없거나 스킬이 빈 배열), 이 앱의
// 다른 위젯(WorkflowMap.tsx의 wfm-empty 등)도 같은 "스킬 0개 = 아직 안 채운 상태"
// 전제를 쓰고 있어 일관된 판단이다.
import careerData from '../../data/careerData.json' with { type: 'json' }
import type { RoadmapNode, RoadmapTrack } from '../../data/roadmaps/types'

const GUEST_MOCK_SKILLS: string[] = (careerData as { resume?: { skills?: string[] } }).resume?.skills ?? []

// 이력서 스킬이 비어 있으면(게스트 또는 아직 스킬을 안 채운 계정) 목 데이터로
// 폴백한다 — 이 함수 하나만 거치면 호출부는 게스트인지 여부를 신경 쓸 필요가 없다.
export function effectiveOwnedSkills(ownedSkills: string[]): string[] {
  return ownedSkills.length > 0 ? ownedSkills : GUEST_MOCK_SKILLS
}

export type NodeStatus = 'owned' | 'unlockable' | 'locked'

// 난이도 티어 — prereqDepth를 4단계로 버킷한다. LLM 없이 결정적으로 계산되고,
// 백본 데이터의 prereqs만 보고 정해지므로 로그인/보유 스킬 여부와 무관하게 항상
// 같은 값이 나온다(오버레이의 status와 달리 "그 사람이 뭘 아는지"가 아니라
// "그 개념이 얼마나 깊이 쌓여야 나오는지"를 잰다).
export type DifficultyTier = 'intro' | 'basic' | 'intermediate' | 'advanced'
export const TIER_ORDER: DifficultyTier[] = ['intro', 'basic', 'intermediate', 'advanced']
export const TIER_LABEL: Record<DifficultyTier, string> = {
  intro: '입문',
  basic: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export function difficultyTierFromDepth(depth: number): DifficultyTier {
  if (depth <= 0) return 'intro'
  if (depth === 1) return 'basic'
  if (depth === 2) return 'intermediate'
  return 'advanced'
}

// prereqDepth(node) — 선행이 없으면 0, 있으면 1 + max(prereq들의 prereqDepth). 백본
// 데이터 규칙(prereq는 같거나 더 앞선 섹션만 가리킨다)상 순환이 없다고 보장되지만,
// 데이터 오류로 순환이 생기는 방어적인 경우를 위해 buildStatus의 cleared()와 같은
// visiting 가드를 둔다(순환이면 그 지점의 depth를 0으로 끊어 무한 재귀를 막는다).
export function computeNodeDepths(nodes: RoadmapNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const cache = new Map<string, number>()
  const visiting = new Set<string>()

  function depth(id: string): number {
    const cached = cache.get(id)
    if (cached !== undefined) return cached
    if (visiting.has(id)) return 0
    const node = byId.get(id)
    if (!node || node.prereqs.length === 0) {
      cache.set(id, 0)
      return 0
    }
    visiting.add(id)
    const d = 1 + Math.max(...node.prereqs.map(depth))
    visiting.delete(id)
    cache.set(id, d)
    return d
  }

  nodes.forEach((n) => depth(n.id))
  return cache
}

export type NodeDifficulty = {
  depth: number
  tier: DifficultyTier
  prereqCount: number
  // 아래 세 필드는 백엔드 객관 보정(POST /match/roadmap/difficulty) 응답이 도착했을
  // 때만 mergeBackendDifficulty가 덧붙인다. 기존 computeNodeDifficulty는 이 필드를
  // 절대 채우지 않는다(roadmapOverlay.test.ts가 { depth, tier, prereqCount } 세
  // 필드만 있는 정확한 shape을 deepEqual로 검증하므로, 이 함수 자체는 손대지 않는다).
  objective?: boolean
  avgCareer?: number | null
  demand?: number
  basis?: string
}

export function computeNodeDifficulty(nodes: RoadmapNode[]): Map<string, NodeDifficulty> {
  const depths = computeNodeDepths(nodes)
  const result = new Map<string, NodeDifficulty>()
  nodes.forEach((n) => {
    const depth = depths.get(n.id) ?? 0
    result.set(n.id, { depth, tier: difficultyTierFromDepth(depth), prereqCount: n.prereqs.length })
  })
  return result
}

// 백엔드 티어 라벨(한글) -> 내부 DifficultyTier 키. 모르는 라벨이 오면(백엔드 스펙
// 변경 등 방어적 상황) 입문으로 떨어뜨려 화면이 깨지지 않게 한다.
const BACKEND_TIER_LABEL_TO_KEY: Record<string, DifficultyTier> = {
  입문: 'intro',
  초급: 'basic',
  중급: 'intermediate',
  고급: 'advanced',
}

export function difficultyTierFromBackendLabel(label: string): DifficultyTier {
  return BACKEND_TIER_LABEL_TO_KEY[label] ?? 'intro'
}

export type RoadmapDifficultyBackendItem = {
  node_id: string
  tier: string
  avg_career: number | null
  demand: number
  basis: string
}

// 선행 깊이 기반 폴백 맵(base) 위에 백엔드 객관 보정 응답(items)을 노드 단위로
// 덧씌운다. 응답에 없는 노드(부분 실패, 신규 노드 등)는 base의 깊이 기반 티어를
// 그대로 유지한다 — 이 함수 자체도 순수 함수라 fetch나 상태를 모른다(호출부인
// RoadmapView.tsx가 요청/폴백/로딩을 책임진다).
export function mergeBackendDifficulty(
  base: Map<string, NodeDifficulty>,
  items: RoadmapDifficultyBackendItem[],
): Map<string, NodeDifficulty> {
  const merged = new Map(base)
  items.forEach((item) => {
    const prior = merged.get(item.node_id)
    if (!prior) return
    merged.set(item.node_id, {
      ...prior,
      tier: difficultyTierFromBackendLabel(item.tier),
      objective: true,
      avgCareer: item.avg_career,
      demand: item.demand,
      basis: item.basis,
    })
  })
  return merged
}

// 마일스톤/도전과제 노드 — 섹션의 첫 노드(그 섹션에 들어서는 대표 관문)이거나 개념
// 타입(핵심 개념) 노드. 이 두 부류만 "보유"했을 때 일반 초록 체크 대신 금색
// 메달리온(별)로 표시해 게임의 업적 배지 같은 특별함을 준다 — 나머지 보유 노드는
// 여전히 평범한 초록 owned로 남는다.
export function buildMilestoneEligibleIds(nodes: RoadmapNode[]): Set<string> {
  const firstBySectionOrder = new Map<string, RoadmapNode>()
  nodes.forEach((n) => {
    const current = firstBySectionOrder.get(n.section)
    if (!current || n.order < current.order) firstBySectionOrder.set(n.section, n)
  })
  const ids = new Set<string>()
  firstBySectionOrder.forEach((n) => ids.add(n.id))
  nodes.forEach((n) => { if (n.type === 'concept') ids.add(n.id) })
  return ids
}

export type RoadmapOverlay = {
  statusById: Map<string, NodeStatus>
  highlightedIds: Set<string>
  progress: { owned: number; total: number; pct: number }
  sectionProgress: Map<string, { owned: number; total: number; achieved: boolean }>
  difficultyById: Map<string, NodeDifficulty>
  milestoneEligibleIds: Set<string>
}

// cleared(node) — 그 노드의 prereqs가 전부 "충족"됐는지. skill/cert 타입 prereq는
// 실제 보유(ownedSet/ownedCertSet)로 충족되고, concept 타입 prereq는 개념 자체를
// "보유"할 방법이 없으므로(이력서에 개념 필드가 없다) 그 개념 자신의 prereqs가 전부
// 충족됐으면 그것으로 충족된 것으로 본다(그렇지 않으면 concept를 prereq로 둔 모든
// 하위 노드가 영원히 잠긴다). 재귀이지만 backend.json의 prereq 규칙(자기 자신과 같은
// 섹션이거나 더 앞선 섹션만 가리킨다)이 순환을 막으므로 무한 재귀 걱정은 없다 —
// 그래도 데이터 오류로 순환이 생기는 방어적인 경우를 위해 visiting 가드를 둔다.
function buildStatus(
  nodes: RoadmapNode[],
  ownedSkillSet: ReadonlySet<string>,
  ownedCertSet: ReadonlySet<string>,
): Map<string, NodeStatus> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const clearedCache = new Map<string, boolean>()
  const visiting = new Set<string>()

  function isOwned(node: RoadmapNode): boolean {
    if (node.type === 'skill') return ownedSkillSet.has(node.label)
    if (node.type === 'cert') return ownedCertSet.has(node.label)
    return false // concept는 이력서 보유 개념이 없다.
  }

  function isMet(id: string): boolean {
    const node = byId.get(id)
    if (!node) return true // 참조 무결성이 깨진 방어적 경우 — 없는 prereq는 막지 않는다.
    if (node.type === 'concept') return cleared(id)
    return isOwned(node)
  }

  function cleared(id: string): boolean {
    const cached = clearedCache.get(id)
    if (cached !== undefined) return cached
    if (visiting.has(id)) return false // 순환 방어 — 진행 중인 노드는 미충족으로 취급.
    const node = byId.get(id)
    if (!node || node.prereqs.length === 0) {
      clearedCache.set(id, true)
      return true
    }
    visiting.add(id)
    const result = node.prereqs.every(isMet)
    visiting.delete(id)
    clearedCache.set(id, result)
    return result
  }

  const statusById = new Map<string, NodeStatus>()
  nodes.forEach((node) => {
    if (node.type === 'concept') {
      statusById.set(node.id, cleared(node.id) ? 'owned' : 'locked')
      return
    }
    if (isOwned(node)) {
      statusById.set(node.id, 'owned')
    } else if (cleared(node.id)) {
      statusById.set(node.id, 'unlockable')
    } else {
      statusById.set(node.id, 'locked')
    }
  })
  return statusById
}

function buildHighlighted(nodes: RoadmapNode[], targetSkills: string[], targetConcepts: string[]): Set<string> {
  const targetSkillSet = new Set(targetSkills)
  const targetConceptSet = new Set(targetConcepts)
  const set = new Set<string>()
  nodes.forEach((node) => {
    if (node.type === 'skill' && targetSkillSet.has(node.label)) set.add(node.id)
    if (node.type === 'concept' && targetConceptSet.has(node.label)) set.add(node.id)
  })
  return set
}

export function buildRoadmapOverlay(
  track: RoadmapTrack,
  ownedSkills: string[],
  ownedCerts: string[],
  targetSkills: string[] = [],
  targetConcepts: string[] = [],
): RoadmapOverlay {
  const ownedSkillSet = new Set(effectiveOwnedSkills(ownedSkills))
  const ownedCertSet = new Set(ownedCerts)
  const statusById = buildStatus(track.nodes, ownedSkillSet, ownedCertSet)
  const highlightedIds = buildHighlighted(track.nodes, targetSkills, targetConcepts)

  let ownedCount = 0
  track.nodes.forEach((n) => { if (statusById.get(n.id) === 'owned') ownedCount += 1 })
  const total = track.nodes.length
  const progress = { owned: ownedCount, total, pct: total > 0 ? Math.round((ownedCount / total) * 100) : 0 }

  // 섹션별 진척 + "달성" 여부 — 그 섹션의 recommended 마커 노드가 전부 owned면
  // 주 경로를 완주했다는 뜻으로 별 배지를 채운다(선택 노드는 채점 대상이 아니다).
  const sectionProgress = new Map<string, { owned: number; total: number; achieved: boolean }>()
  track.sections.forEach((s) => {
    const sectionNodes = track.nodes.filter((n) => n.section === s.id)
    const owned = sectionNodes.filter((n) => statusById.get(n.id) === 'owned').length
    const recommendedNodes = sectionNodes.filter((n) => n.marker === 'recommended')
    const achieved = recommendedNodes.length > 0 && recommendedNodes.every((n) => statusById.get(n.id) === 'owned')
    sectionProgress.set(s.id, { owned, total: sectionNodes.length, achieved })
  })

  const difficultyById = computeNodeDifficulty(track.nodes)
  const milestoneEligibleIds = buildMilestoneEligibleIds(track.nodes)

  return { statusById, highlightedIds, progress, sectionProgress, difficultyById, milestoneEligibleIds }
}
