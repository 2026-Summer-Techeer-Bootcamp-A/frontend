// 시안 4/5: 워크플로우 스테이지의 결정적 레이아웃 — WorkflowStages.tsx의 예전 DOM
// 측정 방식(리사이즈·스크롤·폰트 로딩마다 재측정돼 연결선이 흔들리던 원인)을 대체한다.
//
// elkjs의 layered 알고리즘(partitioning)으로 먼저 시도했으나, 라이브 화면에서 스테이지
// 컬럼 구조가 시각적으로 무너지는(노드가 컬럼 경계 없이 넓게 흩어지는) 문제가 있었다.
// elk가 partitioning 힌트를 절대적 제약으로 취급하지 않고 자체 crossing-minimization/
// nodePlacement 휴리스틱으로 x축까지 다시 흔드는 게 원인으로 보인다. "각 스테이지가
// 시각적으로 또렷한 세로 레인"이라는 요구는 협상 불가 항목이라, elk의 레이아웃 엔진에
// 더 매달리는 대신 컬럼 좌표를 우리가 직접, 전적으로 결정적으로 계산하는 쪽으로
// 바꿨다 — 컬럼 x는 오직 컬럼 인덱스만의 함수이고(콘텐츠가 뭐든 절대 드리프트하지
// 않는다), 컬럼 안 노드 y는 위에서부터 높이+간격을 그대로 누적한 값이다. 엣지 경로도
// 이 알려진 좌표에서 직접 직교(orthogonal) polyline으로 계산한다(elkjs 의존성 없음,
// DOM 측정도 없음 — 순수 함수라 리사이즈/스크롤/폰트로딩과 완전히 무관하다).
export const NODE_WIDTH = 184
export const NODE_WIDTH_WIDE = 232
// 컬럼 사이 가로 간격 · 컬럼 안 노드 사이 세로 간격 — 넉넉하게 뒀다(요구사항: "컬럼
// 사이 가로 간격과 노드 사이 세로 간격을 넉넉히 준다").
export const COLUMN_GAP = 72
export const ROW_GAP = 22

// 시안 3 + 라이브 피드백: 카드 높이를 "훨씬" 키운다. 목표를 하나도 선택하지 않은
// 상태(보유 요약 카드만 있는 상태)에서도 크게 보여야 하므로, 아래 MIN_* 바닥값은
// 카드 내용(이유/payoff/대안 배지 유무)과 무관하게 항상 적용된다 — 목표 선택 여부가
// 이 바닥값에 전혀 영향을 주지 않는다.
export const SKILL_CARD_PAD_V = 44
export const SKILL_CARD_HEADER_H = 28
export const SKILL_CARD_GAP = 16
export const SKILL_CARD_REASON_H = 38
export const SKILL_CARD_DEMAND_H = 36
export const SKILL_CARD_PAYOFF_H = 30
export const SKILL_CARD_ALT_H = 26
export const MIN_SKILL_CARD_H = 176

export function estimateSkillCardHeight(opts: { hasReason: boolean; hasPayoff: boolean; hasAlt: boolean }): number {
  let h = SKILL_CARD_PAD_V + SKILL_CARD_HEADER_H
  if (opts.hasReason) h += SKILL_CARD_GAP + SKILL_CARD_REASON_H
  h += SKILL_CARD_GAP + SKILL_CARD_DEMAND_H
  if (opts.hasPayoff) h += SKILL_CARD_GAP + SKILL_CARD_PAYOFF_H
  if (opts.hasAlt) h += SKILL_CARD_GAP + SKILL_CARD_ALT_H
  return Math.max(h, MIN_SKILL_CARD_H)
}

export const BUNDLE_PAD_V = 36
export const BUNDLE_ROW_H = 32
export const BUNDLE_NOTE_H = 22
export const MIN_BUNDLE_H = 168

