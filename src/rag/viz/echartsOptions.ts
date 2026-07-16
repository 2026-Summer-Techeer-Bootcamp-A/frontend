// echarts 옵션 빌더 모음 — 순수 함수 (result/items) → EChartsOption. 렌더는 EChart.tsx가 담당.
// 스펙(adaptive-viz-spec.md) §3.2를 그대로 구현한다. echarts-for-react가 full echarts 번들을
// import하므로(§3.3 확인 완료 — heatmap/graph가 이미 등록 없이 렌더되고 있었다) sankey/treemap/
// scatter/gauge도 추가 echarts.use([...]) 등록 없이 바로 동작한다.

import type { EChartsOption } from 'echarts'
import type { ToolResultItem } from '../chatContract'
import { AXIS, FONT, GRID, INK, INK_LABEL, MUTED, parseMetricNumber, SERIES } from './vizTheme'

const BASE_TEXT = { fontFamily: FONT }

// (a) rankedBar — 가로 랭크드 바. semantic_search(유사도) · skill/cert/concept 랭킹 · resume_gap이 전부 여기로 온다.
// 이 하나가 "의미 검색 결과를 방사형 네트워크로 강제"하던 오매핑을 대체한다: 관계가 아니라
// 유사도 내림차순 랭킹이므로 막대 길이=유사도(%), y축=공고명이 정직한 표현이다.
export function rankedBarOption(items: ToolResultItem[], opts?: { similarity?: boolean; gap?: boolean }): EChartsOption {
  const rows = items.map((i) => ({ name: i.name, v: i.pct ?? parseMetricNumber(i.metric) })).reverse() // 위→아래 내림차순
  const unit = opts?.similarity ? '% 유사' : '%'
  return {
    textStyle: BASE_TEXT,
    grid: { left: 10, right: 30, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: any) => `${p[0].name}: <b>${p[0].value}${unit}</b>`,
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: GRID } },
      axisLabel: { color: MUTED, fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: rows.map((r) => r.name),
      axisLine: { lineStyle: { color: AXIS } },
      axisTick: { show: false },
      axisLabel: { color: INK_LABEL, fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        barWidth: '54%',
        data: rows.map((r) => r.v),
        itemStyle: { color: opts?.gap ? '#8fb0e2' : INK, borderRadius: [0, 4, 4, 0] },
      },
    ],
  }
}

// (b) comparisonBar — 여러 기술 수요를 나란히 비교(compare kind). 항목마다 색을 구분해야
// "이건 비교다"가 한눈에 읽힌다(단색 바에 섞이면 랭킹으로 오독됨).
export function comparisonBarOption(items: ToolResultItem[]): EChartsOption {
  return {
    textStyle: BASE_TEXT,
    grid: { left: 10, right: 24, top: 14, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: any) => `${p[0].name}: <b>${p[0].value}%</b>`,
    },
    xAxis: {
      type: 'category',
      data: items.map((i) => i.name),
      axisLabel: { color: INK_LABEL, fontSize: 11, interval: 0, rotate: items.length > 4 ? 20 : 0 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: AXIS } },
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED, fontSize: 10 } },
    series: [
      {
        type: 'bar',
        barWidth: '46%',
        data: items.map((i, idx) => ({
          value: i.pct ?? parseMetricNumber(i.metric),
          itemStyle: { color: SERIES[idx % SERIES.length], borderRadius: [3, 3, 0, 0] },
        })),
      },
    ],
  }
}

