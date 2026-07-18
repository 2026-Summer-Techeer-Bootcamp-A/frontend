import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Award, ListChecks, Maximize2, Sparkles, X } from 'lucide-react'
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SectionHeader, PreviewBadge } from '../kit'
import { AsOf } from '../charts'
import { useResumesState } from '../state'
import { getAuthToken } from '../authStore'
import { useBookmarks, loadBookmarkDetails, isBookmarked, toggleBookmark } from '../bookmarkStore'
import {
  useSelectedGoalIds, useGoalSelectionTouched, toggleGoalId,
  getSelectedGoalIds, isGoalSelectionTouched, setSelectedGoalIds,
} from '../goalSelectionStore'
import { dashboardApi, jobsApi, type Identity, type PostingCard, type PostingDetail, type ScopedRoadmapData } from '../api'
import { useWidgetData } from '../useWidgetData'
import type { WidgetSize } from '../dashboardConfig'
import dreamCompanies from '../../data/dreamCompanies.json'
import catData from '../../data/pearl/n.json'
import './workflowMap.css'

// 데모용: 클릭 한 번으로 유명 기업 공고를 북마크 + 목표 선택까지 채워 넣어 워크플로우
// 맵을 즉석에서 populate한다. 실제 검증된 기업명 목록은 dreamCompanies.json에 있다.
type DreamCompany = { name: string; tier: '대기업' | '중견' }
const DREAM_COMPANIES = dreamCompanies as DreamCompany[]
const RECOMMEND_TARGET_NEW = 8
const RECOMMEND_MAX_COMPANIES = 12
const RECOMMEND_CHUNK_SIZE = 4
// 로그인 없이 미리보기로 그리는 대체 순서(라이브 로드맵을 못 받을 때)는 예전엔 상한
// 없이 전부 모아 dagre에 먹였다가 캔버스가 터졌다. 이제는 카테고리별 클러스터 노드가
// 캡(COMPACT/MODAL_TARGET_CAP)으로 개수를 이미 제한하므로, 그룹으로 나누기 전 단계의
// 전역 상한은 따로 두지 않고 카테고리별 캡에게 전부 맡긴다.

// 기술 스택 카테고리 분류 — placeholders.tsx(검색 페이지 필터)와 동일하게 pearl/n.json
// (기술 코-네트워크 그래프 데이터)의 {tech, category} 노드를 재사용한다. 새 API·새 정적
// 데이터 없이 이미 번들에 있는 값만 읽는다. 실제 category 값은 language/backend/frontend/
// mobile/data_db/cloud_services/devops/ai_llm 8종이며, 워크플로우 맵에서는 이걸 언어 ·
// 프레임워크 · 기타 3버킷으로 더 단순화해서 보유/목표 스킬을 각각 묶는다.
type CatGraphEdge = { a: string; b: string; strength: number }
const CAT_GRAPH = (catData as {
  data: { nodes: { tech: string; category: string }[]; edges: CatGraphEdge[] }
}).data
const TECH_CATEGORY_NODES = CAT_GRAPH.nodes
const CAT_EDGES = CAT_GRAPH.edges
const TECH_CATEGORY: Record<string, string> = Object.fromEntries(TECH_CATEGORY_NODES.map((n) => [n.tech, n.category]))

type SkillGroupName = '언어' | '프레임워크' | '기타'
const SKILL_GROUPS: SkillGroupName[] = ['언어', '프레임워크', '기타']

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
function classifySkill(name: string, backendCategory?: string): SkillGroupName {
  if (backendCategory && backendCategory !== 'unknown') return groupForCategory(backendCategory)
  const cat = TECH_CATEGORY[name] ?? SUPPLEMENT_CATEGORY[name]
  return groupForCategory(cat)
}

