// 시안 4/5: elkjs 기반 결정적 스테이지 레이아웃 — WorkflowStages.tsx가 예전에 쓰던
// "렌더 후 실제 DOM 위치를 측정해서 SVG를 그리는" 방식은 리사이즈·스크롤·폰트 로딩마다
// 재측정이 일어나 연결선이 흔들리는 원인이었다. 이 모듈은 그 대신, 카드 크기를 DOM
// 측정 없이 "이 카드에 어떤 내용이 들어가는지"(이유 문구 유무, payoff 유무, 대안 배지
// 유무, 번들 멤버 수 등 렌더 이전에 이미 아는 데이터)만으로 순수하게 추정하고, elkjs의
// layered 알고리즘(방향 RIGHT + partitioning으로 시작/1/2/3단계/자격증 컬럼 유지 +
// ORTHOGONAL 라우팅)에 넘겨 노드 좌표와 겹치지 않는 엣지 경로를 한 번에 계산한다. 같은
// 입력이면 항상 같은 좌표가 나온다(결정적) — 리사이즈/스크롤/폰트로딩과 무관하다.
//
// elkjs는 기본적으로 Web Worker로 계산을 offload하지만, 번들러(Vite) 환경에서 별도
// 워커 스크립트를 서빙하기 번거로워서 메인 스레드에서 동기 실행되는 번들 버전
// (elk.bundled.js)을 쓴다 — 그래프 규모가 작아(컬럼당 최대 6장 카드) 성능 문제가 없다.
import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api'

const elk = new ELK()

// 카드 폭 — 컴팩트 카드/크게 보기 모달 두 폭만 있고, 컬럼 안 카드는 전부 같은 폭이다
// (elk 레이어 간격 계산이 폭 차이로 흔들리지 않게 하려는 의도도 있다).
export const NODE_WIDTH = 184
export const NODE_WIDTH_WIDE = 232
export const COLUMN_GAP = 44
export const ROW_GAP = 14

// 시안 3: 카드 높이를 기존 대비 30% 이상 키우고 스킬명 · 카테고리 · 수요(공고 수 +
// 회사 아바타) · (있으면) payoff 순으로 여백 있게 배치한다. 아래 상수들이 그 배치의
// 높이 예산이고, workflowMap.css의 .wfs-scard 관련 패딩/마진과 반드시 같은 값을
// 써야 추정 높이와 실제 렌더 높이가 어긋나지 않는다.
export const SKILL_CARD_PAD_V = 32
export const SKILL_CARD_HEADER_H = 22
export const SKILL_CARD_GAP = 10
export const SKILL_CARD_REASON_H = 30
export const SKILL_CARD_DEMAND_H = 26
export const SKILL_CARD_PAYOFF_H = 22
export const SKILL_CARD_ALT_H = 18

export function estimateSkillCardHeight(opts: { hasReason: boolean; hasPayoff: boolean; hasAlt: boolean }): number {
  let h = SKILL_CARD_PAD_V + SKILL_CARD_HEADER_H
  if (opts.hasReason) h += SKILL_CARD_GAP + SKILL_CARD_REASON_H
  h += SKILL_CARD_GAP + SKILL_CARD_DEMAND_H
  if (opts.hasPayoff) h += SKILL_CARD_GAP + SKILL_CARD_PAYOFF_H
  if (opts.hasAlt) h += SKILL_CARD_GAP + SKILL_CARD_ALT_H
  return h
}

export const BUNDLE_PAD_V = 26
export const BUNDLE_ROW_H = 24
export const BUNDLE_NOTE_H = 18

export function estimateBundleHeight(memberCount: number, hasNote: boolean): number {
  return BUNDLE_PAD_V + memberCount * BUNDLE_ROW_H + (hasNote ? BUNDLE_NOTE_H : 0)
}

export const CERT_CARD_PAD_V = 20
export const CERT_CARD_HEADER_H = 18
export const CERT_CARD_NOTE_H = 26

export function estimateCertCardHeight(hasNote: boolean): number {
  return CERT_CARD_PAD_V + CERT_CARD_HEADER_H + (hasNote ? CERT_CARD_NOTE_H : 0)
}

// 시작 컬럼 요약 카드 — 보유 스킬 총계/그룹 카운트 블록. elk 노드가 아니라(엣지가
// 붙지 않으므로) 정적으로 배치하고, 그 아래 칩(엣지 출발점)들만 elk 노드로 쌓는다.
export const START_SUMMARY_EMPTY_H = 40
export const START_SUMMARY_H = 122
export const CHIP_HEIGHT = 26
export const CHIP_TO_SUMMARY_GAP = 12

export function estimateStartSummaryHeight(totalOwned: number): number {
  return totalOwned === 0 ? START_SUMMARY_EMPTY_H : START_SUMMARY_H
}

// 칩(엣지 출발점인 보유 스킬)은 카드처럼 컬럼 폭을 꽉 채우지 않고 텍스트 길이만큼만
// 차지한다 — 고정 카드 폭으로 두면 짧은 칩 주변에 어색한 빈 공간이 남는다. 문자 수
// 기반의 순수 추정치이며(실제 렌더도 이 값을 그대로 폭으로 쓰므로 어긋나지 않는다),
// 아주 긴 이름은 CSS의 ellipsis가 넘치지 않게 잘라준다.
export function estimateChipWidth(text: string): number {
  return Math.max(46, Math.ceil(text.length * 6.4) + 30)
}