// (c) regionBar — 지역별 공고 분포(region_distribution). rankedBar와 같은 모양이지만 색을
// 단색 액센트 대신 슬레이트 블루로 둬 "순위"보다 "분포"라는 결을 살짝 구분한다.
export function regionBarOption(items: ToolResultItem[]): EChartsOption {
  const rows = items.map((i) => ({ name: i.name, v: i.pct ?? parseMetricNumber(i.metric) })).reverse()
  return {
    textStyle: BASE_TEXT,
    grid: { left: 10, right: 30, top: 12, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}: <b>${p[0].value}%</b>` },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED, fontSize: 10 } },
    yAxis: {
      type: 'category',
      data: rows.map((r) => r.name),
      axisLine: { lineStyle: { color: AXIS } },
      axisTick: { show: false },
      axisLabel: { color: INK_LABEL, fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        barWidth: '58%',
        data: rows.map((r) => r.v),
        itemStyle: { color: '#8fb0e2', borderRadius: [0, 4, 4, 0] },
      },
    ],
  }
}

// (d) treemap — 구성비(파티션). region 토글 전용 — 지역은 공고당 1개라 상호배타 파티션이 성립한다.
// (기술 수요처럼 한 공고가 여러 항목에 걸치는 데이터는 파티션이 아니므로 treemap을 쓰지 않는다 — 정직성 규칙.)
export function treemapOption(items: ToolResultItem[]): EChartsOption {
  return {
    textStyle: BASE_TEXT,
    tooltip: { formatter: (p: any) => `${p.name}: <b>${p.value}</b> (${p.data.pct}%)` },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
        label: { show: true, color: '#fff', fontSize: 11, formatter: '{b}' },
        levels: [{ colorSaturation: [0.35, 0.6], itemStyle: { borderColor: '#fff' } }],
        data: items.map((i, idx) => ({
          name: i.name,
          value: i.pct ?? parseMetricNumber(i.metric),
          pct: i.pct ?? 0,
          itemStyle: { color: SERIES[idx % SERIES.length] },
        })),
      },
    ],
  }
}

// (e) line/area — 추세(trend kind). 현재 백엔드에 producer가 없어 계약만 존재하지만(§1의 "미래" 행),
// producer가 생기면 바로 연결되도록 구현해 둔다. VizChart.tsx의 line 케이스와 동일한 모양.
export function lineOption(points: { x: string; y: number }[]): EChartsOption {
  return {
    textStyle: BASE_TEXT,
    grid: { left: 6, right: 14, top: 16, bottom: 6, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((p) => p.x),
      axisLine: { lineStyle: { color: AXIS } },
      axisTick: { show: false },
      axisLabel: { color: MUTED, fontSize: 10 },
    },
    yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: MUTED, fontSize: 10 } },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: points.map((p) => p.y),
        lineStyle: { color: INK, width: 2.4 },
        itemStyle: { color: INK },
        areaStyle: { color: 'rgba(11,11,12,0.08)' },
      },
    ],
  }
}

// (f) gauge — bigStat의 echarts 대안(선택). 실제로는 CoverageRing(d3) 재사용을 권장하지만
// (a11y용 텍스트 병기가 이미 되어 있음) 스펙 스켈레톤을 그대로 남겨 둔다.
export function gaugeOption(pct: number, label: string): EChartsOption {
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        min: 0,
        max: 100,
        radius: '80%',
        pointer: { show: false },
        progress: { show: true, width: 12, itemStyle: { color: INK } },
        axisLine: { lineStyle: { width: 12, color: [[1, GRID]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { valueAnimation: true, formatter: `{value}%`, color: INK, fontSize: 22, offset: [0, 0] },
        title: { show: true, offset: [0, 24], color: MUTED, fontSize: 11 },
        data: [{ value: pct, name: label }],
      },
    ],
  }
}

// (g) scatter — 조건부/미래. 항목당 [x,y] 2축 데이터가 생겼을 때 쓴다. 지금은 어떤 intent도
// pct 하나 외에 두 번째 축을 안 준다 — producer 생기면 연결.
export function scatterOption(data: { name: string; x: number; y: number }[]): EChartsOption {
  return {
    textStyle: BASE_TEXT,
    grid: { left: 10, right: 20, top: 16, bottom: 24, containLabel: true },
    tooltip: { trigger: 'item', formatter: (p: any) => `${p.data.name}<br/>${p.value[0]} · ${p.value[1]}` },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } } },
    series: [
      {
        type: 'scatter',
        symbolSize: 12,
        data: data.map((d) => ({ name: d.name, value: [d.x, d.y] })),
        itemStyle: { color: '#8fb0e2' },
      },
    ],
  }
}

// (h) sankey — 조건부/미래. 방향성 bipartite 흐름(개념→기술 등) links가 생겼을 때 쓴다.
// cooccurrence는 대칭 관계라 부적합(현재 network/heatmap 토글이 이미 이 판단을 반영).
export function sankeyOption(nodes: { name: string }[], links: { source: string; target: string; value: number }[]): EChartsOption {
  return {
    textStyle: BASE_TEXT,
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'sankey',
        data: nodes,
        links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', opacity: 0.4 },
        itemStyle: { color: INK, borderColor: '#fff' },
        label: { color: INK_LABEL, fontSize: 10 },
      },
    ],
  }
}

export { parseMetricNumber }
