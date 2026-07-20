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

export type RoadmapOverlay = {
  statusById: Map<string, NodeStatus>
  highlightedIds: Set<string>
  progress: { owned: number; total: number; pct: number }
  sectionProgress: Map<string, { owned: number; total: number; achieved: boolean }>
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

  return { statusById, highlightedIds, progress, sectionProgress }
}
