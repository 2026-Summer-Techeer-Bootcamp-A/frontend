import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'

import { FONT, tooltipStyle } from '../pages/widgets/base'
import conceptRaw from '../data/conceptReal.json'
import { marketApi, type ApiPool } from './api'
import {
  buildConceptSankeyFallback,
  curateConceptSankey,
  type SankeyNode,
  type SankeyPayload,
} from './conceptSankey'
import { buildConceptTreemap, resolveConceptAlternativeData } from './conceptAlternatives'
import {
  CONCEPT_CHART_MODES,
  DEFAULT_CONCEPT_CHART_MODE,
  getConceptChartCopy,
  type ConceptChartMode,
} from './conceptChartMode'
import { SectionHeader } from './kit'
import { ConceptTechSankeyWidget, type PoolChoice } from './wowWidgets'
import './conceptAlternativeCharts.css'

type ConceptSource = {
  label: string
  signature: Array<{ tech: string; n: number }>
}

const CONCEPT_FALLBACK = buildConceptSankeyFallback(
  (conceptRaw as unknown as { concepts: ConceptSource[] }).concepts,
)

const CONCEPT_COLORS = [
  '#6b7c9c',
  '#7f9c86',
  '#8591ad',
  '#a58a6f',
  '#9a8199',
  '#819779',
  '#6f9599',
]

function toApiPool(pool: PoolChoice): ApiPool {
  return pool === 'global' ? 'global' : 'domestic'
}

function useConceptAlternativeData(pool: PoolChoice): SankeyPayload | null {
  const [live, setLive] = useState<SankeyPayload | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setLive(undefined)
    marketApi.conceptTech({ pool: toApiPool(pool), top_concepts: 20, top_techs: 4 })
      .then((response) => {
        if (cancelled) return
        if (!response.links.length) {
          setLive(null)
          return
        }
        const nodes: SankeyNode[] = response.nodes.map((node) => ({
          name: node.name,
          kind: node.type === 'tech' ? 'tech' : 'concept',
        }))
        setLive({ nodes, links: response.links })
      })
      .catch(() => {
        if (!cancelled) setLive(null)
      })

    return () => { cancelled = true }
  }, [pool])

  const selected = resolveConceptAlternativeData(live, CONCEPT_FALLBACK)

  return useMemo(
    () => selected ? curateConceptSankey(selected, CONCEPT_FALLBACK) : null,
    [selected],
  )
}

function ConceptTechTreemapWidget({ pool }: { pool: PoolChoice }) {
  const data = useConceptAlternativeData(pool)
  const treemap = useMemo(() => data
    ? buildConceptTreemap(data).map((concept, index) => ({
        ...concept,
        itemStyle: {
          color: CONCEPT_COLORS[index % CONCEPT_COLORS.length],
          borderColor: CONCEPT_COLORS[index % CONCEPT_COLORS.length],
        },
      }))
    : [], [data])

  const treemapOption = useMemo(() => ({
    animationDuration: 700,
    animationEasing: 'cubicOut',
    tooltip: {
      ...tooltipStyle,
      trigger: 'item',
      formatter: (params: { name: string; value: number; treePathInfo?: Array<{ name: string }> }) => {
        const path = params.treePathInfo ?? []
        const concept = path.length >= 2 ? path[path.length - 2].name : undefined
        return `${concept ? `<b>${concept}</b> → ` : ''}<b>${params.name}</b><br/>공고 ${params.value.toLocaleString()}건`
      },
    },
    series: [{
      type: 'treemap',
      data: treemap,
      left: 8,
      right: 8,
      top: 8,
      bottom: 8,
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      label: {
        show: true,
        formatter: '{b}\n{c}건',
        color: '#35373d',
        fontFamily: FONT,
        fontSize: 10,
        lineHeight: 15,
      },
      upperLabel: {
        show: true,
        height: 26,
        color: '#fff',
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: 700,
      },
      levels: [
        {
          itemStyle: { borderColor: '#fff', borderWidth: 0, gapWidth: 4 },
        },
        {
          color: CONCEPT_COLORS,
          colorMappingBy: 'index',
          itemStyle: { borderColor: '#fff', borderWidth: 4, gapWidth: 2 },
          upperLabel: {
            show: true,
            height: 26,
            color: '#fff',
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 700,
          },
        },
        {
          colorSaturation: [0.18, 0.48],
          itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 1 },
        },
      ],
      emphasis: { itemStyle: { borderColor: '#18181b', borderWidth: 2 } },
    }],
  }), [treemap])

  if (!data) {
    return <div className="concept-chart-loading" role="status">차트 데이터를 불러오는 중…</div>
  }

  return <ReactECharts option={treemapOption} style={{ height: 500 }} notMerge />
}

export default function ConceptAlternativeCharts({ pool }: { pool: PoolChoice }) {
  const [mode, setMode] = useState<ConceptChartMode>(DEFAULT_CONCEPT_CHART_MODE)
  const copy = getConceptChartCopy(mode)

  const chartToggle = (
    <div className="concept-chart-toggle" role="tablist" aria-label="개념 기술 차트 선택">
      {CONCEPT_CHART_MODES.map((option) => {
        const isActive = mode === option.value

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`concept-chart-toggle__button${isActive ? ' is-active' : ''}`}
            onClick={() => setMode(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <section className="dcard">
      <SectionHeader title={copy.title} hint={copy.hint} right={chartToggle} />
      <p className="dmkt2__takeaway">{copy.takeaway}</p>
      {mode === 'sankey'
        ? <ConceptTechSankeyWidget pool={pool} />
        : <ConceptTechTreemapWidget pool={pool} />}
    </section>
  )
}