export type LayoutNode = { id: string; column: number; width: number; height: number }
export type LayoutRect = { x: number; y: number; width: number; height: number }
export type LayoutEdgeInput = { id: string; from: string; to: string }
export type LayoutEdgePath = { id: string; from: string; to: string; points: { x: number; y: number }[] }

export type ElkLayoutResult = {
  nodes: Map<string, LayoutRect>
  edges: LayoutEdgePath[]
  columns: Map<number, { x: number; width: number }>
  width: number
  height: number
}

const START_ANCHOR_ID = '__wfs_start_anchor__'

// layoutStages — 시작(0) · 1 · 2 · 3단계 · 자격증 컬럼을 elk의 partitioning으로 고정한
// 채(컬럼 순서=학습 순서라는 의미를 그대로 유지) layered 알고리즘에 배치를 맡긴다.
// 시작 컬럼의 칩(엣지 출발점)은 텍스트 길이에 맞춘 좁은 폭으로 그리는데(고정 카드
// 폭이면 짧은 칩 주변에 어색한 빈 공간이 남는다), 칩이 하나도 없거나 전부 좁으면 elk가
// 그 레이어에 예약하는 가로 폭이 카드 컬럼(nodeWidth)보다 좁아져 다음 컬럼이 시작
// 컬럼의 시각적 헤더/박스 폭을 침범할 수 있다. 높이 1px · 폭 nodeWidth짜리 보이지 않는
// 앵커 노드를 시작 컬럼에 항상 끼워 넣어, 실제 칩 유무·폭과 무관하게 컬럼0이 항상
// nodeWidth만큼의 가로 공간을 예약하도록 고정한다(렌더 쪽에서 이 id는 걸러낸다).
export async function layoutStages(
  nodes: LayoutNode[],
  edgeInputs: LayoutEdgeInput[],
  nodeWidth: number,
): Promise<ElkLayoutResult> {
  const graphNodes: LayoutNode[] = [...nodes, { id: START_ANCHOR_ID, column: 0, width: nodeWidth, height: 1 }]

  const nodeIds = new Set(graphNodes.map((n) => n.id))
  const validEdges = edgeInputs.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))

  const children: ElkNode[] = graphNodes.map((n) => ({
    id: n.id,
    width: n.width,
    height: n.height,
    layoutOptions: { 'elk.partitioning.partition': String(n.column) },
  }))

  const elkEdges: ElkExtendedEdge[] = validEdges.map((e) => ({
    id: e.id,
    sources: [e.from],
    targets: [e.to],
  }))

  const graph: ElkNode = {
    id: 'wfs-root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.partitioning.activate': 'true',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.spacing.nodeNode': String(ROW_GAP),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(COLUMN_GAP),
      'elk.layered.spacing.edgeNodeBetweenLayers': '18',
      'elk.spacing.edgeEdge': '10',
    },
    children,
    edges: elkEdges,
  }

  const result = await elk.layout(graph)
  const resultChildren = result.children ?? []

  const nodeRects = new Map<string, LayoutRect>()
  resultChildren.forEach((c) => {
    if (c.id === START_ANCHOR_ID) return
    nodeRects.set(c.id, { x: c.x ?? 0, y: c.y ?? 0, width: c.width ?? nodeWidth, height: c.height ?? 0 })
  })

  const columnById = new Map(graphNodes.map((n) => [n.id, n.column]))
  const columns = new Map<number, { x: number; width: number }>()
  resultChildren.forEach((c) => {
    const column = columnById.get(c.id)
    if (column === undefined) return
    const x = c.x ?? 0
    const existing = columns.get(column)
    if (!existing || x < existing.x) columns.set(column, { x, width: c.width ?? nodeWidth })
  })

  const edgePaths: LayoutEdgePath[] = (result.edges ?? []).map((e) => {
    const section = e.sections?.[0]
    const points = section ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint] : []
    return { id: e.id, from: e.sources[0], to: e.targets[0], points }
  })

  let width = 0
  let height = 0
  nodeRects.forEach((r) => {
    width = Math.max(width, r.x + r.width)
    height = Math.max(height, r.y + r.height)
  })
  columns.forEach((c) => { width = Math.max(width, c.x + c.width) })

  return { nodes: nodeRects, edges: edgePaths, columns, width, height }
}

// 목업의 orthogonal polyline(라운드 코너) 함수 — elk가 돌려준 직교 꺾은선의 모서리를
// 살짝 둥글려 시각적으로 부드럽게 만든다. DOM 측정 시절 코드 그대로 재사용한다.
export function roundedPath(pts: { x: number; y: number }[], r: number): string {
  if (!pts.length) return ''
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const v1x = p0.x - p1.x
    const v1y = p0.y - p1.y
    const v2x = p2.x - p1.x
    const v2y = p2.y - p1.y
    const len1 = Math.hypot(v1x, v1y) || 1
    const len2 = Math.hypot(v2x, v2y) || 1
    const rr = Math.min(r, len1 / 2, len2 / 2)
    const e1x = p1.x + (v1x / len1) * rr
    const e1y = p1.y + (v1y / len1) * rr
    const e2x = p1.x + (v2x / len2) * rr
    const e2y = p1.y + (v2y / len2) * rr
    d += ` L${e1x} ${e1y} Q${p1.x} ${p1.y} ${e2x} ${e2y}`
  }
  const last = pts[pts.length - 1]
  d += ` L${last.x} ${last.y}`
  return d
}
