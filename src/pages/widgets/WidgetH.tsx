import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, RESUME, tooltipStyle } from './base'
import raw from '../../data/pearl/h.json'

type Item = { tech: string; open_rate: number; postings: number; newcomer_n: number }
const H = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { items: Item[] }
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export default function WidgetH() {
  const items = H.data.items
  const owned = (t: string) => RESUME.includes(t)

  const { medX, medY, labelSet } = useMemo(() => {
    const medX = median(items.map((i) => i.postings))
    const medY = median(items.map((i) => i.open_rate))
    const byOpen = [...items].sort((a, b) => b.open_rate - a.open_rate)
    const labelSet = new Set<string>([
      ...items.filter((i) => owned(i.tech)).map((i) => i.tech),
      ...byOpen.slice(0, 3).map((i) => i.tech),
      ...byOpen.slice(-3).map((i) => i.tech),
    ])
    return { medX, medY, labelSet }
  }, [])

  const option = {
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 50, right: 24, top: 22, bottom: 44 },
    tooltip: {
      ...tooltipStyle,
      formatter: (p: any) => {
        const it = p.data.it as Item
        return `<b>${it.tech}</b>${owned(it.tech) ? ` <span style="color:${C.accent}">· 보유</span>` : ''}<br/>
          신입 개방율 <b>${it.open_rate}%</b><br/>전체 ${it.postings.toLocaleString()}건 · 신입가능 ${it.newcomer_n}건`
      },
    },
    xAxis: {
      type: 'log', name: '전체 수요 (공고 수, 로그)', nameLocation: 'middle', nameGap: 28,
      nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11, fontWeight: 600 },
      min: 40, max: 1200,
      axisLabel: { color: C.muted, fontFamily: MONO, fontSize: 10.5, formatter: (v: number) => v.toLocaleString() },
      axisLine: { lineStyle: { color: C.line } }, splitLine: { lineStyle: { color: C.line2 } },
    },
    yAxis: {
      type: 'value', name: '신입 개방율', min: 0, max: Math.max(...items.map((i) => i.open_rate)) + 5,
      nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11, fontWeight: 600, align: 'right' },
      axisLabel: { color: C.muted, fontFamily: FONT, fontSize: 11, formatter: '{value}%' },
      axisLine: { show: false }, splitLine: { lineStyle: { color: C.line2 } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (_v: any, p: any) => 9 + Math.sqrt(p.data.it.postings) / 6,
        data: items.map((it) => ({
          value: [it.postings, it.open_rate], it,
          itemStyle: {
            color: owned(it.tech) ? C.accent : it.open_rate >= medY ? C.goldSoft : C.neutral300,
            borderColor: '#fff', borderWidth: 1.5,
            opacity: 0.92,
          },
          label: labelSet.has(it.tech)
            ? { show: true, position: 'top', distance: 5, formatter: it.tech, color: C.ink2, fontFamily: FONT, fontSize: 10.5, fontWeight: 700 }
            : { show: false },
        })),
        markLine: {
          silent: true, symbol: 'none',
          label: { show: false },
          lineStyle: { color: C.neutral300, width: 1, type: 'dashed' },
          data: [{ xAxis: medX }, { yAxis: medY }],
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 H" title="신입의 문"
      headline={<>어떤 기술은 <b style={{ color: C.gold }}>문이 넓고</b>, 어떤 기술은 <b style={{ color: C.danger }}>경력의 성</b>이에요</>}
      note={H.sample_note} asOf={H.as_of} n={H.sample_size}
    >
      <div className="wg-h">
        <ReactECharts option={option} style={{ height: 400 }} notMerge />
        <div className="wg-h__quads">
          <span className="q tl">↖ 좁지만 열림</span>
          <span className="q tr">넓은 문 ↗</span>
          <span className="q bl">↙ 관심 밖</span>
          <span className="q br">경력의 성 ↘</span>
        </div>
      </div>
      <div className="wg-legend">
        <span><i style={{ background: C.accent }} /> 보유 기술</span>
        <span><i style={{ background: C.goldSoft }} /> 개방율 중앙값 이상</span>
        <span><i style={{ background: C.neutral300 }} /> 그 아래</span>
        <span className="wg-legend__hint">점 크기 = 전체 공고 수</span>
      </div>
    </WidgetFrame>
  )
}
