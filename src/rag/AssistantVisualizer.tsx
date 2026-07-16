import { useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, Gauge, LayoutGrid, Map, Network, TrendingUp } from 'lucide-react'
import type { ToolResult } from './chatContract'
import type { ChartSpec, ChartType } from './vizSelect'
import { COMPARE_KINDS, isGapResult, isSimilarityResult, selectChart } from './vizSelect'
import { buildHeatmapOption, buildNetworkOption, sanitizeGraphData } from './viz/graphOptions'
import type { RawEdgeLike } from './viz/graphOptions'
import {
  comparisonBarOption,
  lineOption,
  parseMetricNumber,
  rankedBarOption,
  regionBarOption,
  treemapOption,
} from './viz/echartsOptions'
import { EChart } from './viz/EChart'
import DemandBars from './viz/DemandBars'
import CoverageRing from './viz/CoverageRing'

interface AssistantVisualizerProps {
  results: ToolResult[]
  route?: string
}

// 세그먼트 토글에 쓰는 라벨·아이콘 — primary/toggle 쌍으로만 등장하므로 실제 조합은
// (network, heatmap) · (regionBar, treemap) · (demandBar, gaugeRing) · (line, rankedBar) 뿐이다.
const TYPE_LABEL: Partial<Record<ChartType, string>> = {
  network: '네트워크 그래프',
  heatmap: '히트맵',
  regionBar: '지역별 바',
  treemap: '구성비',
  demandBar: '수요 막대',
  gaugeRing: '커버리지 링',
  rankedBar: '랭킹 바',
  line: '추세',
}
const TYPE_ICON: Partial<Record<ChartType, typeof Network>> = {
  network: Network,
  heatmap: LayoutGrid,
  regionBar: Map,
  treemap: LayoutGrid,
  demandBar: BarChart3,
  gaugeRing: Gauge,
  rankedBar: BarChart3,
  line: TrendingUp,
}

function SegToggle({ options, value, onChange }: { options: ChartType[]; value: ChartType; onChange: (v: ChartType) => void }) {
  return (
    <div className="rc__seg rc__viz-tabs" role="group" aria-label="시각화 종류 전환">
      {options.map((t) => {
        const Icon = TYPE_ICON[t]
        return (
          <button key={t} type="button" aria-pressed={value === t} onClick={() => onChange(t)}>
            {Icon && <Icon size={12} />} {TYPE_LABEL[t] ?? t}
          </button>
        )
      })}
    </div>
  )
}

function VizFrame({ title, spec, kind, onKindChange, children }: {
  title: string
  spec: ChartSpec
  kind: ChartType
  onKindChange: (k: ChartType) => void
  children: ReactNode
}) {
  return (
    <div className="rc__viz-box">
      <div className="rc__viz-header">
        <span className="rc__viz-title">{title}</span>
        {spec.toggle && <SegToggle options={[spec.primary, spec.toggle]} value={kind} onChange={onKindChange} />}
      </div>
      <div className="rc__viz-chart-wrap">{children}</div>
    </div>
  )
}

