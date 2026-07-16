// 공동출현(cooccurrence) 그래프 전용 — kind==='graph'일 때만 쓰인다(스펙 §3.1, 회귀 방지 대상).
// AssistantVisualizer.tsx에 있던 sanitizeGraphData/buildNetworkOption/buildHeatmapOption을
// 그대로(로직 변경 없이) 옮겨온 것 — 그래프 크래시 방어 코드라 회귀 위험이 커서 손대지 않는다.

import type { EChartsOption } from 'echarts'

export type GraphNode = { id: string; root?: boolean }
export type GraphEdge = { source: string; target: string; strength: number; hop?: number }

export interface RawEdgeLike {
  source: unknown
  target: unknown
  strength: unknown
  hop?: unknown
}

// === 그래프 크래시 방어(데모 크리티컬 버그 픽스) ===============================
// 근본 원인: echarts의 graph 시리즈는 links[].source/target을 data[].name과 "문자열 이름"으로
// 매칭해 노드를 찾는다(카테고리 인덱스 모드를 쓰지 않는 한). 이 매칭이 실패하는 경우 —
//   1) 링크가 가리키는 이름이 nodes 목록에 아예 없을 때(예: 백엔드가 nodes는 top-N으로 자르고
//      edges는 자르지 않아 잘린 노드를 여전히 가리킬 때, 혹은 이름에 공백/대소문자 차이가 있을 때),
//   2) 노드 이름이 비어있거나(undefined) 중복될 때(이름 → 인덱스 매핑이 꼬임),
//   3) source === target인 셀프 루프,
// 이 세 경우 모두 echarts 내부에서 링크의 node1/node2 조회 결과가 undefined가 되는데, 이후 코드가
// 그 undefined 객체에 무조건 `.dataIndex = ...`를 대입하려다 그대로
//   TypeError: Cannot set properties of undefined (setting 'dataIndex')
// 로 죽는다. 화면은 아무것도 못 그린 채(에러가 렌더 도중 던져짐) 빈 박스만 남는다.
//
// ToolResult.nodes/edges는 백엔드 계약상 Record<string, unknown>[](완전 비타입)이라 실제 wire
// shape가 조금만 달라져도(필드명, null, 잘린 노드) 타입 체커는 이를 전혀 잡지 못하고 런타임에만
// 터진다. 아래 sanitizeGraphData가 echarts로 넘기기 직전에 위 세 경우를 걸러 항상 "링크가 반드시
// 존재하는 노드만 가리키는" 안전한 shape만 통과시킨다. 정제 후 노드가 하나도 안 남으면(전부
// malformed) echarts를 아예 마운트하지 않고 빈 상태 문구로 대체한다.
function extractNodeId(n: Record<string, unknown>): string | null {
  if (typeof n.id === 'string' && n.id.trim()) return n.id
  if (typeof n.name === 'string' && n.name.trim()) return n.name
  return null
}

export function sanitizeGraphData(
  rawNodes: Record<string, unknown>[],
  rawEdges: RawEdgeLike[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const seen = new Set<string>()
  const nodes: GraphNode[] = []
  for (const n of rawNodes) {
    const id = extractNodeId(n)
    if (id === null || seen.has(id)) continue // 이름 없음/중복 — 이름 기반 매칭이 꼬이는 직접 원인이라 드롭
    seen.add(id)
    nodes.push({ id, root: n.root === true })
  }

  const edges: GraphEdge[] = []
  for (const e of rawEdges) {
    const source = typeof e.source === 'string' ? e.source : null
    const target = typeof e.target === 'string' ? e.target : null
    if (!source || !target) continue
    if (source === target) continue // 셀프 루프 배제
    if (!seen.has(source) || !seen.has(target)) continue // nodes에 없는 이름을 가리키는 링크 — 크래시의 직접 원인
    edges.push({
      source,
      target,
      strength: typeof e.strength === 'number' ? e.strength : 0,
      hop: typeof e.hop === 'number' ? e.hop : undefined,
    })
  }

  return { nodes, edges }
}

export function buildNetworkOption(nodes: GraphNode[], edges: GraphEdge[]): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>가중치(강도): <b>${params.data.value}%</b>`
        }
        return `요소: <b>${params.name}</b>`
      },
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        animation: true,
        draggable: true,
        force: { repulsion: 180, edgeLength: [70, 110], gravity: 0.08 },
        roam: true,
        label: { show: true, position: 'right', formatter: '{b}', fontSize: 11, color: '#1c1d21', fontWeight: 600 },
        data: nodes.map((n) => ({
          name: n.id,
          symbolSize: n.root ? 32 : 18,
          itemStyle: {
            color: n.root ? '#0b0b0c' : '#8fb0e2',
            borderColor: n.root ? '#0b0b0c' : '#bcd0f0',
            borderWidth: 2,
          },
        })),
        links: edges.map((e) => ({
          source: e.source,
          target: e.target,
          value: e.strength,
          lineStyle: { width: Math.max(1.5, (e.strength / 100) * 8), color: '#bcd0f0', curveness: 0.05 },
        })),
      },
    ],
  }
}

// 노드 N개 × N개의 대칭 강도 행렬로 펼쳐 보여준다 — 메시 구조에서도 모든 쌍의 관계를 놓치지 않는다.
export function buildHeatmapOption(nodes: GraphNode[], edges: GraphEdge[]): EChartsOption {
  const names = nodes.map((n) => n.id)
  const indexOf = new Map(names.map((name, i) => [name, i]))
  const matrix: number[][] = names.map(() => names.map(() => 0))
  edges.forEach((e) => {
    const si = indexOf.get(e.source)
    const ti = indexOf.get(e.target)
    if (si === undefined || ti === undefined) return
    matrix[si][ti] = e.strength
    matrix[ti][si] = e.strength
  })

  const data: [number, number, number][] = []
  names.forEach((_, i) => {
    names.forEach((_, j) => {
      if (i === j) return // 자기 자신과의 관계는 의미가 없어 비운다
      data.push([i, j, matrix[i][j]])
    })
  })

  return {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const [x, y, v] = params.data as [number, number, number]
        return v
          ? `${names[x]} · ${names[y]}<br/>가중치(강도): <b>${v}%</b>`
          : `${names[x]} · ${names[y]}<br/>공동출현 없음`
      },
    },
    grid: { left: 88, right: 16, top: 8, bottom: 56, containLabel: false },
    xAxis: { type: 'category', data: names, axisLabel: { rotate: 40, fontSize: 10, color: '#5b5e66' }, splitArea: { show: true } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 10, color: '#5b5e66' }, splitArea: { show: true } },
    visualMap: { min: 0, max: 100, show: false, inRange: { color: ['#f6f8fc', '#8fb0e2', '#0b0b0c'] } },
    series: [
      {
        type: 'heatmap',
        data,
        label: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.15)' } },
      },
    ],
  }
}