export function estimateBundleHeight(memberCount: number, hasNote: boolean): number {
  const h = BUNDLE_PAD_V + memberCount * BUNDLE_ROW_H + (hasNote ? BUNDLE_NOTE_H : 0)
  return Math.max(h, MIN_BUNDLE_H)
}

export const CERT_CARD_PAD_V = 30
export const CERT_CARD_HEADER_H = 24
export const CERT_CARD_NOTE_H = 32
export const MIN_CERT_CARD_H = 168

export function estimateCertCardHeight(hasNote: boolean): number {
  const h = CERT_CARD_PAD_V + CERT_CARD_HEADER_H + (hasNote ? CERT_CARD_NOTE_H : 0)
  return Math.max(h, MIN_CERT_CARD_H)
}

// 시작 컬럼 요약 카드 — 목표(target) 선택 여부와 완전히 무관하게 ownedSkills 총량에만
// 좌우된다. 즉 목표를 하나도 안 골라도(빈 상태) 이 카드는 항상 이 크기로 나온다.
export const START_SUMMARY_EMPTY_H = 100
export const START_SUMMARY_H = 210
export const CHIP_HEIGHT = 30

export function estimateStartSummaryHeight(totalOwned: number): number {
  return totalOwned === 0 ? START_SUMMARY_EMPTY_H : START_SUMMARY_H
}

// 칩(엣지 출발점인 보유 스킬)은 카드처럼 컬럼 폭을 꽉 채우지 않고 텍스트 길이만큼만
// 차지한다(컬럼 왼쪽 정렬) — 고정 카드 폭으로 두면 짧은 칩 주변에 어색한 빈 공간이
// 남는다. 문자 수 기반의 순수 추정치이며 실제 렌더도 이 값을 그대로 폭으로 쓰므로
// 어긋나지 않는다(아주 긴 이름은 CSS ellipsis가 넘치지 않게 잘라준다).
export function estimateChipWidth(text: string): number {
  return Math.max(50, Math.ceil(text.length * 6.4) + 32)
}

export type LayoutNode = { id: string; column: number; width: number; height: number }
export type LayoutRect = { x: number; y: number; width: number; height: number }
export type LayoutEdgeInput = { id: string; from: string; to: string }
export type LayoutEdgePath = { id: string; from: string; to: string; points: { x: number; y: number }[] }

export type StageLayoutResult = {
  nodes: Map<string, LayoutRect>
  edges: LayoutEdgePath[]
  columns: Map<number, { x: number; width: number }>
  width: number
  height: number
}

// 하단 통로(corridor) 라우팅 — 2컬럼 이상 건너뛰는 엣지(예: 1단계 스킬 -> 자격증
// 컬럼)는 중간 컬럼의 카드를 가로질러 그으면 안 되므로, 전체 콘텐츠 아래로 내려갔다가
// 대상 컬럼 바로 앞에서 다시 올라오는 경로를 쓴다. 여러 개면 통로 레인을 나눠 겹치지
// 않게 한다.
const CORRIDOR_BASE_GAP = 26
const CORRIDOR_LANE_STEP = 12
const CORRIDOR_ASCENT_SETBACK = 20

