import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { ToolResult } from './chatContract'
import { Network, GitFork } from 'lucide-react'

interface AssistantVisualizerProps {
  results: ToolResult[]
  route?: string
}

// 헬퍼: metric 문자열("408건", "22.7%")에서 숫자만 추출.
function parseMetricNumber(metric?: string): number {
  if (!metric) return 0
  const m = metric.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
}

export default function AssistantVisualizer({ results, route }: AssistantVisualizerProps) {
  // Find graph or vector results
  const graphResult = results.find((r) => r.kind === 'graph')
  const vectorResult = results.find((r) => r.kind === 'list' && (r.label.includes('유사') || r.label.includes('유사도')))
  const listResult = results.find(
    (r) => (r.kind === 'list' || r.kind === 'compare') && !r.label.includes('유사') && !r.label.includes('유사도'),
  )

  const [vizType, setVizType] = useState<'network' | 'sankey'>('network')

  // ECharts Network Graph Option
  const buildNetworkOption = (nodes: any[], edges: any[], label: string) => {
    return {
      title: {
        text: label,
        textStyle: { fontSize: 12, color: '#5b5e66', fontWeight: 'bold', fontFamily: 'Pretendard, sans-serif' },
        left: 0,
        top: 0,
      },
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
          force: {
            repulsion: 180,
            edgeLength: [70, 110],
            gravity: 0.08,
          },
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
            fontSize: 11,
            color: '#1c1d21',
            fontWeight: 600,
          },
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
            lineStyle: {
              width: Math.max(1.5, (e.strength / 100) * 8),
              color: '#bcd0f0',
              curveness: 0.05,
            },
          })),
        },
      ],
    }
  }

  // ECharts Sankey Diagram Option
  const buildSankeyOption = (nodes: any[], edges: any[], label: string) => {
    const sankeyNodes = nodes.map((n) => ({
      name: n.id,
      itemStyle: { color: n.root ? '#0b0b0c' : '#8fb0e2' },
    }))
    const sankeyLinks = edges.map((e) => ({
      source: e.source,
      target: e.target,
      value: Math.max(1, e.strength),
    }))

    return {
      title: {
        text: label,
        textStyle: { fontSize: 12, color: '#5b5e66', fontWeight: 'bold', fontFamily: 'Pretendard, sans-serif' },
        left: 0,
        top: 0,
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            return `${params.data.source} → ${params.data.target}<br/>가중치: <b>${params.data.value}%</b>`
          }
          return `요소: <b>${params.name}</b>`
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: { focus: 'adjacency' },
          nodeAlign: 'left',
          nodeGap: 12,
          nodeWidth: 16,
          itemStyle: {
            borderWidth: 1,
            borderColor: '#e2e5ec',
          },
          lineStyle: {
            color: 'source',
            opacity: 0.25,
            curveness: 0.45,
          },
          label: {
            color: '#1c1d21',
            fontSize: 11,
            fontWeight: 600,
            position: 'right',
          },
          data: sankeyNodes,
          links: sankeyLinks,
        },
      ],
    }
  }

  if (graphResult) {
    const nodes = graphResult.nodes
    const edges = graphResult.edges

    return (
      <div className="rc__viz-box">
        <div className="rc__viz-header">
          <span className="rc__viz-title">{graphResult.label}</span>
          <div className="rc__viz-tabs">
            <button
              type="button"
              className={`rc__viz-tab ${vizType === 'network' ? 'active' : ''}`}
              onClick={() => setVizType('network')}
            >
              <Network size={12} /> 네트워크 그래프
            </button>
            <button
              type="button"
              className={`rc__viz-tab ${vizType === 'sankey' ? 'active' : ''}`}
              onClick={() => setVizType('sankey')}
            >
              <GitFork size={12} style={{ transform: 'rotate(90deg)' }} /> Sankey 다이어그램
            </button>
          </div>
        </div>
        <div className="rc__viz-chart-wrap">
          {vizType === 'network' ? (
            <ReactECharts option={buildNetworkOption(nodes, edges, '')} style={{ height: 260 }} />
          ) : (
            <ReactECharts option={buildSankeyOption(nodes, edges, '')} style={{ height: 260 }} />
          )}
        </div>
      </div>
    )
  }

  if (vectorResult) {
    // Generate nodes and edges dynamically for vector results
    const centerNodeName = route === 'vector' ? '내 이력서' : '검색어';
    const nodes = [
      { id: centerNodeName, root: true },
      ...vectorResult.items.map((it) => ({ id: it.name, root: false })),
    ]
    const edges = vectorResult.items.map((it) => ({
      source: centerNodeName,
      target: it.name,
      strength: it.pct ?? 50,
    }))

    return (
      <div className="rc__viz-box">
        <div className="rc__viz-header">
          <span className="rc__viz-title">{vectorResult.label} (유사도 분포)</span>
          <div className="rc__viz-tabs">
            <button
              type="button"
              className={`rc__viz-tab ${vizType === 'network' ? 'active' : ''}`}
              onClick={() => setVizType('network')}
            >
              <Network size={12} /> 네트워크 그래프
            </button>
            <button
              type="button"
              className={`rc__viz-tab ${vizType === 'sankey' ? 'active' : ''}`}
              onClick={() => setVizType('sankey')}
            >
              <GitFork size={12} style={{ transform: 'rotate(90deg)' }} /> Sankey 다이어그램
            </button>
          </div>
        </div>
        <div className="rc__viz-chart-wrap">
          {vizType === 'network' ? (
            <ReactECharts option={buildNetworkOption(nodes, edges, '')} style={{ height: 260 }} />
          ) : (
            <ReactECharts option={buildSankeyOption(nodes, edges, '')} style={{ height: 260 }} />
          )}
        </div>
      </div>
    )
  }

  // fallback list charts (like top rankings)
  if (listResult) {
    const dataVals = listResult.items.map((i) => i.pct ?? parseMetricNumber(i.metric)).reverse()
    const option = {
      grid: { left: 10, right: 30, top: 15, bottom: 10, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => `${params[0].name}: <b>${params[0].value}%</b>`
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
      <div className="rc__viz-box">
        <div className="rc__viz-header">
          <span className="rc__viz-title">{listResult.label}</span>
        </div>
        <div className="rc__viz-chart-wrap">
          <ReactECharts option={option} style={{ height: 220 }} />
        </div>
      </div>
    )
  }

  return null
}
