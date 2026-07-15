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
import { buildConceptHeatmap, buildConceptTreemap } from './conceptAlternatives'
import { SectionHeader } from './kit'
import type { PoolChoice } from './wowWidgets'
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

function useConceptAlternativeData(pool: PoolChoice): SankeyPayload {
  const [live, setLive] = useState<SankeyPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    setLive(null)
    marketApi.conceptTech({ pool: toApiPool(pool), top_concepts: 20, top_techs: 4 })
      .then((response) => {
        if (cancelled || !response.links.length) return
        const nodes: SankeyNode[] = response.nodes.map((node) => ({
          name: node.name,
          kind: node.type === 'tech' ? 'tech' : 'concept',
        }))
        setLive({ nodes, links: response.links })
      })
      .catch(() => undefined)

    return () => { cancelled = true }
  }, [pool])

  return useMemo(
    () => curateConceptSankey(live ?? CONCEPT_FALLBACK, CONCEPT_FALLBACK),
    [live],
  )
}

export default function ConceptAlternativeCharts({ pool }: { pool: PoolChoice }) {
  const data = useConceptAlternativeData(pool)
  const heatmap = useMemo(() => buildConceptHeatmap(data), [data])
  const treemap = useMemo(() => buildConceptTreemap(data), [data])

  const heatmapOption = useMemo(() => ({
    animationDuration: 600,
    animationEasing: 'cubicOut',
    grid: { left: 138, right: 22, top: 68, bottom: 82 },
    tooltip: {
      ...tooltipStyle,
      position: 'top',
      formatter: (params: { data: [number, number, number] }) => {
        const [techIndex, conceptIndex, value] = params.data
        return `<b>${heatmap.concepts[conceptIndex]}</b> → <b>${heatmap.techs[techIndex]}</b><br/>공고 ${value.toLocaleString()}건`
      },
    },
    xAxis: {
      type: 'category',
      data: heatmap.techs,
      position: 'top',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { interval: 0, rotate: 42, color: '#5f626a', fontFamily: FONT, fontSize: 10 },
      splitArea: { show: true, areaStyle: { color: ['#fff'] } },
    },
    yAxis: {
      type: 'category',
      data: heatmap.concepts,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#43454c', fontFamily: FONT, fontSize: 11, fontWeight: 700 },
      splitArea: { show: true, areaStyle: { color: ['#fff'] } },
    },
    visualMap: {
      min: 0,
      max: Math.max(1, heatmap.maxValue),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      text: ['많음', '적음'],
      textStyle: { color: '#7c7f88', fontFamily: FONT, fontSize: 10 },
      inRange: { color: ['#f3f5f8', '#c8d1e0', '#6b7c9c'] },
    },
    series: [{
      type: 'heatmap',
      data: heatmap.cells,
      emphasis: { itemStyle: { borderColor: '#18181b', borderWidth: 1.5 } },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
    }],
  }), [heatmap])

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

  return (
    <>
      <div className="dmkt2__card-item dmkt2__concept-alt-item dmkt2__card-item--r5">
        <section className="dcard">
          <SectionHeader title="개념 → 기술 연관도 히트맵" hint="ECharts heatmap · posting_concept 실측" />
          <p className="dmkt2__takeaway">색이 진할수록 함께 등장한 공고가 많아요 — <b>공통 기술과 빈도를 한눈에 비교</b>.</p>
          <ReactECharts option={heatmapOption} style={{ height: 430 }} notMerge />
        </section>
      </div>

      <div className="dmkt2__card-item dmkt2__concept-alt-item dmkt2__card-item--r5">
        <section className="dcard">
          <SectionHeader title="개념 → 기술 Treemap" hint="ECharts treemap · posting_concept 실측" />
          <p className="dmkt2__takeaway">큰 영역은 개념, 내부 사각형은 기술 — <b>면적이 클수록 함께 등장한 공고가 많아요</b>.</p>
          <ReactECharts option={treemapOption} style={{ height: 430 }} notMerge />
        </section>
      </div>
    </>
  )
}