// layoutStages — 컬럼(시작/1/2/3/자격증) x좌표는 오직 컬럼 인덱스만의 함수다
// (columnIndex * (nodeWidth + COLUMN_GAP)). 컬럼 안 노드는 입력 배열 순서 그대로
// 위에서부터 세로로 쌓는다(순서 자체는 호출부가 이미 정렬해서 넘긴다). DOM 측정도,
// 외부 레이아웃 엔진도 없는 순수 함수다 — 같은 입력이면 항상 같은 좌표가 나온다.
export function layoutStages(nodes: LayoutNode[], edgeInputs: LayoutEdgeInput[], nodeWidth: number): StageLayoutResult {
  const byColumn = new Map<number, LayoutNode[]>()
  nodes.forEach((n) => {
    if (!byColumn.has(n.column)) byColumn.set(n.column, [])
    byColumn.get(n.column)!.push(n)
  })

  const columnIndices = [...byColumn.keys()].sort((a, b) => a - b)
  const columns = new Map<number, { x: number; width: number }>()
  const nodeRects = new Map<string, LayoutRect>()
  const columnOf = new Map<string, number>()

  let maxContentBottom = 0
  columnIndices.forEach((col) => {
    const x = col * (nodeWidth + COLUMN_GAP)
    columns.set(col, { x, width: nodeWidth })
    let y = 0
    byColumn.get(col)!.forEach((n) => {
      nodeRects.set(n.id, { x, y, width: n.width, height: n.height })
      columnOf.set(n.id, col)
      y += n.height + ROW_GAP
      maxContentBottom = Math.max(maxContentBottom, y - ROW_GAP)
    })
  })

  const maxColumnIndex = columnIndices.length > 0 ? columnIndices[columnIndices.length - 1] : 0
  const width = (maxColumnIndex + 1) * nodeWidth + maxColumnIndex * COLUMN_GAP

  let corridorLane = 0
  const edgePaths: LayoutEdgePath[] = []
  edgeInputs.forEach((e) => {
    const rectA = nodeRects.get(e.from)
    const rectB = nodeRects.get(e.to)
    const colA = columnOf.get(e.from)
    const colB = columnOf.get(e.to)
    if (!rectA || !rectB || colA === undefined || colB === undefined) return

    const exit = { x: rectA.x + rectA.width, y: rectA.y + rectA.height / 2 }
    const entry = { x: rectB.x, y: rectB.y + rectB.height / 2 }
    const gap = colB - colA
    let points: { x: number; y: number }[]

    if (gap === 1) {
      // 인접 컬럼 — 두 컬럼 사이 빈 통로(gutter) 한가운데를 수직으로 지나는 단정한
      // 꺾은선. 이 x는 어느 카드의 영역도 아니므로 절대 카드와 겹치지 않는다.
      const midX = rectA.x + rectA.width + COLUMN_GAP / 2
      points = [exit, { x: midX, y: exit.y }, { x: midX, y: entry.y }, entry]
    } else if (gap >= 2) {
      // 2컬럼 이상 스킵(예: 스킬 -> 자격증) — 중간 컬럼 카드를 가로지르지 않도록 전체
      // 콘텐츠 아래 통로로 내려갔다 올라온다.
      const lane = corridorLane
      corridorLane += 1
      const corridorY = maxContentBottom + CORRIDOR_BASE_GAP + lane * CORRIDOR_LANE_STEP
      const ascentX = entry.x - CORRIDOR_ASCENT_SETBACK
      points = [
        exit,
        { x: exit.x, y: corridorY },
        { x: ascentX, y: corridorY },
        { x: ascentX, y: entry.y },
        entry,
      ]
    } else {
      // 같은 컬럼(gap===0) 또는 역방향(gap<0) — 이 데이터 모델에서는 실질적으로
      // 나타나지 않지만(선행 스킬의 depth는 항상 목표보다 작다), 방어적으로 세로
      // 연결에 작은 오른쪽 jog를 줘 카드 테두리를 스치지 않게 한다.
      const jogX = Math.max(rectA.x + rectA.width, rectB.x + rectB.width) + 16
      points = [exit, { x: jogX, y: exit.y }, { x: jogX, y: entry.y }, entry]
    }

    edgePaths.push({ id: e.id, from: e.from, to: e.to, points })
  })

  const corridorHeight = corridorLane > 0
    ? maxContentBottom + CORRIDOR_BASE_GAP + (corridorLane - 1) * CORRIDOR_LANE_STEP + 12
    : 0
  const height = Math.max(maxContentBottom, corridorHeight)

  return { nodes: nodeRects, edges: edgePaths, columns, width, height }
}

// 목업의 orthogonal polyline(라운드 코너) 함수 — 직교 꺾은선의 모서리를 살짝 둥글려
// 시각적으로 부드럽게 만든다.
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
