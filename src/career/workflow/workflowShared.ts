// 워크플로우 맵 공용 헬퍼 — flow 뷰(WorkflowMap.tsx)와 list 뷰(WorkflowList.tsx)가
// 둘 다 쓰는 순수 함수·상수만 모은다. 두 파일 다 이 파일을 가져다 쓰기만 하고, 이 파일은
// 어느 쪽도 가져오지 않는다(순환 import 방지). 그래프 좌표·React Flow 노드 컴포넌트처럼
// flow 뷰에만 쓰이는 것은 여기 두지 않고 WorkflowMap.tsx에 남긴다.
import type { PostingDetail } from '../api'
import catData from '../../data/pearl/n.json'

// 기술 스택 카테고리 분류 — placeholders.tsx(검색 페이지 필터)와 동일하게 pearl/n.json
// (기술 코-네트워크 그래프 데이터)의 {tech, category} 노드를 재사용한다. 실제 category
// 값은 language/backend/frontend/mobile/data_db/cloud_services/devops/ai_llm 8종이며,
// 워크플로우 맵에서는 이걸 언어 · 프레임워크 · 기타 3버킷으로 더 단순화한다.
type CatGraphEdge = { a: string; b: string; strength: number }
const CAT_GRAPH = (catData as {
  data: { nodes: { tech: string; category: string }[]; edges: CatGraphEdge[] }
}).data
const TECH_CATEGORY_NODES = CAT_GRAPH.nodes
export const CAT_EDGES = CAT_GRAPH.edges
const TECH_CATEGORY: Record<string, string> = Object.fromEntries(TECH_CATEGORY_NODES.map((n) => [n.tech, n.category]))

export type SkillGroupName = '언어' | '프레임워크' | '기타'
export const SKILL_GROUPS: SkillGroupName[] = ['언어', '프레임워크', '기타']

// E: pearl/n.json엔 55개 노드만 있어서, 실무에서 흔하지만 그 사전에 없는 스킬(FastAPI,
// Flask, Tailwind 등)이 전부 '기타'로 폴백되는 문제가 있었다. 보정 테이블로 최소한만
// 채운다. pearl에 이미 있는 스킬(Elasticsearch 등)은 중복으로 넣지 않는다.
const SUPPLEMENT_CATEGORY: Record<string, string> = {
  FastAPI: 'backend',
  Flask: 'backend',
  NestJS: 'backend',
  Laravel: 'backend',
  Svelte: 'frontend',
  Tailwind: 'frontend',
  jQuery: 'frontend',
  Flutter: 'mobile',
  Swift: 'language',
  Go: 'language',
  Rust: 'language',
  ClickHouse: 'data_db',
  MariaDB: 'data_db',
  Oracle: 'data_db',
}

function groupForCategory(cat: string | undefined): SkillGroupName {
  if (cat === 'language') return '언어'
  if (cat === 'backend' || cat === 'frontend' || cat === 'mobile') return '프레임워크'
  return '기타'
}

// 우선순위: (1) 백엔드가 이미 내려준 category(이력서 스킬의 ParsedSkillDto.category,
// 라이브 로드맵 스텝의 ScopedRoadmapStep.category) — 있고 'unknown'이 아니면 최우선으로
// 신뢰한다. (2) pearl/n.json 사전. (3) 위 보정 테이블. (4) 그래도 없으면 '기타'.
export function classifySkill(name: string, backendCategory?: string): SkillGroupName {
  if (backendCategory && backendCategory !== 'unknown') return groupForCategory(backendCategory)
  const cat = TECH_CATEGORY[name] ?? SUPPLEMENT_CATEGORY[name]
  return groupForCategory(cat)
}

// 관계(연관·순서) 큐레이션 — "네트워크 그래프처럼 순서를 보여달라"는 피드백에 대응해
// 같은 카테고리 안의 밋밋한 그룹핑 엣지 말고, 실제 기술 간 방향 있는 관계(아는 언어 ->
// 그 언어로 배우면 좋은 프레임워크)를 소수만 큐레이션한다. Java -> Spring은 자연스럽지만
// Spring -> Java는 안 그린다.
export type SkillRelation = { from: string; to: string }
export const CURATED_RELATIONS: SkillRelation[] = [
  { from: 'Java', to: 'Spring' },
  { from: 'Kotlin', to: 'Spring' },
  { from: 'Kotlin', to: 'Android' },
  { from: 'Python', to: 'Django' },
  { from: 'JavaScript', to: 'Node.js' },
  { from: 'JavaScript', to: 'Express' },
  { from: 'JavaScript', to: 'React' },
  { from: 'JavaScript', to: 'Vue' },
  { from: 'JavaScript', to: 'React Native' },
  { from: 'TypeScript', to: 'Next.js' },
  { from: 'TypeScript', to: 'Angular' },
  { from: 'TypeScript', to: 'React' },
  { from: 'TypeScript', to: 'React Native' },
  { from: 'C#', to: '.NET' },
  { from: 'Ruby', to: 'Rails' },
]

const STEPPING_STAT_MIN_STRENGTH = 0.3
const STEPPING_STONE_MAX = 2