// 관계(연관·순서) 큐레이션 — "네트워크 그래프처럼 순서를 보여달라"는 피드백에 대응해
// 같은 카테고리 안의 밋밋한 그룹핑 엣지 말고, 실제 기술 간 방향 있는 관계(아는 언어 ->
// 그 언어로 배우면 좋은 프레임워크)를 소수만 큐레이션한다. Java -> Spring은 자연스럽지만
// Spring -> Java는 안 그린다. 통계 co-occurrence(strength)는 상관관계라 방향을 안 주므로,
// 이 표에 없는 쌍만 카테고리 순서(SKILL_GROUPS 인덱스 낮은 쪽 -> 높은 쪽)로 방향을
// 강제해 보완한다(아래 buildRelationEdges).
type SkillRelation = { from: string; to: string }
const CURATED_RELATIONS: SkillRelation[] = [
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
const RELATION_STAT_MIN_STRENGTH = 0.3
const RELATION_EDGE_MAX = 4

type RelationCandidate = SkillRelation & { rank: number }

// 관계 엣지 후보 계산 — 순수 함수라 buildWorkflowGraph 밖에서 독립적으로 테스트·재사용
// 가능하다. ownedSet에 from이 있고(이미 안다) targetSet에 to가 있어야(아직 안 배웠고
// 이번에 목표로 잡힌) 후보가 된다. 같은 카테고리끼리는 스킵(카테고리 컨텍스트 엣지가
// 이미 그 역할을 한다). "언어를 알면 이 프레임워크로 이어진다"는 원래 취지를 지키기
// 위해 to가 프레임워크 카테고리가 아니면(예: Prometheus, MongoDB 같은 기타 카테고리)
// 버린다 — 통계 co-occurrence 보완 쪽에서 특히 이 필터가 중요하다. 큐레이션을 통계보다
// 우선하고, 같은 (from카테고리,to카테고리) 클러스터 쌍엔 최대 1개만, 전체는 최대
// RELATION_EDGE_MAX개로 자른다.
function buildRelationEdges(ownedSet: Set<string>, targetSet: Set<string>): SkillRelation[] {
  const curatedKeys = new Set(CURATED_RELATIONS.map((r) => `${r.from}|${r.to}`))
  const candidates: RelationCandidate[] = []

  CURATED_RELATIONS.forEach((r) => {
    if (classifySkill(r.from) === classifySkill(r.to)) return
    if (classifySkill(r.to) !== '프레임워크') return
    if (!ownedSet.has(r.from) || !targetSet.has(r.to)) return
    candidates.push({ ...r, rank: 2 })
  })

  CAT_EDGES.forEach((e) => {
    if (e.strength < RELATION_STAT_MIN_STRENGTH) return
    const groupA = classifySkill(e.a)
    const groupB = classifySkill(e.b)
    if (groupA === groupB) return
    const [from, to] = SKILL_GROUPS.indexOf(groupA) < SKILL_GROUPS.indexOf(groupB) ? [e.a, e.b] : [e.b, e.a]
    if (classifySkill(to) !== '프레임워크') return
    if (curatedKeys.has(`${from}|${to}`)) return
    if (!ownedSet.has(from) || !targetSet.has(to)) return
    candidates.push({ from, to, rank: e.strength })
  })

  candidates.sort((x, y) => y.rank - x.rank)

  const seenClusterPairs = new Set<string>()
  const chosen: SkillRelation[] = []
  for (const c of candidates) {
    const clusterKey = `${classifySkill(c.from)}->${classifySkill(c.to)}`
    if (seenClusterPairs.has(clusterKey)) continue
    seenClusterPairs.add(clusterKey)
    chosen.push({ from: c.from, to: c.to })
    if (chosen.length >= RELATION_EDGE_MAX) break
  }
  return chosen
}

// 카테고리 클러스터 노드 안에 보여줄 칩/랭크 항목 상한 — 컴팩트 카드는 캔버스가 좁으니
// 적게, 크게 보기 모달은 넓으니 많이 보여준다. 상한을 넘는 나머지는 "+N개" 칩/행으로
// 묶는다(그룹 자체를 생략하지는 않는다 — 3레인은 항상 렌더링된다).
const COMPACT_OWNED_CAP = 4
const COMPACT_TARGET_CAP = 5
const MODAL_OWNED_CAP = 10
const MODAL_TARGET_CAP = 10

function yearBadgeFor(postDate: string | null): string | null {
  if (!postDate) return null
  const postYear = new Date(postDate).getFullYear()
  const currentYear = new Date().getFullYear()
  if (postYear === currentYear) return '올해'
  if (postYear === currentYear - 1) return '작년'
  return `${postYear}년`
}

function matchPctFor(skills: string[], matchedCount: number | null | undefined, ownedSet: Set<string>): number {
  if (!skills.length) return 0
  const heldCount = skills.filter((s) => ownedSet.has(s)).length
  return Math.round(((matchedCount ?? heldCount) / skills.length) * 100)
}

// A-5: 목표 · 학습 워크플로우 맵 — 예전엔 북마크한 공고 전부(암묵적 목표)를 그대로
// 썼지만, 이제는 목표 선택 패널에서 북마크 중 "목표로 삼을 것"을 직접 골라야 한다(안 B,
// 컴팩트 카드에서는 캔버스 위에 뜨는 플로팅 패널). 선택된 공고들의 요구 기술과 이력서
// 보유 기술을 좌우로 이어 "무엇을 어떤 순서로 배우면 좋은가"를 보여준다. 읽기 전용
// (드래그 연결 불가)이며 좌표는 dagre 없이 고정 산수로 계산한다 — "스킬 1개 = 노드 1개
// + 엣지 1개"로 dagre에 먹이던 예전 방식은 카테고리별 스킬 개수 편차가 그대로 캔버스
// 크기 편차가 되는 문제가 있었다. 그래서 노드 단위를 스킬에서 "카테고리 클러스터"로
// 올렸다 — 보유 스킬은 카테고리(언어/프레임워크/기타)당 칩 묶음 노드 하나
// (OwnedClusterNode)로, 목표/경유 스킬은 카테고리당 우선순위 사다리 노드 하나
// (TargetLadderNode)로 그린다. 우선순위(라이브 로드맵이면 payoff/delta 내림차순, 대체
// 순서면 공고 요구 빈도 내림차순)는 가로 위치가 아니라 사다리 노드 안의 랭크 번호로만
// 표현하고, 스킬-스킬 체인 엣지("함께 요구됨")는 완전히 없앴다. 카테고리 사이엔 선후
// 관계가 없으므로 엣지는 카테고리당 최대 1개(owned-group-X -> target-group-X)만 그리고,
// 라벨 없이 옅은 색 + 흐름 애니메이션으로만 "함께 필요하다"는 느낌을 준다.

type SkillClass = 'owned' | 'target' | 'bridge'
// A: requiredBy는 이 스킬을 요구하는 "선택된" 공고들의 회사 목록(랭크 행 끝 아바타
// 귀속용, 최대 2개 + "+n"). count는 폴백 모드(라이브 로드맵 없음)에서만 채워지는
// 공고 요구 개수 — B: 같은 카테고리 안 모든 항목의 count가 동률이면 랭크 번호를
// 숨기는 판정(hideRank)에 쓴다.
type TargetLadderItem = {
  canonical: string; cls: SkillClass; badge: string; category?: string
  requiredBy: { company: string }[]; count?: number
}

type OwnedClusterData = {
  group: SkillGroupName
  chips: string[]
  overflow: number
  [key: string]: unknown
}
type TargetLadderData = {
  group: SkillGroupName
  items: TargetLadderItem[]
  overflow: number
  // B: 가짜 순서 제거 — 폴백 모드에서 이 카테고리 전 항목의 count가 동률이면 true.
  // true면 랭크 번호(①②…)를 렌더링하지 않는다(리스트 자체는 그대로 둔다).
  hideRank: boolean
  [key: string]: unknown
}
type OwnedClusterFlowNode = Node<OwnedClusterData, 'ownedCluster'>
type TargetLadderFlowNode = Node<TargetLadderData, 'targetLadder'>
// A: 밴드 헤더 라벨 전용 노드 — handle 없음, 클릭/드래그 불가. 좌표는 기존 클러스터/
// 사다리 노드를 전혀 옮기지 않고 그 위 음수 y에 얹는다.
type BandLabelData = { text: string; [key: string]: unknown }
type BandLabelFlowNode = Node<BandLabelData, 'bandLabel'>
type WorkflowFlowNode = OwnedClusterFlowNode | TargetLadderFlowNode | BandLabelFlowNode

const GROUP_INITIAL: Record<SkillGroupName, string> = { 언어: '언', 프레임워크: '프', 기타: '기' }

// 보유 스킬 클러스터 — 카테고리 하나의 보유 스킬을 칩으로 wrap해서 보여준다. 레인은
// 항상 3개 고정으로 렌더링되므로, 그 카테고리에 보유 스킬이 0개여도 노드 자체는 그리고
// 빈 상태 문구만 보여준다(그룹을 통째로 스킵하지 않는다 — 3행이 항상 정렬되게).
function OwnedClusterNode({ data }: NodeProps<OwnedClusterFlowNode>) {
  return (
    <div className="wfm-cluster-node wfm-cluster-node--owned">
      <div className="wfm-cluster-node__header">
        <span className="wfm-cluster-node__icon wfm-cluster-node__icon--owned">{GROUP_INITIAL[data.group]}</span>
        <span className="wfm-cluster-node__title">{data.group}</span>
      </div>
      {data.chips.length === 0 ? (
        <div className="wfm-cluster-node__empty">보유 스킬 없음</div>
      ) : (
        <div className="wfm-cluster-node__chips">
          {data.chips.map((skill) => (
            <span key={skill} className="wfm-cluster-node__chip" title={skill}>{skill}</span>
          ))}
          {data.overflow > 0 && (
            <span className="wfm-cluster-node__chip wfm-cluster-node__chip--more">+{data.overflow}개</span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} id="ctx" style={{ top: '35%' }} className="wfm-node__handle" />
      <Handle type="source" position={Position.Right} id="rel" style={{ top: '65%' }} className="wfm-node__handle" />
    </div>
  )
}

// 목표/경유 스킬 사다리 — 같은 카테고리의 목표 스킬을 우선순위 내림차순으로 랭크 번호를
// 붙여 세로 리스트로 보여준다. 목표가 0개인 카테고리도 노드 자체는 그리고 빈 상태
// 문구만 보여준다.
function TargetLadderNode({ data }: NodeProps<TargetLadderFlowNode>) {
  return (
    <div className="wfm-ladder-node">
      <Handle type="target" position={Position.Left} id="ctx" style={{ top: '35%' }} className="wfm-node__handle" />
      <Handle type="target" position={Position.Left} id="rel" style={{ top: '65%' }} className="wfm-node__handle" />
      <div className="wfm-ladder-node__header">
        <span className="wfm-ladder-node__icon">{GROUP_INITIAL[data.group]}</span>
        <span className="wfm-ladder-node__title">{data.group}</span>
      </div>
      {data.items.length === 0 ? (
        <div className="wfm-ladder-node__empty">이 카테고리엔 선택한 목표가 없어요</div>
      ) : (
        <ol className="wfm-ladder-node__list">
          {data.items.map((item, i) => (
            <li key={item.canonical} className={`wfm-ladder-node__item wfm-ladder-node__item--${item.cls}`}>
              {!data.hideRank && <span className="wfm-ladder-node__rank">{i + 1}</span>}
              <span className="wfm-ladder-node__label" title={item.canonical}>{item.canonical}</span>
              {item.badge && <span className="wfm-ladder-node__badge">{item.badge}</span>}
              {item.requiredBy.length > 0 && (
                <span
                  className="wfm-ladder-node__req"
                  title={item.requiredBy.map((r) => r.company).join(', ')}
                >
                  {item.requiredBy.slice(0, 2).map((r) => (
                    <span
                      key={r.company}
                      className="wfm-ladder-node__req-avatar"
                      style={{ background: avatarColor(r.company) }}
                    >
                      {r.company.slice(0, 1)}
                    </span>
                  ))}
                  {item.requiredBy.length > 2 && (
                    <span className="wfm-ladder-node__req-more">+{item.requiredBy.length - 2}</span>
                  )}
                </span>
              )}
            </li>
          ))}
          {data.overflow > 0 && (
            <li className="wfm-ladder-node__item wfm-ladder-node__item--more">+{data.overflow}개</li>
          )}
        </ol>
      )}
    </div>
  )
}

// A: 밴드 헤더 라벨 — 보유 밴드 위엔 "지금 보유 N개", 목표 밴드 위엔 "배울 것 ·
// 우선순위순"(B에서 랭크를 숨기는 조건일 땐 "배울 것"만). handle 없음, 클릭 불가.
function BandLabelNode({ data }: NodeProps<BandLabelFlowNode>) {
  return <div className="wfm-band-label">{data.text}</div>
}

const NODE_TYPES = { ownedCluster: OwnedClusterNode, targetLadder: TargetLadderNode, bandLabel: BandLabelNode }

// 고정 좌표 상수 — 노드 높이가 칩/랭크 개수에 따라 가변이라 DOM을 측정해서 정확히 쌓는
// 대신, 캡이 이미 개수 상한을 걸어준다는 걸 이용해 타입별 고정 높이를 CSS 실측치
// 기준으로 정하고 "row index × (고정높이 + gap)"으로만 좌표를 계산한다. 내용이 이
// 높이를 넘으면 CSS max-height + overflow로 안에서 잘리게 하되, 캡이 이미 개수를
// 제한하므로 대부분 안 넘친다.
// 컴팩트는 세로 스택(밴드 2개: 보유 위, 목표 아래) — 레인(언어/프레임워크/기타)은
// 밴드 안에서 가로로 나열한다.
const COMPACT_NODE_W = 208
const COMPACT_OWNED_H = 104
const COMPACT_TARGET_H = 168
const COMPACT_LANE_GAP_X = 20
const COMPACT_BAND_GAP_Y = 72
// 모달은 2컬럼(왼쪽 보유 클러스터 3개, 오른쪽 목표 사다리 3개) — 같은 레인끼리 y를
// 맞춰서 나란히 보이게 한다.
const MODAL_NODE_W = 260
const MODAL_OWNED_H = 150
const MODAL_TARGET_H = 320
const MODAL_COLUMN_GAP_X = 120
const MODAL_ROW_GAP_Y = 40
// A: 밴드 헤더 라벨 노드 고정 높이 — 기존 좌표 상수는 전혀 건드리지 않고, 라벨은
// 음수 y로 그 위에 얹는다(아래 buildWorkflowGraph 참고).
const BAND_LABEL_H = 24

const CONTEXT_EDGE_STYLE = { stroke: '#d8dade', strokeWidth: 1.4 }

// 관계(연관·순서) 엣지 스타일 — 카테고리 컨텍스트 엣지(옅은 회색, 애니메이션, 라벨 없음)
// 와 뚜렷이 구분되게 파랑 · 실선 · 굵게 · 고정(애니메이션 없음)으로 그린다. 파랑은 이미
// AVATAR_PALETTE에도 쓰는 색이라 새 색상 체계를 만드는 게 아니다. animated:false로 둬서
// "확정된 학습 순서"라는 느낌을 주고, 흐르는 컨텍스트 엣지와 시각적으로 대비시킨다.
const RELATION_EDGE_STYLE = { stroke: '#3b82f6', strokeWidth: 2 }
const RELATION_EDGE_LABEL_STYLE = { fontSize: 10, fill: '#3b82f6', fontWeight: 700 }
const RELATION_EDGE_LABEL_BG = { fill: '#fff', fillOpacity: 0.92 }

const MOCK_ROADMAP: ScopedRoadmapData = { start_matched: 0, total: 0, as_of: '', steps: [] }

type GraphCaps = { ownedCap: number; targetCap: number; mode: 'compact' | 'modal' }

// 그래프 빌더 — dagre 대신 순수 함수로 nodes/edges/truncatedCount를 계산한다. 컴팩트
// 카드와 크게 보기 모달은 캡과 좌표 산수만 다르게 이 함수를 두 번 호출해서 각자의
// nodes/edges를 따로 계산한다 — 예전엔 한 번 계산한 그래프를 두 <ReactFlow> 인스턴스가
// 그대로 재사용했지만, 이번엔 캡이 캔버스 크기별로 달라야 해서 의도적으로 그 재사용을
// 깼다.
// 사다리 노드 높이 — 세로 리스트라 항목 수의 순수 함수로 결정적 계산이 가능하다(칩
// wrap과 달리 텍스트 폭에 의존하지 않는다). PR #104가 COMPACT_TARGET_H/MODAL_TARGET_H
// 같은 고정 상수를 노드 height로 선언해뒀는데, 항목이 몇 개든 항상 그 고정값을 썼다.
// 실제 렌더 높이(항목 1개면 ~70px)와 선언 높이(320px)가 크게 어긋나면 React Flow가
// handle 위치·엣지 끝점·fitView 바운딩박스를 전부 선언 높이 기준으로 계산해서, handle이
// 허공에 뜨고 화살표가 빈 공간을 가리키고 캔버스에 거대한 공백이 생긴다. 아래 상수는
// CSS 실측(헤더 padding 7+아이콘/타이틀 15px+padding 7, 리스트 행 15px+gap 4px, 리스트
// 하단 padding 9px)에 여유를 둔 값이라, 선언 height가 항상 실제 렌더 높이 이상이 되게
// 한다(살짝 여유 있는 건 괜찮지만 모자라면 handle이 다시 밖으로 뜬다).
const LADDER_HEADER_H = 30
const LADDER_ROW_H = 20
const LADDER_PADDING = 14

function ladderHeight(itemCount: number, hasOverflow: boolean): number {
  return LADDER_HEADER_H + Math.max(1, itemCount) * LADDER_ROW_H + (hasOverflow ? LADDER_ROW_H : 0) + LADDER_PADDING
}

// A: 이 스킬을 요구하는 "선택된" 공고들의 회사명 목록 — 랭크 행 끝 아바타 귀속용.
// 같은 회사에서 온 여러 선택 공고가 있어도 아바타는 회사당 1개만(중복 제거).
function requiredByFor(canonical: string, selectedPostings: PostingDetail[]): { company: string }[] {
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

function buildWorkflowGraph(
  ownedSkills: string[],
  ownedSkillCategories: Record<string, string>,
  liveSteps: ScopedRoadmapData['steps'],
  targetSet: Set<string>,
  selectedPostings: PostingDetail[],
  caps: GraphCaps,
): { nodes: WorkflowFlowNode[]; edges: Edge[]; truncatedCount: number } {
  const hasOrder = liveSteps.length > 0
  // 라이브 로드맵을 못 받는 경우(비로그인 · 이력서 없음)엔 선택된 공고들이 그 기술을
  // 몇 번이나 요구하는지로 대체 순서를 만든다 — delta/matched_after 없이 "N개 공고
  // 요구"만 배지로 쓴다. 단, 선택 공고가 1개뿐이면 모든 배지가 똑같은 말("1개 공고
  // 요구")이라 노이즈다 — 이 경우 배지는 비우고(B) 아바타 귀속(A)이 대신 보여주게 한다.
  const suppressFallbackBadge = selectedPostings.length === 1
  const fallbackOrder = !hasOrder && targetSet.size > 0
    ? [...targetSet]
      .map((canonical) => ({ canonical, count: selectedPostings.filter((p) => p.skills.includes(canonical)).length }))
      .sort((a, b) => b.count - a.count)
    : []

  const ownedByGroup: Record<SkillGroupName, string[]> = { 언어: [], 프레임워크: [], 기타: [] }
  ownedSkills.forEach((skill) => ownedByGroup[classifySkill(skill, ownedSkillCategories[skill])].push(skill))

  // 목표/경유 스킬도 같은 3버킷으로 묶되, 버킷 내부 순서는 원래의 학습 우선순위(라이브
  // 로드맵이면 payoff/delta 내림차순, 대체 순서면 공고 요구 빈도 내림차순)를 그대로
  // 보존한다 — 즉 1차 정렬 키는 카테고리, 2차는 원래 우선순위다.
  type TargetItem = TargetLadderItem & { group: SkillGroupName }
  const items: TargetItem[] = hasOrder
    ? liveSteps.map((step) => ({
      canonical: step.canonical,
      cls: targetSet.has(step.canonical) ? 'target' : 'bridge',
      badge: `+${step.delta.toLocaleString()}건 · 누적 ${step.matched_after.toLocaleString()}건`,
      category: step.category,
      group: classifySkill(step.canonical, step.category),
      requiredBy: requiredByFor(step.canonical, selectedPostings),
    }))
    : fallbackOrder.map((item) => ({
      canonical: item.canonical, cls: 'target' as SkillClass,
      badge: suppressFallbackBadge ? '' : `${item.count}개 공고 요구`,
      group: classifySkill(item.canonical),
      count: item.count,
      requiredBy: requiredByFor(item.canonical, selectedPostings),
    }))

  const targetByGroup: Record<SkillGroupName, TargetItem[]> = { 언어: [], 프레임워크: [], 기타: [] }
  items.forEach((item) => targetByGroup[item.group].push(item))

  const nodes: WorkflowFlowNode[] = []
  const edges: Edge[] = []
  let truncated = 0
  // B: 밴드 헤더의 "우선순위순" 문구는 어딘가 랭크가 실제로 보일 때만 붙인다. 라이브
  // 모드는 항상 랭크를 보여주므로(카테고리에 항목이 있으면) 즉시 true, 폴백 모드는
  // 아래 루프에서 카테고리마다 hideRank를 판정하며 갱신한다.
  let rankVisibleSomewhere = hasOrder && items.length > 0
  // 모달 모드 누적 y — 레인마다 실제 사다리 높이(ladderHeight)가 달라서, 이전엔 고정
  // rowStep(=고정 MODAL_TARGET_H 기준)으로 레인 간격을 계산했다가 짧은 사다리 레인
  // 아래에 다음 레인이 너무 멀리 떨어지거나, 긴 사다리 레인 다음 레인과 겹칠 뻔한
  // 문제가 있었다. 레인을 순회하며 그 레인의 실제 rowHeight(보유/목표 중 더 큰 쪽)만큼만
  // 누적해서 다음 레인 y로 쓴다. 컴팩트는 밴드가 가로 나열이라 이 누적이 필요 없다
  // (기존처럼 고정 y).
  let modalY = 0

  // 관계 엣지가 가리킬 수 있는 후보를 "실제로 화면에 그려진 스킬"로만 좁히기 위한
  // 누적 집합 — 캡 적용 전 원본 ownedSkills/targetSet을 그대로 buildRelationEdges에
  // 넘기면 오버플로("+N개")로 접힌 스킬도 화살표 타깃이 될 수 있어서, 루프를 도는
  // 동안 실제로 chips/items에 담긴 것만 여기 모은다.
  const shownOwnedSkills = new Set<string>()
  const shownTargetSkills = new Set<string>()

  // 레인은 항상 3개 고정(언어/프레임워크/기타), 양쪽(보유 클러스터 · 목표 사다리) 다
  // 항상 렌더링한다 — 그 카테고리가 비어 있어도 빈 상태 문구로 채운 노드를 그린다.
  SKILL_GROUPS.forEach((group, laneIndex) => {
    const ownedFull = ownedByGroup[group]
    const ownedChips = ownedFull.slice(0, caps.ownedCap)
    const ownedOverflow = ownedFull.length - ownedChips.length
    truncated += ownedOverflow
    const ownedId = `owned-group-${group}`

    const targetFull = targetByGroup[group]
    const targetItems = targetFull.slice(0, caps.targetCap)
    const targetOverflow = targetFull.length - targetItems.length
    truncated += targetOverflow
    const targetId = `target-group-${group}`

    // B: 가짜 순서 제거 — 폴백 모드에서 이 카테고리 전 항목의 count가 동률이면(공고
    // 요구 빈도로 줄 세울 근거가 없으면) 랭크 번호를 숨긴다. 라이브 모드(delta 순)는
    // 항상 랭크를 유지한다.
    const hideRank = !hasOrder && targetFull.length > 0
      && targetFull.every((it) => it.count === targetFull[0].count)
    if (targetFull.length > 0 && !hideRank) rankVisibleSomewhere = true

    // B: 항목 수 기반 결정적 계산 — 캡이 이미 개수를 제한하니(targetItems.length) 순수
    // 함수로 실제 렌더 높이와 항상 일치하는(정확히는 그 이상인) 높이를 얻는다.
    const targetH = ladderHeight(targetItems.length, targetOverflow > 0)

    let ownedPos: { x: number; y: number }
    let targetPos: { x: number; y: number }
    let nodeW: number, ownedH: number
    if (caps.mode === 'compact') {
      const x = laneIndex * (COMPACT_NODE_W + COMPACT_LANE_GAP_X)
      ownedPos = { x, y: 0 }
      targetPos = { x, y: COMPACT_OWNED_H + COMPACT_BAND_GAP_Y }
      nodeW = COMPACT_NODE_W; ownedH = COMPACT_OWNED_H
    } else {
      // 이 레인의 실제 행 높이 — 보유(고정 MODAL_OWNED_H)와 목표(이 레인만의 실제
      // ladderHeight) 중 큰 쪽. 다음 레인은 이 레인 시작 y + rowHeight + gap에서
      // 시작하므로, 레인마다 사다리 길이가 달라도 겹치거나 과하게 벌어지지 않는다.
      const rowHeight = Math.max(MODAL_OWNED_H, targetH)
      const y = modalY
      ownedPos = { x: 0, y }
      targetPos = { x: MODAL_NODE_W + MODAL_COLUMN_GAP_X, y }
      nodeW = MODAL_NODE_W; ownedH = MODAL_OWNED_H
      modalY += rowHeight + MODAL_ROW_GAP_Y
    }

    // React Flow는 width/height를 안 주면 렌더된 DOM 콘텐츠 크기를 그대로 노드
    // 바운딩박스로 쓴다(칩 텍스트 길이에 따라 제각각). 그러면 좌표 산수(레인
    // 간격)가 실제 렌더 크기와 안 맞아 옆 노드와 겹치거나 캔버스 밖으로 잘려
    // 나간다. width/height를 명시해 CSS 고정 크기와 React Flow 내부 레이아웃
    // 계산(겹침 판정 · fitView 바운딩박스)이 항상 일치하게 한다. targetH는 이제
    // 고정 상수가 아니라 위에서 계산한 실제 콘텐츠 기반 높이라, 선언 height와
    // 실제 렌더 높이가 어긋나 handle이 허공에 뜨는 문제(PR #104 버그)가 재발하지
    // 않는다.
    nodes.push({
      id: ownedId, type: 'ownedCluster', position: ownedPos, draggable: false,
      width: nodeW, height: ownedH,
      data: { group, chips: ownedChips, overflow: ownedOverflow },
    })
    nodes.push({
      id: targetId, type: 'targetLadder', position: targetPos, draggable: false,
      width: nodeW, height: targetH,
      data: { group, items: targetItems, overflow: targetOverflow, hideRank },
    })

    // 엣지는 카테고리당 최대 1개, 목표 쪽이 비어있으면 그 레인은 엣지를 안 그린다.
    if (targetFull.length > 0) {
      edges.push({
        id: `${ownedId}->${targetId}`, source: ownedId, target: targetId,
        sourceHandle: 'ctx', targetHandle: 'ctx',
        animated: true, style: CONTEXT_EDGE_STYLE,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#b9bcc4' },
      })
    }

    ownedChips.forEach((s) => shownOwnedSkills.add(s))
    targetItems.forEach((i) => shownTargetSkills.add(i.canonical))
  })

  // A: 밴드 헤더 라벨 — 기존 클러스터/사다리 노드의 좌표는 전혀 옮기지 않고 그 위
  // 음수 y에 얹는다. 이 캔버스의 철칙대로 width/height를 명시해 DOM 측정에 기대지
  // 않는다(안 그러면 겹침 버그가 재발한다).
  const ownedLabelText = `지금 보유 ${ownedSkills.length}개`
  const targetLabelText = rankVisibleSomewhere ? '배울 것 · 우선순위순' : '배울 것'
  if (caps.mode === 'compact') {
    const bandW = COMPACT_NODE_W * SKILL_GROUPS.length + COMPACT_LANE_GAP_X * (SKILL_GROUPS.length - 1)
    nodes.push({
      id: 'band-label-owned', type: 'bandLabel', position: { x: 0, y: -34 }, draggable: false,
      selectable: false, width: bandW, height: BAND_LABEL_H,
      data: { text: ownedLabelText },
    })
    nodes.push({
      id: 'band-label-target', type: 'bandLabel',
      position: { x: 0, y: COMPACT_OWNED_H + COMPACT_BAND_GAP_Y - 34 }, draggable: false,
      selectable: false, width: bandW, height: BAND_LABEL_H,
      data: { text: targetLabelText },
    })
  } else {
    nodes.push({
      id: 'band-label-owned', type: 'bandLabel', position: { x: 0, y: -40 }, draggable: false,
      selectable: false, width: MODAL_NODE_W, height: BAND_LABEL_H,
      data: { text: ownedLabelText },
    })
    nodes.push({
      id: 'band-label-target', type: 'bandLabel',
      position: { x: MODAL_NODE_W + MODAL_COLUMN_GAP_X, y: -40 }, draggable: false,
      selectable: false, width: MODAL_NODE_W, height: BAND_LABEL_H,
      data: { text: targetLabelText },
    })
  }

  // 관계(연관·순서) 엣지 — 카테고리 컨텍스트 엣지("함께 필요")와 별개로, 실제 기술 간
  // 방향 있는 관계(예: Java -> Spring)를 클러스터 단위로 얹는다. 칩 단위 Handle은 쓰지
  // 않는다(오늘 겹침 버그의 원인이 DOM 측정 재도입이었으므로 스코프를 클러스터로 고정).
  // 같은 카테고리 쌍에 컨텍스트 엣지가 이미 있어도 상관없다 — 별개 엣지로 둘 다 그려지고
  // 스타일(색·굵기·라벨·애니메이션 여부)로 시각적으로 구분된다. 후보는 shownOwnedSkills/
  // shownTargetSkills(캡 적용 후 실제로 렌더된 것)에서만 뽑는다 — 원본 ownedSkills/
  // targetSet을 넘기면 오버플로 뒤에 숨은 스킬을 화살표가 가리킬 수 있다.
  const relations = buildRelationEdges(shownOwnedSkills, shownTargetSkills)
  relations.forEach(({ from, to }) => {
    const source = `owned-group-${classifySkill(from)}`
    const target = `target-group-${classifySkill(to)}`
    edges.push({
      id: `relation-${from}->${to}`, source, target,
      sourceHandle: 'rel', targetHandle: 'rel',
      label: `${from} → ${to}`,
      animated: false,
      style: RELATION_EDGE_STYLE,
      labelStyle: RELATION_EDGE_LABEL_STYLE,
      labelBgStyle: RELATION_EDGE_LABEL_BG,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    })
  })

  return { nodes, edges, truncatedCount: truncated }
}

// 목표 후보 아바타 색 — 회사명 해시로 고정 배정해 리렌더돼도 색이 흔들리지 않게 한다.
const AVATAR_PALETTE = ['#18181b', '#1f9d57', '#3b82f6', '#b45309', '#8b5cf6', '#0891b2']
function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

export function WorkflowMap({ size = '2x2' }: { size?: WidgetSize }) {
  const { activeResume } = useResumesState()
  const ownedSkills = useMemo(() => activeResume?.skills ?? [], [activeResume])
  // E: 이력서 스킬의 category(백엔드가 이미 내려주는 값)를 classifySkill에 넘겨서
  // pearl 사전 폴백보다 우선 신뢰하게 한다.
  const ownedSkillCategories = useMemo(() => activeResume?.skillCategories ?? {}, [activeResume])
  const ownedSet = useMemo(() => new Set(ownedSkills), [ownedSkills])
  const bookmarkIds = useBookmarks()
  const resumeId = Number(activeResume?.id)
  const token = getAuthToken()
  const identity: Identity | null = Number.isInteger(resumeId) && resumeId > 0 && token ? { resumeId, token } : null

  // 왼쪽 패널은 북마크 전부를 후보로 보여줘야 하므로, 개수 상관없이 북마크가 하나라도
  // 있으면 상세를 불러온다(예전엔 DAG용으로 2개 이상일 때만 불러왔다).
  const [postings, setPostings] = useState<PostingDetail[]>([])
  const [postingsLoading, setPostingsLoading] = useState(false)
  useEffect(() => {
    if (bookmarkIds.length === 0) {
      setPostings([])
      return
    }
    let cancelled = false
    setPostingsLoading(true)
    loadBookmarkDetails(bookmarkIds, (id) => jobsApi.detail(id))
      .then((items) => { if (!cancelled) setPostings(items) })
      .finally(() => { if (!cancelled) setPostingsLoading(false) })
    return () => { cancelled = true }
  }, [bookmarkIds])

  // 왼쪽 패널 체크박스 행에 쓸 공고별 매칭률 — placeholders.tsx의 기존 패턴과 동일하게
  // matched_count가 있으면 그걸, 없으면 보유 기술 교집합 개수를 쓴다. 새 백엔드 호출 없음.
  const postingsWithMatch = useMemo(() => postings.map((p) => ({
    detail: p,
    matchPct: matchPctFor(p.skills, p.matched_count, ownedSet),
    yearBadge: yearBadgeFor(p.post_date),
  })), [postings, ownedSet])

  // 선택 상태 — 저장된 선택이 없으면(한 번도 안 건드렸으면) 북마크 전체가 암묵 기본값.
  // 북마크가 지워졌는데 선택 목록엔 남아 있을 수 있어(스토어는 그 경로를 모른다) 현재
  // 북마크 집합 기준으로 걸러(stale filtering) 읽는다.
  const bookmarkIdSet = useMemo(() => new Set(bookmarkIds), [bookmarkIds])
  const storedSelected = useSelectedGoalIds()
  const touched = useGoalSelectionTouched()
  const selectedIds = useMemo(() => {
    const base = touched ? storedSelected : bookmarkIds
    return base.filter((id) => bookmarkIdSet.has(id))
  }, [touched, storedSelected, bookmarkIds, bookmarkIdSet])
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const handleToggle = (id: string) => toggleGoalId(id, selectedIds)

  const selectedPostings = useMemo(
    () => postings.filter((p) => selectedIdSet.has(String(p.id))),
    [postings, selectedIdSet],
  )

  const postingIds = useMemo(() => selectedPostings.map((p) => Number(p.id)), [selectedPostings])
  const targetSet = useMemo(() => {
    const set = new Set<string>()
    selectedPostings.forEach((p) => p.skills.forEach((s) => { if (!ownedSet.has(s)) set.add(s) }))
    return set
  }, [selectedPostings, ownedSet])

  // 자격증 트랙 — roadmapScoped는 자격증을 모르므로(학습 순서·payoff 계산 대상이 아님)
  // 스킬 DAG와는 완전히 별도로, 보유/목표 두 집합만 뽑아 아래 부가 레인에 칩으로 보여준다.
  // 목표 자격증도 스킬과 동일하게 "선택된" 북마크 공고 기준으로만 모은다.
  const ownedCerts = useMemo(() => activeResume?.certs ?? [], [activeResume])
  const ownedCertSet = useMemo(() => new Set(ownedCerts), [ownedCerts])
  const targetCerts = useMemo(() => {
    const set = new Set<string>()
    selectedPostings.forEach((p) => p.certs.forEach((c) => { if (!ownedCertSet.has(c)) set.add(c) }))
    return [...set]
  }, [selectedPostings, ownedCertSet])
  const hasCertLane = ownedCerts.length > 0 || targetCerts.length > 0

  const roadmapKey = identity && postingIds.length ? `${resumeId}:${postingIds.slice().sort().join(',')}` : 'idle'
  const roadmap = useWidgetData<ScopedRoadmapData>(
    identity && postingIds.length ? () => dashboardApi.roadmapScoped(identity, postingIds, 10) : null,
    MOCK_ROADMAP,
    roadmapKey,
  )

  // 컴팩트 카드용 그래프 — 캡이 작다(보유 4개/목표 5개). 컴팩트 <ReactFlow>에만 쓰인다.
  const { nodes, edges, truncatedCount } = useMemo(
    () => buildWorkflowGraph(ownedSkills, ownedSkillCategories, roadmap.value.steps, targetSet, selectedPostings, {
      ownedCap: COMPACT_OWNED_CAP, targetCap: COMPACT_TARGET_CAP, mode: 'compact',
    }),
    [roadmap.value, targetSet, selectedPostings, ownedSkills, ownedSkillCategories],
  )

  // 크게 보기 모달용 그래프 — 캡이 크다(보유 10개/목표 10개). 예전엔 nodes/edges를 한 번만
  // 계산해서 컴팩트 · 모달 두 <ReactFlow>가 그대로 재사용했지만, 캡이 캔버스 크기에 따라
  // 달라야 하므로 같은 빌더를 캡만 바꿔 한 번 더 호출한다.
  const { nodes: expandedNodes, edges: expandedEdges, truncatedCount: expandedTruncatedCount } = useMemo(
    () => buildWorkflowGraph(ownedSkills, ownedSkillCategories, roadmap.value.steps, targetSet, selectedPostings, {
      ownedCap: MODAL_OWNED_CAP, targetCap: MODAL_TARGET_CAP, mode: 'modal',
    }),
    [roadmap.value, targetSet, selectedPostings, ownedSkills, ownedSkillCategories],
  )

  const showNoBookmarks = bookmarkIds.length === 0
  const showNoSelection = !showNoBookmarks && selectedIds.length === 0
  const isLoading = !showNoBookmarks && !showNoSelection && (postingsLoading || (identity !== null && roadmap.loading))
  const canShowGraph = !showNoBookmarks && !showNoSelection && !isLoading

  // 컴팩트 카드에서 목표 선택 패널은 이제 캔버스 위에 뜨는 플로팅 드로어다(4번 피드백:
  // 다이어그램이 카드를 거의 다 채우게). 기본은 닫힘(다이어그램이 바로 보이게)이지만,
  // 아직 목표를 하나도 안 골랐으면(showNoSelection) 처음부터 열어서 "여기서 고르면
  // 된다"는 게 바로 보이게 한다 — 이 초기값은 마운트 시점 값만 쓰고, 그 뒤엔 토글 버튼으로만 바뀐다.
  const [goalPanelOpen, setGoalPanelOpen] = useState(showNoSelection)

  // 데모용 추천 공고 가져오기 — 검증된 기업명으로 최대 12개 회사를 4개씩 묶어 조회해
  // 후보를 최대 8개 모은다. 예전엔 모으자마자 전부 자동으로 북마크했는데, 어떤 공고가
  // 담기는지 미리 보고 골라 담고 싶다는 요청으로 모달에 나열하고 개별 추가 버튼으로
  // 바꿨다. 개별 회사 조회 실패는 allSettled로 흡수해 하나 실패해도 전체가 안 멈춘다.
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendMessage, setRecommendMessage] = useState<string | null>(null)
  const [recommendCandidates, setRecommendCandidates] = useState<PostingCard[]>([])
  const [recommendModalOpen, setRecommendModalOpen] = useState(false)
  const [addedCandidateIds, setAddedCandidateIds] = useState<Set<string>>(new Set())

  const handleRecommendClick = async () => {
    if (recommendLoading) return
    setRecommendLoading(true)
    setRecommendMessage(null)
    const seenIds = new Set<string>()
    const collected: PostingCard[] = []
    try {
      const pool = DREAM_COMPANIES.slice(0, RECOMMEND_MAX_COMPANIES)
      for (let i = 0; i < pool.length && collected.length < RECOMMEND_TARGET_NEW; i += RECOMMEND_CHUNK_SIZE) {
        const chunk = pool.slice(i, i + RECOMMEND_CHUNK_SIZE)
        const results = await Promise.allSettled(
          chunk.map((company) => jobsApi.list({
            pool: 'domestic', company: company.name, sort: 'latest', page: 1, page_size: 2,
            include_recent_closed: true,
          }, token)),
        )
        for (const result of results) {
          if (collected.length >= RECOMMEND_TARGET_NEW) break
          if (result.status !== 'fulfilled') continue
          for (const item of result.value.items) {
            if (collected.length >= RECOMMEND_TARGET_NEW) break
            const id = String(item.id)
            if (seenIds.has(id) || isBookmarked(id)) continue
            seenIds.add(id)
            collected.push(item)
          }
        }
      }

      if (collected.length === 0) {
        setRecommendMessage('이미 추천드릴 새 공고가 없어요')
        window.setTimeout(() => setRecommendMessage(null), 4000)
      } else {
        setRecommendCandidates(collected)
        setAddedCandidateIds(new Set())
        setRecommendModalOpen(true)
      }
    } catch {
      setRecommendMessage('추천 공고를 가져오지 못했어요')
      window.setTimeout(() => setRecommendMessage(null), 4000)
    } finally {
      setRecommendLoading(false)
    }
  }

  const handleAddCandidate = (item: PostingCard) => {
    const id = String(item.id)
    if (addedCandidateIds.has(id)) return
    toggleBookmark(id)
    if (isGoalSelectionTouched()) {
      setSelectedGoalIds([...new Set([...getSelectedGoalIds(), id])])
    }
    setAddedCandidateIds((prev) => new Set(prev).add(id))
  }

  useEffect(() => {
    if (!recommendModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setRecommendModalOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [recommendModalOpen])

  // 2a: 크게 보기 — 더 큰 캔버스에 더 큰 캡(expandedNodes/expandedEdges)으로 그리는
  // 오버레이 모달. 컴팩트 그래프와 별도로 계산된 값이라 캡이 다르다. Escape·백드롭
  // 클릭으로 닫는다.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  // truncated 카운트는 클러스터별(보유 칩 오버플로 + 목표 랭크 오버플로) 합산값이라
  // 컴팩트/모달 캡이 다르면 서로 다른 값이 나온다 — 각 캔버스 아래엔 자기 캡 기준
  // 카운트로 노트를 띄운다. B: "선택한 공고가 많아"는 공고 1개일 때도 뜨던 거짓 문구였다
  // (잘리는 이유는 공고 개수가 아니라 카드/모달의 공간이 좁아서다) — 원인을 정확히 쓴다.
  const renderTruncationNote = (count: number) => count > 0 ? (
    <div className="wfm-truncation-note">공간이 좁아 카테고리별 상위 기술만 표시했어요(+{count}개 더 있어요).</div>
  ) : null
  const truncationNote = renderTruncationNote(truncatedCount)
  const expandedTruncationNote = renderTruncationNote(expandedTruncatedCount)

  const legend = (
    <div className="wfm-legend">
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--owned" />보유</span>
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--target" />목표</span>
      <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--bridge" />경유</span>
      {hasCertLane && (
        <>
          <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--cert-owned" />보유 자격증</span>
          <span className="wfm-legend__item"><i className="wfm-dot wfm-dot--cert-target" />목표 자격증</span>
        </>
      )}
      <span className="wfm-legend__item">
        <svg width="18" height="8" viewBox="0 0 18 8" className="wfm-legend__arrow" aria-hidden="true">
          <line x1="0" y1="4" x2="12" y2="4" stroke="#3b82f6" strokeWidth="2" />
          <path d="M11 0.5 L17 4 L11 7.5 Z" fill="#3b82f6" />
        </svg>
        관련 기술(방향 있음)
      </span>
      <span className="wfm-legend__caption">옅은 곡선 = 카테고리 안에서 함께 필요(선행조건 아님), 파란 화살표 = 실제 학습 순서</span>
    </div>
  )

  // 자격증 레인 — 학습 순서가 없는 정보라 메인 DAG 체인에 억지로 엮지 않고, 카드 하단에
  // 완전히 분리된 작은 패널로만 붙인다. 양쪽 다 비어 있으면(대부분의 비자격증 직군)
  // 레인 자체를 렌더링하지 않아 빈 상태 노이즈를 만들지 않는다.
  const certLane = hasCertLane ? (
    <div className="wfm-cert-lane" aria-label="자격증">
      <span className="wfm-cert-lane__title">자격증</span>
      <div className="wfm-cert-lane__row">
        {ownedCerts.map((c) => (
          <span key={`oc-${c}`} className="wfm-cert-chip wfm-cert-chip--owned">
            <Award size={11} />
            {c}
          </span>
        ))}
        {targetCerts.map((c) => (
          <span key={`tc-${c}`} className="wfm-cert-chip wfm-cert-chip--target">
            <Award size={11} />
            {c}
            <span className="wfm-cert-chip__badge">필요</span>
          </span>
        ))}
      </div>
    </div>
  ) : null

  // 왼쪽 패널 — 북마크 전부를 체크박스 행으로 보여준다. 목표 선택 자체가 이 위젯의
  // 주된 진입점이라, "선택 0개" 상태에서도 이 패널만은 계속 온전히 보이고 조작 가능해야 한다.
  const goalPanel = (
    <div className="wfm-goal-panel" aria-label="목표로 삼을 북마크 선택">
      {postingsLoading && postingsWithMatch.length === 0 ? (
        <div className="wfm-goal-loading" role="status" aria-live="polite">북마크를 불러오는 중이에요.</div>
      ) : (
        <ul className="wfm-goal-list">
          {postingsWithMatch.map(({ detail, matchPct, yearBadge }) => {
            const id = String(detail.id)
            const checked = selectedIdSet.has(id)
            const company = detail.company ?? '회사명 미상'
            return (
              <li key={id} className="wfm-goal-item">
                <label className="wfm-goal-row">
                  <input
                    type="checkbox"
                    className="wfm-goal-checkbox"
                    checked={checked}
                    onChange={() => handleToggle(id)}
                  />
                  <span className="wfm-goal-avatar" style={{ background: avatarColor(company) }}>
                    {company.slice(0, 1)}
                  </span>
                  <span className="wfm-goal-info">
                    <span className="wfm-goal-company">{company}</span>
                    <span className="wfm-goal-title" title={detail.title}>{detail.title}</span>
                  </span>
                  {yearBadge && <span className="wfm-goal-year">{yearBadge}</span>}
                  <span className="wfm-goal-pct">{matchPct}%</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  return (
    <>
      <div className="dcard wfm-card">
        <SectionHeader
          title="목표 · 학습 워크플로우 맵"
          hint="북마크에서 목표를 선택하면 학습 순서를 보여줘요"
          right={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!showNoBookmarks && !identity && <PreviewBadge />}
              <div className="wfm-recommend-wrap">
                <button
                  type="button"
                  className={`wfm-expand-btn wfm-recommend-btn${recommendLoading ? ' is-loading' : ''}`}
                  onClick={handleRecommendClick}
                  disabled={recommendLoading}
                  aria-label="추천 공고 가져오기"
                  title="추천 공고 가져오기"
                >
                  <Sparkles size={14} />
                </button>
                {recommendMessage && (
                  <span className="wfm-recommend-msg" role="status" aria-live="polite">{recommendMessage}</span>
                )}
              </div>
              {!showNoBookmarks && canShowGraph && (
                <button
                  type="button"
                  className="wfm-expand-btn"
                  onClick={() => setExpanded(true)}
                  aria-label="워크플로우 맵 크게 보기"
                  title="크게 보기"
                >
                  <Maximize2 size={14} />
                </button>
              )}
            </div>
          )}
        />
        {showNoBookmarks ? (
          <div className="wfm-empty">
            <p className="wfm-empty__lead">북마크한 공고를 목표로 학습 경로를 그려드려요.</p>
            <span className="wfm-empty__hint">관심 있는 공고를 북마크하면 목표로 고를 수 있어요.</span>
            {ownedSkills.length > 0 && (
              <div className="wfm-empty__owned">
                <span className="wfm-empty__owned-label">지금 보유한 기술</span>
                <div className="wfm-empty__chips">
                  {ownedSkills.slice(0, 12).map((s) => <span key={s} className="wfm-chip wfm-chip--owned">{s}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="wfm-body">
            <div className="wfm-graph-pane">
              <button
                type="button"
                className="wfm-goal-toggle"
                onClick={() => setGoalPanelOpen((open) => !open)}
                aria-expanded={goalPanelOpen}
                aria-label="목표 선택 패널 토글"
                title="목표 선택"
              >
                <ListChecks size={13} />
                목표 선택
              </button>
              {goalPanelOpen && (
                <div className="wfm-goal-drawer">
                  <div className="wfm-goal-drawer__head">
                    <span className="wfm-goal-drawer__title">목표로 삼을 공고</span>
                    <button
                      type="button"
                      className="wfm-goal-drawer__close"
                      onClick={() => setGoalPanelOpen(false)}
                      aria-label="목표 선택 패널 닫기"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {goalPanel}
                </div>
              )}
              {showNoSelection ? (
                <div className="wfm-empty wfm-empty--selection">
                  <p className="wfm-empty__lead">북마크한 공고 중 목표로 삼을 걸 선택해보세요.</p>
                  <span className="wfm-empty__hint">위의 "목표 선택" 버튼에서 하나 이상 체크하면 학습 순서가 나타나요.</span>
                </div>
              ) : isLoading ? (
                <div className="wfm-loading" role="status" aria-live="polite">워크플로우 맵을 그리는 중이에요.</div>
              ) : (
                <>
                  <div
                    className="wfm-canvas"
                    style={{
                      height: size === '2x2' ? 500 : 260,
                      '--wfm-node-w': `${COMPACT_NODE_W}px`,
                      '--wfm-owned-h': `${COMPACT_OWNED_H}px`,
                      '--wfm-target-h': `${COMPACT_TARGET_H}px`,
                    } as CSSProperties}
                  >
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      nodeTypes={NODE_TYPES}
                      fitView
                      fitViewOptions={{ padding: 0.2 }}
                      nodesDraggable={false}
                      nodesConnectable={false}
                      elementsSelectable={false}
                      panOnScroll
                      zoomOnScroll
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background gap={18} size={1} color="#eceef3" />
                      <Controls showInteractive={false} />
                    </ReactFlow>
                  </div>
                  {legend}
                  {truncationNote}
                  {certLane}
                  {roadmap.value.as_of && <AsOf asOf={roadmap.value.as_of} n={roadmap.value.total} />}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {expanded && canShowGraph && (
        <div className="wfm-modal__backdrop" onClick={() => setExpanded(false)}>
          <div
            className="wfm-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label="학습 워크플로우 맵 크게 보기"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wfm-modal__titlebar">
              <span className="wfm-modal__title">목표 · 학습 워크플로우 맵</span>
              <button type="button" className="wfm-modal__close" onClick={() => setExpanded(false)} aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            <div
              className="wfm-modal__canvas"
              style={{
                '--wfm-node-w': `${MODAL_NODE_W}px`,
                '--wfm-owned-h': `${MODAL_OWNED_H}px`,
                '--wfm-target-h': `${MODAL_TARGET_H}px`,
              } as CSSProperties}
            >
              <ReactFlow
                nodes={expandedNodes}
                edges={expandedEdges}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.35 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnScroll
                zoomOnScroll
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={18} size={1} color="#eceef3" />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable className="wfm-minimap" />
              </ReactFlow>
            </div>
            {legend}
            {expandedTruncationNote}
            {certLane}
          </div>
        </div>
      )}

      {recommendModalOpen && (
        <div className="wfm-modal__backdrop" onClick={() => setRecommendModalOpen(false)}>
          <div
            className="wfm-modal__card wfm-recommend-modal"
            role="dialog"
            aria-modal="true"
            aria-label="추천 공고"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wfm-modal__titlebar">
              <span className="wfm-modal__title">추천 공고</span>
              <button type="button" className="wfm-modal__close" onClick={() => setRecommendModalOpen(false)} aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            <p className="wfm-recommend-modal__hint">담고 싶은 공고만 골라서 추가하세요. 추가하면 북마크되고 목표로도 반영돼요.</p>
            <ul className="wfm-recommend-modal__list">
              {recommendCandidates.map((item) => {
                const id = String(item.id)
                const added = addedCandidateIds.has(id)
                const company = item.company ?? '회사명 미상'
                const matchPct = matchPctFor(item.skills, item.matched_count, ownedSet)
                const yearBadge = yearBadgeFor(item.post_date)
                return (
                  <li key={id} className="wfm-recommend-modal__item">
                    <span className="wfm-goal-avatar" style={{ background: avatarColor(company) }}>
                      {company.slice(0, 1)}
                    </span>
                    <span className="wfm-goal-info">
                      <span className="wfm-goal-company">{company}</span>
                      <span className="wfm-goal-title" title={item.title}>{item.title}</span>
                    </span>
                    {yearBadge && <span className="wfm-goal-year">{yearBadge}</span>}
                    <span className="wfm-goal-pct">{matchPct}%</span>
                    <button
                      type="button"
                      className={`wfm-recommend-modal__add${added ? ' is-added' : ''}`}
                      onClick={() => handleAddCandidate(item)}
                      disabled={added}
                    >
                      {added ? '추가됨' : '추가'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
