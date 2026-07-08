import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, tooltipStyle } from './base'
import raw from '../../data/pearl/l.json'

type Pt = { year: number; rank: number; stars: number }
type Line = { tech: string; points: Pt[]; owned: boolean }
type Event = { year: number; over: string; under: string; over_stars: number; under_stars: number }
const L = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { years: number[]; lines: Line[]; events: Event[] }
}

export default function WidgetL() {
  const { years, lines, events } = L.data
  const headline = events[events.length - 1] ?? events[0]

  const option = {
    animationDuration: 900, animationEasing: 'cubicOut',
    grid: { left: 34, right: 92, top: 20, bottom: 26 },
    tooltip: {
      ...tooltipStyle, trigger: 'axis',
      formatter: (ps: any[]) => {
        const y = years[ps[0].dataIndex]
        const rows = ps.filter((p) => p.value != null)
          .sort((a, b) => a.value - b.value)
          .map((p) => `<span style="color:${p.color}">●</span> ${p.seriesName} #${p.value}`)
        return `<b>${y}</b><br/>${rows.join('<br/>')}`
      },
    },
    xAxis: {
      type: 'category', data: years,
      axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false },
      axisLabel: { color: C.muted, fontFamily: MONO, fontSize: 10.5 },
    },
    yAxis: {
      type: 'value', inverse: true, min: 1, max: 12, interval: 1,
      axisLabel: { color: C.muted, fontFamily: FONT, fontSize: 11, formatter: '#{value}' },
      axisLine: { show: false }, splitLine: { lineStyle: { color: C.line2 } },
    },
    series: lines.map((l) => {
      const data = years.map((y) => {
        const p = l.points.find((pt) => pt.year === y)
        return p ? p.rank : null
      })
      const isOwned = l.owned
      return {
        name: l.tech, type: 'line', data, connectNulls: true,
        symbol: 'circle', symbolSize: isOwned ? 7 : 5,
        lineStyle: { width: isOwned ? 3 : 1.6, color: isOwned ? C.accent : undefined, opacity: isOwned ? 1 : 0.7 },
        itemStyle: isOwned ? { color: C.accent } : undefined,
        endLabel: {
          show: true, formatter: l.tech,
          color: isOwned ? C.accent700 : C.ink2, fontFamily: FONT,
          fontSize: 11, fontWeight: isOwned ? 800 : 600, distance: 8,
        },
        z: isOwned ? 5 : 2,
      }
    }),
  }

  return (
    <WidgetFrame
      tag="후보 L" title="15년 GitHub 연대기"
      headline={<><b>{headline.year}년</b>, <b style={{ color: C.accent }}>{headline.over}</b>가 <b>{headline.under}</b>를 추월했어요 — 15년간 프레임워크의 왕좌는 계속 바뀌었어요</>}
      note={L.sample_note} asOf={L.as_of} n={L.sample_size}
    >
      <ReactECharts option={option} style={{ height: 460 }} notMerge />
      <div className="wg-l__events">
        {events.map((e, i) => (
          <div key={i} className="wg-l__event">
            <span className="wg-l__eyear">{e.year}</span>
            <span><b>{e.over}</b>({e.over_stars.toLocaleString()}★)이 <b>{e.under}</b>({e.under_stars.toLocaleString()}★)를 추월</span>
          </div>
        ))}
      </div>
      <div className="wg-legend">
        <span><i style={{ background: C.accent }} /> 보유 기술</span>
        <span className="wg-legend__hint">순위 = 매핑된 {L.sample_size}개 저장소 중 그 해 스타 수 순위 · 낮을수록 인기</span>
      </div>
    </WidgetFrame>
  )
}
