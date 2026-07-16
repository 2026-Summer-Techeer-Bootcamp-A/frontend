import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ToolResult, ToolResultKind } from './chatContract'
import { Network, LayoutGrid } from 'lucide-react'

interface AssistantVisualizerProps {
  results: ToolResult[]
  route?: string
}

// 비교 3종은 ComparisonCards가 전담 렌더한다(스펙 4.2) — 아래 어떤 find()도 우연히 집어가지
// 않도록 최상단에서 명시적으로 제외한다.
const COMPARE_KINDS = new Set<ToolResultKind>(['resume_posting', 'posting_posting', 'resume_market'])

type GraphNode = { id: string; root?: boolean }
type GraphEdge = { source: string; target: string; strength: number; hop?: number }
type ChartKind = 'network' | 'heatmap'

const CHART_KIND_LABEL: Record<ChartKind, string> = {
  network: '네트워크 그래프',
  heatmap: '히트맵',
}
const CHART_KIND_ICON: Record<ChartKind, typeof Network> = {
  network: Network,
  heatmap: LayoutGrid,
}

// 헬퍼: metric 문자열("408건", "22.7%")에서 숫자만 추출.
function parseMetricNumber(metric?: string): number {
  if (!metric) return 0
  const m = metric.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
}

// 그래프 데이터 형태를 보고 기본으로 보여줄 차트를 고른다(사용자는 VizBox 탭으로 언제든 바꿀 수 있다).
// 공동출현은 방향성 없는 대칭 관계라 Sankey(흐름 다이어그램)는 애초에 후보에서 뺐다. 이웃끼리도
// 서로 얽힌 촘촘한 메시(2-hop 크로스엣지 존재)는 force 레이아웃이 실 뭉치처럼 엉키므로 모든 쌍의
// 강도를 한눈에 보여주는 히트맵이 낫고, 중심-이웃 단순 스타 구조면 네트워크 그래프가 더 직관적이다.
// 엣지 개수만으로는 판정할 수 없다 — graph_tool이 이웃 2개 이상이면 거의 항상 2-hop 크로스엣지를
// 덧붙여 edges.length가 nodes.length를 넘기 때문에("엣지 < 노드"가 항상 거짓이 되어 늘 히트맵으로
// 빠졌던 과거 버그) hop 필드로 직접 "이웃끼리도 연결됐는지"를 본다.
function pickChartKind(edges: GraphEdge[]): ChartKind {
  const hasCrossLinks = edges.some((e) => e.hop === 2)
  return hasCrossLinks ? 'heatmap' : 'network'
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
// 취약점은 두 곳에 있었다: (a) graphResult 분기는 ToolResult.nodes/edges가 백엔드 계약상
// `Record<string, unknown>[]`(완전 비타입) 인데도 `as unknown as GraphNode[]` / `as any[]`로
// 무검증 캐스팅하고 있었다 — 실제 wire shape가 조금만 달라져도(필드명, null, 잘린 노드) 타입
// 체커는 이를 전혀 잡지 못하고 런타임에만 터진다. (b) 의미 검색(semantic_search) 답변은
// vector_tool이 kind='list'만 반환하고 graph는 아예 안 주므로(backend/app/services/rag/tools/
// vector_tool.py), 화면에 뜨는 "네트워크 그래프"는 실제로 vectorResult 분기가 클라이언트에서
// 합성한 그래프다 — 이 합성 로직도 같은 이름 기반 매칭 규칙을 따르므로 같은 방식으로 깨질 수
// 있어 동일한 방어가 필요하다.
//
// 아래 sanitizeGraphData가 두 분기 모두에서 echarts로 넘기기 직전에 위 세 경우를 걸러 항상
// "링크가 반드시 존재하는 노드만 가리키는" 안전한 shape만 통과시킨다. 정제 후 노드가 하나도
// 안 남으면(전부 malformed) echarts를 아예 마운트하지 않고 빈 상태 문구로 대체한다 — "블랭크
// 박스 + 크래시" 대신 "우아한 빈 상태"가 되도록.
function extractNodeId(n: Record<string, unknown>): string | null {
  if (typeof n.id === 'string' && n.id.trim()) return n.id
  if (typeof n.name === 'string' && n.name.trim()) return n.name
  return null
}

interface RawEdgeLike {
  source: unknown
  target: unknown
  strength: unknown
  hop?: unknown
}

function sanitizeGraphData(rawNodes: Record<string, unknown>[], rawEdges: RawEdgeLike[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
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

function buildNetworkOption(nodes: GraphNode[], edges: GraphEdge[]) {
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
function buildHeatmapOption(nodes: GraphNode[], edges: GraphEdge[]) {
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

const CHART_KINDS: ChartKind[] = ['network', 'heatmap']

// defaultKind는 최초 진입 시 보여줄 값일 뿐, 실제 선택은 탭으로 사용자가 직접 바꾼다.
function VizBox({ title, defaultKind, nodes, edges, height }: { title: string; defaultKind: ChartKind; nodes: GraphNode[]; edges: GraphEdge[]; height: number }) {
  const [kind, setKind] = useState<ChartKind>(defaultKind)
  const option = kind === 'heatmap' ? buildHeatmapOption(nodes, edges) : buildNetworkOption(nodes, edges)

  return (
    <div className="rc__viz-box">
      <div className="rc__viz-header">
        <span className="rc__viz-title">{title}</span>
        <div className="rc__seg rc__viz-tabs" role="group" aria-label="시각화 종류 전환">
          {CHART_KINDS.map((k) => {
            const Icon = CHART_KIND_ICON[k]
            return (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
                <Icon size={12} /> {CHART_KIND_LABEL[k]}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rc__viz-chart-wrap">
        {/* 네트워크(graph)와 히트맵은 series 구조 자체가 달라 echarts가 이전 옵션을 그대로 merge하면
            내부 dataIndex 매핑이 깨져 크래시가 난다(vendor-echarts getRawIndex 에러). kind별로 key를
            달리 줘 탭 전환·도구 결과 스트리밍 갱신 양쪽 모두 항상 새 인스턴스로 깨끗하게 그린다. */}
        <ReactECharts key={kind} option={option} notMerge style={{ height }} />
      </div>
    </div>
  )
}

export default function AssistantVisualizer({ results, route }: AssistantVisualizerProps) {
  const vizResults = results.filter((r) => !COMPARE_KINDS.has(r.kind))
  const graphResult = vizResults.find((r) => r.kind === 'graph')
  const vectorResult = vizResults.find((r) => r.kind === 'list' && (r.label.includes('유사') || r.label.includes('유사도')))
  const listResult = vizResults.find(
    (r) => (r.kind === 'list' || r.kind === 'compare') && !r.label.includes('유사') && !r.label.includes('유사도'),
  )

  if (graphResult) {
    const rawEdges = (graphResult.edges as unknown as RawEdgeLike[]) ?? []
    const { nodes, edges } = sanitizeGraphData(graphResult.nodes, rawEdges)
    if (nodes.length === 0) {
      return (
        <div className="rc__viz-box" key="graph">
          <div className="rc__viz-header"><span className="rc__viz-title">{graphResult.label}</span></div>
          <div className="rc__empty">표시할 관계 데이터가 없어요.</div>
        </div>
      )
    }
    return <VizBox key="graph" title={graphResult.label} defaultKind={pickChartKind(edges)} nodes={nodes} edges={edges} height={260} />
  }

  if (vectorResult) {
    // 유사도 결과는 항상 "검색어/이력서 1개 → 결과 N개"로 뻗어나가는 단순 스타 구조라 기본값은 네트워크가 맞지만,
    // 이 역시 VizBox 탭으로 히트맵으로 바꿔 볼 수 있다. 이 그래프는 backend가 주는 게 아니라 items[]에서
    // 클라이언트가 합성한 것이라(vector_tool은 kind='list'만 반환) 노드 이름이 곧 posting label 문자열인데,
    // 그래도 이름 충돌/빈 문자열 방어는 동일하게 필요해 sanitizeGraphData를 그대로 통과시킨다.
    const centerNodeName = route === 'vector' ? '내 이력서' : '검색어'
    const rawNodes: Record<string, unknown>[] = [{ id: centerNodeName, root: true }, ...vectorResult.items.map((it) => ({ id: it.name }))]
    const rawEdges: RawEdgeLike[] = vectorResult.items.map((it) => ({ source: centerNodeName, target: it.name, strength: it.pct ?? 50 }))
    const { nodes, edges } = sanitizeGraphData(rawNodes, rawEdges)
    if (nodes.length <= 1) {
      // 중심 노드 하나만 남거나(유사 결과 이름이 전부 비었거나 중심과 겹침) 아예 비면 점 하나짜리
      // 네트워크는 정보가 없으므로 그래프 대신 안내만 보여준다.
      return (
        <div className="rc__viz-box" key="vector">
          <div className="rc__viz-header"><span className="rc__viz-title">{vectorResult.label} (유사도 분포)</span></div>
          <div className="rc__empty">표시할 유사 공고 관계가 없어요.</div>
        </div>
      )
    }
    return <VizBox key="vector" title={`${vectorResult.label} (유사도 분포)`} defaultKind="network" nodes={nodes} edges={edges} height={260} />
  }

  // fallback list charts (like top rankings)
  if (listResult) {
    const dataVals = listResult.items.map((i) => i.pct ?? parseMetricNumber(i.metric)).reverse()
    const option = {
      grid: { left: 10, right: 30, top: 15, bottom: 10, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => `${params[0].name}: <b>${params[0].value}%</b>`,
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#eef1f6' } },
        axisLabel: { color: '#7c7f88', fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: listResult.items.map((i) => i.name).reverse(),
        axisLine: { lineStyle: { color: '#e2e5ec' } },
        axisTick: { show: false },
        axisLabel: { color: '#43454c', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          barWidth: '54%',
          data: dataVals,
          itemStyle: { color: '#0b0b0c', borderRadius: [0, 4, 4, 0] },
        },
      ],
    }

    return (
      <div className="rc__viz-box" key="list">
        <div className="rc__viz-header">
          <span className="rc__viz-title">{listResult.label}</span>
        </div>
        <div className="rc__viz-chart-wrap">
          <ReactECharts key="list" option={option} notMerge style={{ height: 220 }} />
        </div>
      </div>
    )
  }

  return null
}