// C: 발판(stepping stone) 칩 — 목표 스킬마다 "내가 가진 무엇과 이어지는지"를 계산한다.
// 1순위는 큐레이션된 방향 있는 관계(from이 보유 스킬), 2순위는 pearl 통계
// co-occurrence(strength>=0.3, 내림차순)다. 합쳐서 큐레이션 우선 + 중복 제거로 최대
// STEPPING_STONE_MAX개만 반환한다 — buildRelationEdges와 달리 카테고리 필터는 두지
// 않는다(이건 화살표가 아니라 텍스트 칩이라 클러스터 단위로 묶을 필요가 없다).
export function getSteppingStones(targetSkill: string, ownedSet: Set<string>): string[] {
  const curated = CURATED_RELATIONS
    .filter((r) => r.to === targetSkill && ownedSet.has(r.from))
    .map((r) => r.from)

  const statCandidates = CAT_EDGES
    .filter((e) => e.strength >= STEPPING_STAT_MIN_STRENGTH && (e.a === targetSkill || e.b === targetSkill))
    .map((e) => ({ other: e.a === targetSkill ? e.b : e.a, strength: e.strength }))
    .filter((c) => ownedSet.has(c.other))
    .sort((a, b) => b.strength - a.strength)
    .map((c) => c.other)

  const seen = new Set<string>()
  const chosen: string[] = []
  for (const s of [...curated, ...statCandidates]) {
    if (seen.has(s)) continue
    seen.add(s)
    chosen.push(s)
    if (chosen.length >= STEPPING_STONE_MAX) break
  }
  return chosen
}

// 발판 칩 표기 — "← Python · PostgreSQL 기반" 형태. max로 리스트/플로우 뷰가 각자
// 보여줄 개수(리스트 2개, 플로우 사다리 행 1개)를 다르게 자를 수 있다. 발판이 없으면
// null(호출부는 렌더링하지 않는다).
export function steppingStoneLabel(stones: string[], max: number): string | null {
  if (stones.length === 0) return null
  return `← ${stones.slice(0, max).join(' · ')} 기반`
}

// 목표 후보 아바타 색 — 회사명 해시로 고정 배정해 리렌더돼도 색이 흔들리지 않게 한다.
const AVATAR_PALETTE = ['#18181b', '#1f9d57', '#3b82f6', '#b45309', '#8b5cf6', '#0891b2']
export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

export function matchPctFor(skills: string[], matchedCount: number | null | undefined, ownedSet: Set<string>): number {
  if (!skills.length) return 0
  const heldCount = skills.filter((s) => ownedSet.has(s)).length
  return Math.round(((matchedCount ?? heldCount) / skills.length) * 100)
}

export function yearBadgeFor(postDate: string | null): string | null {
  if (!postDate) return null
  const postYear = new Date(postDate).getFullYear()
  const currentYear = new Date().getFullYear()
  if (postYear === currentYear) return '올해'
  if (postYear === currentYear - 1) return '작년'
  return `${postYear}년`
}

// A: 이 스킬을 요구하는 "선택된" 공고들의 회사명 목록 — 랭크 행/리스트 행 끝 아바타
// 귀속용. 같은 회사에서 온 여러 선택 공고가 있어도 아바타는 회사당 1개만(중복 제거).
export function requiredByFor(canonical: string, selectedPostings: PostingDetail[]): { company: string }[] {
  const seen = new Set<string>()
  const result: { company: string }[] = []
  selectedPostings.forEach((p) => {
    if (!p.skills.includes(canonical)) return
    const company = p.company ?? '회사명 미상'
    if (seen.has(company)) return
    seen.add(company)
    result.push({ company })
  })
  return result
}

// D: 이질성 배너 — 선택된 공고들의 요구 스킬 집합이 서로 얼마나 겹치는지를 Jaccard
// 유사도로 잰다. 쌍별 최솟값이 낮으면(분야가 서로 다르면) flow 뷰 상단에 안내 배너를
// 띄우는 판단 근거로 쓴다.
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  a.forEach((x) => { if (b.has(x)) intersection += 1 })
  const union = a.size + b.size - intersection
  return union === 0 ? 1 : intersection / union
}

export function minPairwiseJaccard(sets: Set<string>[]): number {
  if (sets.length < 2) return 1
  let min = 1
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const score = jaccard(sets[i], sets[j])
      if (score < min) min = score
    }
  }
  return min
}

// F: 4타입 확장 — 개념(concept)·연차 게이트(career). 백엔드가 공고 상세에 concepts를
// 아직 안 내려줄 수 있어 PostingDetail 자체(api.ts, 다른 에이전트가 손대는 중)는 건드리지
// 않고, 여기서 옵셔널 확장 타입만 얹는다. concepts가 undefined면 그 타입 노드는 그냥 렌더
// 안 한다(그레이스풀 디그레이드) — 크래시 없음.
export type ConceptRef = { name: string; category?: string }
export type PostingDetailWithConcepts = PostingDetail & { concepts?: ConceptRef[] }

// 연차 게이트 라벨 — JobSheet.tsx/CareerDashboard.tsx의 careerText/careerLabel과 같은
// 표기(신입·무관 / 경력 N년+)를 재사용한다(새 문구 체계를 만들지 않는다).
export function careerGateLabel(goalMin: number | null): string {
  if (!goalMin || goalMin <= 0) return '경력 무관'
  return `경력 ${goalMin}년+`
}

// 충족 판정 — CareerDashboard.tsx의 기존 규칙(공고의 최소 경력이 내 이력서 경력 상한을
// 넘지 않아야 지원 가능)을 그대로 재사용한다. 목표 경력이 없으면(신입·무관) 항상 충족.
export function isCareerGateFulfilled(goalMin: number | null, resumeCareerMax: number | null): boolean {
  if (!goalMin || goalMin <= 0) return true
  return resumeCareerMax != null && goalMin <= resumeCareerMax
}
