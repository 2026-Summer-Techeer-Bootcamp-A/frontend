import ReactECharts from 'echarts-for-react'
import { WidgetFrame } from './Shell'
import { C, FONT, MONO, tooltipStyle, axisLabel } from './base'
import raw from '../../data/pearl/p.json'

type Month = { m: number; global_idx: number; domestic_idx: number; global_n: number; domestic_n: number }
const P = raw as unknown as {
  as_of: string; sample_size: number; sample_note: string
  data: { months: Month[] }
}

const DOMESTIC_COLOR = C.success

export default function WidgetP() {
  const months = P.data.months
  const peakDomestic = [...months].sort((a, b) => b.domestic_idx - a.domestic_idx)[0]
  const peakGlobal = [...months].sort((a, b) => b.global_idx - a.global_idx)[0]

  const option = {
    animationDuration: 700, animationEasing: 'cubicOut',
    grid: { left: 44, right: 20, top: 20, bottom: 30 },
    tooltip: {
      ...tooltipStyle, trigger: 'axis',
      formatter: (ps: any[]) => {
        const mo = months[ps[0].dataIndex]
        return `<b>${mo.m}월</b><br/>글로벌 지수 <b style="color:${C.accent}">${mo.global_idx}</b> (${mo.global_n.toLocaleString()}건)<br/>국내 지수 <b style="color:${DOMESTIC_COLOR}">${mo.domestic_idx}</b> (${mo.domestic_n.toLocaleString()}건)`
      },
    },
    legend: { show: false },
    xAxis: {
      type: 'category', data: months.map((m) => `${m.m}월`),
      axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false }, axisLabel,
    },
    yAxis: {
      type: 'value', name: '월평균 대비 지수', nameTextStyle: { color: C.muted, fontFamily: FONT, fontSize: 11 },
      axisLabel: { color: C.muted, fontFamily: MONO, fontSize: 10.5 },
      splitLine: { lineStyle: { color: C.line2 } }, axisLine: { show: false },
    },
    series: [
      {
        name: '글로벌', type: 'bar', data: months.map((m) => m.global_idx),
        itemStyle: { color: C.accent, borderRadius: [4, 4, 0, 0] }, barGap: '20%',
      },
      {
        name: '국내', type: 'bar', data: months.map((m) => m.domestic_idx),
        itemStyle: { color: DOMESTIC_COLOR, borderRadius: [4, 4, 0, 0] },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: C.ink, width: 1.3, type: 'dashed' },
          label: { formatter: '평균', color: C.muted, fontFamily: FONT, fontSize: 10.5, fontWeight: 700 },
          data: [{ yAxis: 1 }],
        },
      },
    ],
  }

  return (
    <WidgetFrame
      tag="후보 P" title="채용 시즌 — 지금이 그 달인가"
      headline={<>국내 채용은 <b style={{ color: DOMESTIC_COLOR }}>{peakDomestic.m}월</b>에 평균의 <b>{peakDomestic.domestic_idx}배</b>로 몰려요 — 가을 공채 시즌이에요</>}
      note={P.sample_note} asOf={P.as_of} n={P.sample_size}
    >
      <ReactECharts option={option} style={{ height: 340 }} notMerge />
      <div className="wg-legend">
        <span><i style={{ background: C.accent }} /> 글로벌 (피크 {peakGlobal.m}월 ×{peakGlobal.global_idx})</span>
        <span><i style={{ background: DOMESTIC_COLOR }} /> 국내 (피크 {peakDomestic.m}월 ×{peakDomestic.domestic_idx})</span>
        <span className="wg-legend__hint">지수 1.0 = 연중 월평균</span>
      </div>
    </WidgetFrame>
  )
}
