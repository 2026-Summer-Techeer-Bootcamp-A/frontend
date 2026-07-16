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

const TREEMAP_HOVER_ONLY_CONCEPTS = new Set([
  '실시간·스트리밍',
  '보안·컴플라이언스',
  'MSA·분산',
])

const TREEMAP_CONCEPT_BACKGROUNDS: Record<string, string> = {
  '대규모 트래픽': '#edf3fa',
  '데이터 파이프라인': '#f6eef5',
  '클라우드 네이티브': '#f1f5e9',
  'DevOps·자동화': '#edf7f7',
  '실시간·스트리밍': '#eef1fb',
  '보안·컴플라이언스': '#fbf3e8',
  'MSA·분산': '#eef2f7',
}

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
    ? buildConceptTreemap(data).map((concept) => {
        const backgroundColor = TREEMAP_CONCEPT_BACKGROUNDS[concept.name] ?? '#f4f5f7'
        const hoverOnly = TREEMAP_HOVER_ONLY_CONCEPTS.has(concept.name)

        return {
          ...concept,
          itemStyle: {
            borderColor: backgroundColor,
            borderWidth: 7,
            gapWidth: 3,
          },
          emphasis: {
            itemStyle: {
              borderColor: backgroundColor,
              borderWidth: 7,
            },
            ...(hoverOnly ? {
              upperLabel: {
                show: true,
                color: '#43454c',
              },
            } : {}),
          },
          ...(hoverOnly ? {
            upperLabel: {
              show: true,
              color: 'rgba(67, 69, 76, 0)',
            },
          } : {}),
        }
      })
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
        formatter: '{b}',
        height: 22,
        color: '#43454c',
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 700,
        align: 'left',
        verticalAlign: 'middle',
        padding: [0, 8],
        overflow: 'truncate',
        ellipsis: '…',
      },
      levels: [
        {
          itemStyle: { borderColor: '#fff', borderWidth: 0, gapWidth: 8 },
        },
        {
          color: CONCEPT_COLORS,
          colorMappingBy: 'index',
          itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 3 },
          upperLabel: {
            show: true,
            formatter: '{b}',
            height: 22,
            color: '#43454c',
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 700,
            align: 'left',
            verticalAlign: 'middle',
            padding: [0, 8],
            overflow: 'truncate',
            ellipsis: '…',
          },
        },
        {
          colorSaturation: [0.18, 0.48],
          itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 1 },
        },
      ],
      emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 3 } },
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