// spec.primary(+toggle)에 따라 실제 렌더 컴포넌트를 고르는 디스패처. graph↔heatmap은 기존 방어
// 로직(sanitizeGraphData)을 그대로 통과시키고, 나머지는 echartsOptions.ts 빌더 + EChart 래퍼를 쓴다.
// list kind의 hasOwnedEncoding(demandBar)은 CoverageRing/DemandBars(d3)를 재사용해 신규 echarts가
// 필요 없다(스펙 §3.1 핵심 포인트).
function ChartHost({ result, spec }: { result: ToolResult; spec: ChartSpec }) {
  const [kind, setKind] = useState<ChartType>(spec.primary)

  if (kind === 'network' || kind === 'heatmap') {
    const rawEdges = (result.edges as unknown as RawEdgeLike[]) ?? []
    const { nodes, edges } = sanitizeGraphData(result.nodes, rawEdges)
    if (nodes.length === 0) {
      return (
        <div className="rc__viz-box">
          <div className="rc__viz-header"><span className="rc__viz-title">{result.label}</span></div>
          <div className="rc__empty">표시할 관계 데이터가 없어요.</div>
        </div>
      )
    }
    const option = kind === 'heatmap' ? buildHeatmapOption(nodes, edges) : buildNetworkOption(nodes, edges)
    return (
      <VizFrame title={result.label} spec={spec} kind={kind} onKindChange={setKind}>
        {/* 네트워크(graph)와 히트맵은 series 구조 자체가 달라 echarts가 이전 옵션을 그대로 merge하면
            내부 dataIndex 매핑이 깨져 크래시가 난다. kind별로 key를 달리 줘 항상 새 인스턴스로 그린다. */}
        <div key={kind}>
          <EChart option={option} height={spec.height} />
        </div>
      </VizFrame>
    )
  }

  if (kind === 'regionBar' || kind === 'treemap') {
    const option = kind === 'treemap' ? treemapOption(result.items) : regionBarOption(result.items)
    return (
      <VizFrame title={result.label} spec={spec} kind={kind} onKindChange={setKind}>
        <EChart key={kind} option={option} height={spec.height} />
      </VizFrame>
    )
  }

  if (kind === 'demandBar' || kind === 'gaugeRing') {
    if (kind === 'gaugeRing') {
      const ownedCount = result.items.filter((i) => i.metric === '보유').length
      const totalCount = result.items.length
      const score = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0
      return (
        <VizFrame title={result.label} spec={spec} kind={kind} onKindChange={setKind}>
          <CoverageRing score={score} ownedCount={ownedCount} totalCount={totalCount} />
        </VizFrame>
      )
    }
    const bars = result.items.map((i) => ({
      canonical: i.name,
      share: (i.pct ?? parseMetricNumber(i.metric)) / 100,
      owned: i.metric === '보유',
    }))
    return (
      <VizFrame title={result.label} spec={spec} kind={kind} onKindChange={setKind}>
        <DemandBars items={bars} />
      </VizFrame>
    )
  }

  if (kind === 'comparisonBar') {
    return (
      <VizFrame title={result.label} spec={spec} kind={kind} onKindChange={setKind}>
        <EChart option={comparisonBarOption(result.items)} height={spec.height} />
      </VizFrame>
    )
  }

  if (kind === 'line') {
    const points = result.items.map((i) => ({ x: i.name, y: i.pct ?? parseMetricNumber(i.metric) }))
    return (
      <VizFrame title={result.label} spec={spec} kind={kind} onKindChange={setKind}>
        <EChart option={lineOption(points)} height={spec.height} />
      </VizFrame>
    )
  }

  if (kind === 'bigStat') {
    const pct = result.items[0]?.pct
    return (
      <div className="rc__viz-box">
        <div className="rc__viz-header"><span className="rc__viz-title">{result.label}</span></div>
        <div className="rc__stat">
          <span className="rc__stat-big">{result.value}</span>
          {result.unit && <span className="rc__stat-unit">{result.unit}</span>}
        </div>
        {pct !== undefined && (
          <div className="rc__mc-row">
            <span className="rc__mc-label">전체 대비</span>
            <span className="rc__mc-track"><span className="rc__mc-fill" style={{ width: `${Math.min(100, pct)}%` }} /></span>
            <span className="rc__mc-val">{pct}%</span>
          </div>
        )}
      </div>
    )
  }

  // rankedBar (기본 fallback) — semantic_search(유사도) · skill/cert/concept 랭킹 · resume_gap이
  // 전부 여기로 온다. "의미 검색 결과를 방사형 네트워크로 강제"하던 이전 오매핑이 사라진 자리다:
  // 관계를 합성하지 않고 유사도/비율순 랭킹 그대로를 가로 막대로 보여준다.
  const option = rankedBarOption(result.items, { similarity: isSimilarityResult(result), gap: isGapResult(result) })
  return (
    <VizFrame title={result.label} spec={spec} kind={kind} onKindChange={setKind}>
      <EChart option={option} height={spec.height} />
    </VizFrame>
  )
}

export default function AssistantVisualizer({ results }: AssistantVisualizerProps) {
  // 비교 3종(resume_posting/posting_posting/resume_market)은 ComparisonCards가 전담 렌더한다
  // (selectChart도 이들에 대해 null을 반환하지만, 여기서도 한 번 더 명시적으로 걸러 우연히
  // 다른 분기에 걸리지 않게 한다).
  const vizResults = results.filter((r) => !COMPARE_KINDS.has(r.kind))

  // 첫 번째로 차트가 선택되는 결과 하나만 렌더한다(기존 동작과 동일 — 턴마다 대표 시각화 1개).
  for (const r of vizResults) {
    const spec = selectChart(r)
    if (spec) return <ChartHost key={`${r.kind}-${r.label}`} result={r} spec={spec} />
  }
  return null
}
