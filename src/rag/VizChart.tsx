import { memo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { Viz } from './demoScenarios'

// 슬레이트 블루 단일 액센트 + 쿨 그레이. 순회 서브그래프 대신 시나리오별 정적 차트를 담담히 보여준다.
const ACCENT = '#2f61b8'
const SERIES = [ACCENT, '#8fb0e2', '#bcd0f0', '#dde8f9']
const GRID = '#eef1f6'
const AXIS = '#e2e5ec'
const MUTED = '#7c7f88'

function buildOption(v: Viz): EChartsOption {
  const base: EChartsOption = { textStyle: { fontFamily: 'Pretendard, sans-serif' } }
  const grid = { left: 6, right: 14, top: 18, bottom: 6, containLabel: true }

  switch (v.kind) {
    case 'line':
      return {
        ...base, grid, tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: v.points.map((p) => p.x), boundaryGap: false,
          axisLine: { lineStyle: { color: AXIS } }, axisTick: { show: false }, axisLabel: { color: MUTED, fontSize: 10 } },
        yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED, fontSize: 10 } },
        series: [{ type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: v.points.map((p) => p.y),
          lineStyle: { color: ACCENT, width: 2.4 }, itemStyle: { color: ACCENT },
          areaStyle: { color: 'rgba(47,97,184,0.08)' } }],
      }
    case 'bar':
      return {
        ...base, grid, tooltip: { trigger: 'axis' },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED, fontSize: 10 } },
        yAxis: { type: 'category', data: v.items.map((i) => i.name).reverse(),
          axisLine: { lineStyle: { color: AXIS } }, axisTick: { show: false }, axisLabel: { color: '#43454c', fontSize: 11 } },
        series: [{ type: 'bar', barWidth: '54%', data: v.items.map((i) => i.value).reverse(),
          itemStyle: { color: ACCENT, borderRadius: [0, 4, 4, 0] } }],
      }
    case 'radar':
      return {
        ...base, radar: { indicator: v.indicators, radius: '66%',
          splitLine: { lineStyle: { color: AXIS } }, axisLine: { lineStyle: { color: AXIS } },
          splitArea: { show: false }, axisName: { color: MUTED, fontSize: 10 } },
        series: [{ type: 'radar', data: [{ value: v.values,
          areaStyle: { color: 'rgba(47,97,184,0.14)' }, lineStyle: { color: ACCENT }, itemStyle: { color: ACCENT } }] }],
      }
    case 'donut':
      return {
        ...base, tooltip: { trigger: 'item' },
        series: [{ type: 'pie', radius: ['52%', '76%'], center: ['50%', '50%'], avoidLabelOverlap: true,
          data: v.items.map((i, idx) => ({ name: i.name, value: i.value, itemStyle: { color: SERIES[idx % SERIES.length] } })),
          label: { color: MUTED, fontSize: 10 }, labelLine: { lineStyle: { color: AXIS } } }],
      }
    case 'grouped':
      return {
        ...base, grid, tooltip: { trigger: 'axis' }, legend: { top: 0, textStyle: { color: MUTED, fontSize: 10 } },
        xAxis: { type: 'category', data: v.categories,
          axisLine: { lineStyle: { color: AXIS } }, axisTick: { show: false }, axisLabel: { color: '#43454c', fontSize: 11 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED, fontSize: 10 } },
        series: v.series.map((s, idx) => ({ name: s.name, type: 'bar', barWidth: '30%', data: s.values,
          itemStyle: { color: SERIES[idx % SERIES.length], borderRadius: [3, 3, 0, 0] } })),
      }
  }
}

// memo: 답변이 페이드로 나타나며 부모가 여러 번 re-render돼도 차트는 다시 그려지지 않는다.
function VizChart({ viz }: { viz: Viz }) {
  return <ReactECharts option={buildOption(viz)} style={{ height: 208 }} notMerge lazyUpdate />
}

export default memo(VizChart)
